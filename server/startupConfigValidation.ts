import { spawn } from "node:child_process";
import { resolveProjectPath } from "./paths";

export function validateStartupConfig(): Promise<void> {
  return new Promise((resolve, reject) => {
    const validator = spawn(process.execPath, [resolveProjectPath("scripts/validateConfig.mjs")], {
      cwd: resolveProjectPath(),
      stdio: "inherit",
    });

    validator.on("error", reject);
    validator.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error("Configuration validation failed."));
    });
  });
}
