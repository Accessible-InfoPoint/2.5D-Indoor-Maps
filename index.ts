import { createApp } from "./server/app";
import { createPatternFillImages } from "./server/createPatternFillImages";
import { getOverpassData } from "./server/getOverpassData";
import { validateStartupConfig } from "./server/startupConfigValidation";

const port = Number(process.env.PORT ?? 3000);

async function startServer(): Promise<void> {
  await validateStartupConfig();
  await createPatternFillImages();
  await getOverpassData();

  console.log("=== Starting web server ===");
  const app = createApp();
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

startServer().catch((reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  console.error("### Error ###\n" + message);
  process.exitCode = 1;
});
