import { OverpassDownloadError, previewResponse } from "./overpassErrors";
import { saveOverpassJsonAndSaveFile } from "./saveOverpassJsonAndSaveFile";

interface DownloadResourceOptions {
  headers?: Record<string, string>;
  maxRateLimitRetries?: number;
  resourceLabel?: string;
}

const DEFAULT_RATE_LIMIT_DELAY_MS = 10_000;

export async function downloadResource(
  url: string,
  dest: string,
  options: DownloadResourceOptions = {},
): Promise<void> {
  console.log("Downloading " + url);

  const maxRateLimitRetries = options.maxRateLimitRetries ?? 0;

  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, { headers: options.headers });
    } catch (error) {
      throw new OverpassDownloadError({
        dest,
        resourceLabel: options.resourceLabel,
        url,
        cause: error,
      });
    }

    if (response.status === 429 && attempt < maxRateLimitRetries) {
      const retryDelay = getRetryDelay(response.headers.get("retry-after"), attempt);
      console.warn(
        `Request was rate limited (HTTP 429). Retrying in ${Math.ceil(retryDelay / 1000)} seconds...`,
      );
      await wait(retryDelay);
      continue;
    }

    if (!response.ok) {
      const responseText = await response.text();
      throw new OverpassDownloadError({
        dest,
        resourceLabel: options.resourceLabel,
        url,
        status: response.status,
        statusText: response.statusText,
        responsePreview: previewResponse(responseText),
      });
    }

    await saveOverpassJsonAndSaveFile(await response.text(), dest, {
      resourceLabel: options.resourceLabel,
      url,
    });
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

  return DEFAULT_RATE_LIMIT_DELAY_MS * 2 ** attempt;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
