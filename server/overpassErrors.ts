const RESPONSE_PREVIEW_LENGTH = 500;

interface OverpassErrorDetails {
  resourceLabel?: string;
  url?: string;
  dest: string;
  responsePreview?: string;
  cause?: unknown;
}

interface OverpassDownloadErrorDetails extends OverpassErrorDetails {
  status?: number;
  statusText?: string;
}

export class OverpassDownloadError extends Error {
  readonly code = "overpass_download_failed";
  readonly resourceLabel?: string;
  readonly url?: string;
  readonly dest: string;
  readonly status?: number;
  readonly statusText?: string;
  readonly responsePreview?: string;

  constructor(details: OverpassDownloadErrorDetails) {
    super(formatOverpassDownloadError(details));
    this.name = "OverpassDownloadError";
    this.resourceLabel = details.resourceLabel;
    this.url = details.url;
    this.dest = details.dest;
    this.status = details.status;
    this.statusText = details.statusText;
    this.responsePreview = details.responsePreview;
    this.cause = details.cause;
  }
}

export class OverpassTransformError extends Error {
  readonly code = "overpass_transform_failed";
  readonly resourceLabel?: string;
  readonly url?: string;
  readonly dest: string;
  readonly responsePreview?: string;

  constructor(details: OverpassErrorDetails) {
    super(formatOverpassTransformError(details));
    this.name = "OverpassTransformError";
    this.resourceLabel = details.resourceLabel;
    this.url = details.url;
    this.dest = details.dest;
    this.responsePreview = details.responsePreview;
    this.cause = details.cause;
  }
}

export function previewResponse(responseText: string): string {
  return responseText.replace(/\s+/g, " ").trim().slice(0, RESPONSE_PREVIEW_LENGTH);
}

function formatOverpassDownloadError(details: OverpassDownloadErrorDetails): string {
  const lines = [
    `Failed to download Overpass resource${formatResourceLabel(details.resourceLabel)}.`,
    `Destination: ${details.dest}`,
  ];

  if (details.url !== undefined) {
    lines.push(`URL: ${details.url}`);
  }

  if (details.status !== undefined) {
    lines.push(`HTTP status: ${details.status} ${details.statusText ?? ""}`.trim());
  }

  if (details.responsePreview) {
    lines.push(`Response preview: ${details.responsePreview}`);
  }

  lines.push("Hint: Try again later, or set SKIP_OVERPASS_DOWNLOAD=true to use cached data.");

  return lines.join("\n");
}

function formatOverpassTransformError(details: OverpassErrorDetails): string {
  const lines = [
    `Failed to convert Overpass response to GeoJSON${formatResourceLabel(details.resourceLabel)}.`,
    `Destination: ${details.dest}`,
  ];

  if (details.url !== undefined) {
    lines.push(`URL: ${details.url}`);
  }

  if (details.cause instanceof Error) {
    lines.push(`Cause: ${details.cause.message}`);
  }

  if (details.responsePreview) {
    lines.push(`Response preview: ${details.responsePreview}`);
  }

  lines.push("Hint: Overpass may have returned invalid JSON or data the converter cannot handle.");

  return lines.join("\n");
}

function formatResourceLabel(resourceLabel: string | undefined): string {
  return resourceLabel === undefined ? "" : `: ${resourceLabel}`;
}
