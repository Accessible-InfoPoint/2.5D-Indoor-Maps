import { promises as fs, existsSync } from "node:fs";
import path from "node:path";
import osmToGeoJson from "osmtogeojson";
import { resolveProjectPath } from "./paths";

export async function transformToGeoJsonAndSaveFile(responseText: string, dest: string): Promise<void> {
  const outputPath = resolveProjectPath(dest);
  console.log("saving transformed GeoJSON data to " + dest);

  if (existsSync(outputPath)) {
    console.log("File already exists: " + dest + ", overwriting...");
  }

  const osmData = JSON.parse(responseText);
  const transformedData = JSON.stringify(osmToGeoJson(osmData));

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, transformedData);
}
