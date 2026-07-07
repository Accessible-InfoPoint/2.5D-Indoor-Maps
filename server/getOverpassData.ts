import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import {
  MAX_OVERPASS_FILE_AGE_IN_DAYS,
  MAX_OVERPASS_RATE_LIMIT_RETRIES,
  OVERPASS_USER_AGENT,
  RESOURCES_TO_DOWNLOAD,
} from "./constants";
import { downloadResource } from "./downloadResource";
import { resolveProjectPath } from "./paths";

type DownloadCache = Record<string, number>;

const cachePath = resolveProjectPath("tmp", "overpass-cache.json");

export async function getOverpassData(): Promise<void> {
  if (process.env.SKIP_OVERPASS_DOWNLOAD === "true") {
    console.log("=== Skipping Overpass data download ===");
    return;
  }

  console.log("=== Downloading Overpass data ===");

  const cache = await readDownloadCache();
  for (const resource of RESOURCES_TO_DOWNLOAD) {
    const outputPath = resolveProjectPath(resource.dest);
    if (existsSync(outputPath) && !(await needToReDownloadFile(resource.dest, cache))) {
      cache[resource.dest] ??= (await fs.stat(outputPath)).mtimeMs;
      continue;
    }

    await downloadResource(resource.url, resource.dest, {
      headers: {
        "User-Agent": OVERPASS_USER_AGENT,
      },
      maxRateLimitRetries: MAX_OVERPASS_RATE_LIMIT_RETRIES,
    });
    cache[resource.dest] = Date.now();
  }
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
