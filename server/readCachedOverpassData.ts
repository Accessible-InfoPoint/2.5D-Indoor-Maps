import fs from "node:fs/promises";
import { isOverpassJson, OverpassJson } from "../src/indoor";
import { resolveProjectPath } from "./paths";

export async function readCachedOverpassJson(cachePath: string): Promise<OverpassJson> {
  const data = await readCachedJson(cachePath);

  if (isOverpassJson(data)) {
    return data;
  }

  throw new Error(`Cached data at "${cachePath}" is not raw Overpass JSON.`);
}

async function readCachedJson(cachePath: string): Promise<unknown> {
  const data = await fs.readFile(resolveProjectPath(cachePath), "utf8");

  return JSON.parse(data) as unknown;
}
