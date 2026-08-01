/** Numeric vertical interval between two indoor levels. */
export interface VerticalSpan {
  /** Lower numeric level after normalization. */
  from: number;
  /** Higher numeric level after normalization. */
  to: number;
}

/**
 * Parse `level=from-to` syntax into a normalized vertical span.
 *
 * Returns `undefined` for missing values, non-span syntax, equal endpoints, or
 * non-finite numbers. Inverted spans such as `2-1` are normalized to `{from: 1,
 * to: 2}`.
 */
export function parseVerticalSpan(value: string | undefined): VerticalSpan | undefined {
  if (value === undefined) {
    return undefined;
  }

  const match = /^\s*(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\s*$/.exec(value);

  if (match === null) {
    return undefined;
  }

  const from = parseFloat(match[1]);
  const to = parseFloat(match[2]);

  if (!Number.isFinite(from) || !Number.isFinite(to) || from == to) {
    return undefined;
  }

  return from < to ? { from, to } : { from: to, to: from };
}

/** Return a stable string key such as `0-1` for a vertical span. */
export function getVerticalSpanKey(span: VerticalSpan): string {
  return `${span.from}-${span.to}`;
}

/** Shift both span boundaries by a repeat offset. */
export function shiftVerticalSpan(span: VerticalSpan, offset: number): VerticalSpan {
  return {
    from: span.from + offset,
    to: span.to + offset,
  };
}

/** Return whether `level` is exactly one of the span boundaries. */
export function isLevelOnVerticalSpanBoundary(level: number, span: VerticalSpan): boolean {
  return level == span.from || level == span.to;
}
