export function parsePositiveMeters(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = parseFloat(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
