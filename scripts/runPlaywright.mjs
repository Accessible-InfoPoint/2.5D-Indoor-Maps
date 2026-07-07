import { spawn, spawnSync } from "node:child_process";
import { request } from "node:http";
import { join } from "node:path";

const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;
const serverEntry = join("dist", "server", "index.js");
const playwrightCli = join("node_modules", "@playwright", "test", "cli.js");

const server = spawn(process.execPath, [serverEntry], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    SKIP_OVERPASS_DOWNLOAD: "true",
  },
  stdio: "inherit",
});

try {
  await waitForServer(baseURL, server);
  const exitCode = await runPlaywright(process.argv.slice(2));
  process.exitCode = exitCode;
} finally {
  await stopServer(server);
}

function runPlaywright(args) {
  const playwright = spawn(process.execPath, [playwrightCli, "test", ...args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  return waitForExit(playwright).then((exitCode) => exitCode ?? 1);
}

async function waitForServer(url, childProcess) {
  const startedAt = Date.now();
  const timeoutMs = 120_000;

  while (Date.now() - startedAt < timeoutMs) {
    if (childProcess.exitCode !== null) {
      throw new Error(`Server exited before Playwright could connect. Exit code: ${childProcess.exitCode}`);
    }

    if (await canConnect(url)) {
      return;
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function canConnect(url) {
  return new Promise((resolve) => {
    const req = request(url, { method: "HEAD", timeout: 1_000 }, (res) => {
      res.resume();
      resolve(true);
    });

    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function stopServer(childProcess) {
  if (childProcess.exitCode !== null || childProcess.pid === undefined) {
    return;
  }

  childProcess.kill();

  const exitCode = await Promise.race([
    waitForExit(childProcess),
    delay(2_000).then(() => undefined),
  ]);

  if (exitCode !== undefined || childProcess.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(childProcess.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    childProcess.kill("SIGKILL");
  }
}

function waitForExit(childProcess) {
  return new Promise((resolve) => {
    childProcess.once("exit", (code) => resolve(code));
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
