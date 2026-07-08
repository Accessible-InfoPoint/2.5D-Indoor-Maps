import { createApp } from "./server/app";
import { createPatternFillImages } from "./server/createPatternFillImages";
import { getOverpassData } from "./server/getOverpassData";

const port = Number(process.env.PORT ?? 3000);

async function startServer(): Promise<void> {
  await createPatternFillImages();
  await getOverpassData();

  console.log("=== Starting web server ===");
  const app = createApp();
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

startServer().catch((reason: unknown) => {
  console.error("### Error: " + reason + " ###");
  process.exitCode = 1;
});
