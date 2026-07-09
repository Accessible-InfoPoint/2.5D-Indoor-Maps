import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { CURRENT_BUILDING } from "../public/strings/settings.json";
import {
  getCachedOverpassPathsForBuilding,
  getOverpassResourcesForBuilding,
  OverpassResource,
} from "./buildingSources";
import {
  MAX_OVERPASS_FILE_AGE_IN_DAYS,
  MAX_OVERPASS_RATE_LIMIT_RETRIES,
  OVERPASS_USER_AGENT,
} from "./constants";
import { downloadResource } from "./downloadResource";
import { resolveProjectPath } from "./paths";
import { validateCachedOverpassDataForBuilding } from "./validateOverpassSourceData";

interface DownloadCacheEntry {
  downloadedAt: number;
  queryHash?: string;
}

type DownloadCache = Record<string, number | DownloadCacheEntry>;

const cachePath = resolveProjectPath("tmp", "overpass-cache.json");

export async function getOverpassData(): Promise<void> {
  if (process.env.SKIP_OVERPASS_DOWNLOAD === "true") {
    console.log("=== Skipping Overpass data download ===");
    return;
  }

  console.log("=== Downloading Overpass data ===");

  const cache = await readDownloadCache();
  const resources = getOverpassResourcesForBuilding(CURRENT_BUILDING);
  for (const resource of resources) {
    const outputPath = resolveProjectPath(resource.dest);
    if (existsSync(outputPath) && !(await needToReDownloadFile(resource, cache))) {
      cache[resource.dest] ??= {
        downloadedAt: (await fs.stat(outputPath)).mtimeMs,
        queryHash: resource.queryHash,
      };
      continue;
    }

    await downloadResource(resource.url, resource.dest, {
      headers: {
        "User-Agent": OVERPASS_USER_AGENT,
      },
      maxRateLimitRetries: MAX_OVERPASS_RATE_LIMIT_RETRIES,
      resourceLabel: resource.label,
    });
    cache[resource.dest] = {
      downloadedAt: Date.now(),
      queryHash: resource.queryHash,
    };
  }
  await writeDownloadCache(cache);

  const paths = getCachedOverpassPathsForBuilding(CURRENT_BUILDING);
  await validateCachedOverpassDataForBuilding(CURRENT_BUILDING, paths);
}

async function needToReDownloadFile(
  resource: OverpassResource,
  cache: DownloadCache,
): Promise<boolean> {
  const cacheEntry = normalizeCacheEntry(cache[resource.dest]);
  if (cacheEntry?.queryHash !== undefined && cacheEntry.queryHash !== resource.queryHash) {
    return true;
  }

  const lastDownloadDate = cacheEntry?.downloadedAt ?? (await getFileModifiedTime(resource.dest));
  if (lastDownloadDate === undefined) {
    return true;
  }

  const fileAge = Date.now() - lastDownloadDate;
  const fileAgeInDays = Math.floor(fileAge / 1000 / 60 / 60 / 24);

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

function normalizeCacheEntry(
  entry: number | DownloadCacheEntry | undefined,
): DownloadCacheEntry | undefined {
  if (typeof entry === "number") {
    return {
      downloadedAt: entry,
    };
  }

  return entry;
}
