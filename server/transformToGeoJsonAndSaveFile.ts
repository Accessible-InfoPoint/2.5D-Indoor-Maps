import { promises as fs, existsSync } from "node:fs";
import path from "node:path";
import { OverpassTransformError, previewResponse } from "./overpassErrors";
import { resolveProjectPath } from "./paths";

interface TransformToGeoJsonOptions {
  resourceLabel?: string;
  url?: string;
}

export async function transformToGeoJsonAndSaveFile(
  responseText: string,
  dest: string,
  options: TransformToGeoJsonOptions = {},
): Promise<void> {
  const outputPath = resolveProjectPath(dest);
  console.log("saving transformed GeoJSON data to " + dest);

  if (existsSync(outputPath)) {
    console.log("File already exists: " + dest + ", overwriting...");
  }

  try {
    const osmData = JSON.parse(responseText);
    const { default: osm2geojson } = await import("osm2geojson-ultra");
    const geoJson = osm2geojson(osmData);

    if (geoJson?.type !== "FeatureCollection") {
      throw new Error("OSM conversion did not produce a GeoJSON FeatureCollection.");
    }

    const transformedData = JSON.stringify(geoJson);

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, transformedData);
  } catch (error) {
    if (error instanceof OverpassTransformError) {
      throw error;
    }

    throw new OverpassTransformError({
      dest,
      resourceLabel: options.resourceLabel,
      url: options.url,
      responsePreview: previewResponse(responseText),
      cause: error,
    });
  }
}
