import { transformToGeoJsonAndSaveFile } from "./transformToGeoJsonAndSaveFile";

interface DownloadResourceOptions {
  headers?: Record<string, string>;
  maxRateLimitRetries?: number;
}

const DEFAULT_RATE_LIMIT_DELAY_MS = 10_000;

export async function downloadResource(
  url: string,
  dest: string,
  options: DownloadResourceOptions = {}
): Promise<void> {
  console.log("Downloading " + url);

  const maxRateLimitRetries = options.maxRateLimitRetries ?? 0;

  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { headers: options.headers });

    if (response.status === 429 && attempt < maxRateLimitRetries) {
      const retryDelay = getRetryDelay(response.headers.get("retry-after"), attempt);
      console.warn(
        `Request was rate limited (HTTP 429). Retrying in ${Math.ceil(retryDelay / 1000)} seconds...`
      );
      await wait(retryDelay);
      continue;
    }

    if (!response.ok) {
      const rateLimitMessage = response.status === 429
        ? " The rate limit was reached; try again later."
        : "";
      throw new Error(
        `File could not be downloaded! (${response.status} - ${response.statusText}).${rateLimitMessage}`
      );
    }

    await transformToGeoJsonAndSaveFile(await response.text(), dest);
    return;
  }
}

function getRetryDelay(retryAfter: string | null, attempt: number): number {
  if (retryAfter !== null) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }

    const retryDate = Date.parse(retryAfter);
    if (!Number.isNaN(retryDate)) {
      return Math.max(0, retryDate - Date.now());
    }
  }

  return DEFAULT_RATE_LIMIT_DELAY_MS * (2 ** attempt);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
