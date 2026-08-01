/**
 * Parse a positive meter value from an OSM tag.
 *
 * Returns `undefined` for missing, non-finite, zero, or negative values. Unit
 * suffixes are tolerated only as far as JavaScript `parseFloat` can read the
 * leading number.
 */
export function parsePositiveMeters(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = parseFloat(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
