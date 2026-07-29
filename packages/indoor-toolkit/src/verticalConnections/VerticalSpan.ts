export interface VerticalSpan {
  from: number;
  to: number;
}

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

export function getVerticalSpanKey(span: VerticalSpan): string {
  return `${span.from}-${span.to}`;
}

export function shiftVerticalSpan(span: VerticalSpan, offset: number): VerticalSpan {
  return {
    from: span.from + offset,
    to: span.to + offset,
  };
}

export function isLevelOnVerticalSpanBoundary(level: number, span: VerticalSpan): boolean {
  return level == span.from || level == span.to;
}
