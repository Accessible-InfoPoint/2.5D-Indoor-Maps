import express from "express";
import { createPatternFillImages } from "./server/createPatternFillImages";
import { getOverpassData } from "./server/getOverpassData";
import { resolveProjectPath } from "./server/paths";

const app = express();
const port = Number(process.env.PORT ?? 3000);

async function startServer(): Promise<void> {
  await createPatternFillImages();
  await getOverpassData();

  console.log("=== Starting web server ===");
  app.use(express.static(resolveProjectPath("public")));
  app.use(express.json());
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

startServer().catch((reason: unknown) => {
  console.error("### Error: " + reason + " ###");
  process.exitCode = 1;
});
