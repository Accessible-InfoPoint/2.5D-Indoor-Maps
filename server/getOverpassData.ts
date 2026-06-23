import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import {
  MAX_OVERPASS_FILE_AGE_IN_DAYS,
  RESOURCES_TO_DOWNLOAD,
} from "./constants";
import { downloadResource } from "./downloadResource";
import { resolveProjectPath } from "./paths";

type DownloadCache = Record<string, number>;

const cachePath = resolveProjectPath("tmp", "overpass-cache.json");

export async function getOverpassData(): Promise<void> {
  console.log("=== Downloading Overpass data ===");

  const cache = await readDownloadCache();
  await Promise.all(
    RESOURCES_TO_DOWNLOAD.map(async (resource) => {
      const outputPath = resolveProjectPath(resource.dest);
      if (existsSync(outputPath) && !(await needToReDownloadFile(resource.dest, cache))) {
        cache[resource.dest] ??= (await fs.stat(outputPath)).mtimeMs;
        return;
      }

      await downloadResource(resource.url, resource.dest);
      cache[resource.dest] = Date.now();
    })
  );
  await writeDownloadCache(cache);
}

async function needToReDownloadFile(dest: string, cache: DownloadCache): Promise<boolean> {
  const lastDownloadDate = cache[dest] ?? await getFileModifiedTime(dest);
  if (lastDownloadDate === undefined) {
    return true;
  }

  const fileAge = Date.now() - lastDownloadDate;
  const fileAgeInDays = Math.floor((((fileAge / 1000) / 60) / 60) / 24);

  return fileAgeInDays >= MAX_OVERPASS_FILE_AGE_IN_DAYS;
}

async function getFileModifiedTime(dest: string): Promise<number | undefined> {
  try {
    return (await fs.stat(resolveProjectPath(dest))).mtimeMs;
  } catch {
    return undefined;
  }
}

async function readDownloadCache(): Promise<DownloadCache> {
  try {
    return JSON.parse(await fs.readFile(cachePath, "utf8"));
  } catch {
    return {};
  }
}

async function writeDownloadCache(cache: DownloadCache): Promise<void> {
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(cache, null, 2));
}
