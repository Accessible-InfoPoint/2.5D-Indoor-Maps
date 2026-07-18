import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { isOverpassJson } from "../src/utils/overpassJsonHelpers";
import { OverpassCacheWriteError, previewResponse } from "./overpassErrors";
import { resolveProjectPath } from "./paths";

interface SaveOverpassJsonOptions {
  resourceLabel?: string;
  url?: string;
}

export async function saveOverpassJsonAndSaveFile(
  responseText: string,
  dest: string,
  options: SaveOverpassJsonOptions = {},
): Promise<void> {
  const outputPath = resolveProjectPath(dest);
  console.log("saving raw Overpass data to " + dest);

  if (existsSync(outputPath)) {
    console.log("File already exists: " + dest + ", overwriting...");
  }

  try {
    const overpassData = JSON.parse(responseText) as unknown;

    if (!isOverpassJson(overpassData)) {
      throw new Error("Response did not contain raw Overpass JSON.");
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(overpassData));
  } catch (error) {
    if (error instanceof OverpassCacheWriteError) {
      throw error;
    }

    throw new OverpassCacheWriteError({
      dest,
      resourceLabel: options.resourceLabel,
      url: options.url,
      responsePreview: previewResponse(responseText),
      cause: error,
    });
  }
}
