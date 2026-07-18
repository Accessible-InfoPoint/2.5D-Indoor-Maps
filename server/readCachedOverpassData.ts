import fs from "node:fs/promises";
import { OverpassJson } from "../src/models/overpassJson";
import { isOverpassJson } from "../src/utils/overpassJsonHelpers";
import { overpassToGeoJson } from "../src/utils/overpassToGeoJson";
import { resolveProjectPath } from "./paths";

export async function readCachedOverpassJson(cachePath: string): Promise<OverpassJson> {
  const data = await readCachedJson(cachePath);

  if (isOverpassJson(data)) {
    return data;
  }

  throw new Error(`Cached data at "${cachePath}" is not raw Overpass JSON.`);
}

export async function readCachedGeoJsonCompat(
  cachePath: string,
): Promise<GeoJSON.FeatureCollection> {
  const data = await readCachedJson(cachePath);

  if (isGeoJsonFeatureCollection(data)) {
    return data;
  }

  if (isOverpassJson(data)) {
    return overpassToGeoJson(data);
  }

  throw new Error(`Cached data at "${cachePath}" is neither GeoJSON nor raw Overpass JSON.`);
}

async function readCachedJson(cachePath: string): Promise<unknown> {
  const data = await fs.readFile(resolveProjectPath(cachePath), "utf8");

  return JSON.parse(data) as unknown;
}

function isGeoJsonFeatureCollection(value: unknown): value is GeoJSON.FeatureCollection {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "FeatureCollection" &&
    Array.isArray((value as { features?: unknown }).features)
  );
}
