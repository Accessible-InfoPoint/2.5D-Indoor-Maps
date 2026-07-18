import { createApp } from "./server/app";
import { createPatternFillImages } from "./server/createPatternFillImages";
import { getOverpassData } from "./server/getOverpassData";
import { registerGracefulShutdown } from "./server/gracefulShutdown";
import { resolveProjectPath } from "./server/paths";
import { logStartupSummary } from "./server/startupSummary";
import { validateStartupConfig } from "./server/startupConfigValidation";

const port = Number(process.env.PORT ?? 3000);
const staticRoot = resolveProjectPath("public");

async function startServer(): Promise<void> {
  await validateStartupConfig();
  await createPatternFillImages();
  await getOverpassData();

  console.log("=== Starting web server ===");
  const app = createApp({ staticRoot });
  const server = app.listen(port, () => {
    logStartupSummary({ port, staticRoot });
  });
  registerGracefulShutdown(server);
}

startServer().catch((reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  console.error("### Error ###\n" + message);
  process.exitCode = 1;
});
