import type { IndoorDiagnostic } from "../diagnostics";
import type { IndoorElementRef } from "../models/indoorElementRef";
import type { OverpassElement } from "../models/overpassJson";
import { extractLevels } from "../utils/extractLevels";

/** Numeric vertical interval between two indoor levels. */
export interface VerticalSpan {
  /** Lower numeric level after normalization. */
  from: number;
  /** Higher numeric level after normalization. */
  to: number;
}

/**
 * Context used to attach vertical span parsing diagnostics to a source element or tag.
 */
export interface ParseVerticalSpanOptions {
  /** Non-existent levels that should not be treated as gaps in semicolon span syntax. */
  nonExistentLevels?: number[];
  /** Diagnostic collector compatible with `IndoorDiagnostics`. */
  diagnostics?: {
    warn: (diagnostic: Omit<IndoorDiagnostic, "severity">) => void;
    error: (diagnostic: Omit<IndoorDiagnostic, "severity">) => void;
  };
  /** Parsed element reference associated with the span value. */
  elementRef?: IndoorElementRef;
  /** Raw OSM element associated with the span value. */
  sourceElement?: OverpassElement;
  /** Tag name used in diagnostic messages, for example `level`. */
  tagName?: string;
}

/**
 * Parse stair pathway `level=*` syntax into a normalized vertical span.
 *
 * Supports `from-to` ranges and semicolon-separated level lists when they do
 * not skip existing levels. For example, `1;2;3` becomes `{from: 1, to: 3}`.
 * If level `2` is configured as non-existent, `1;3` is also accepted.
 */
export function parseVerticalSpan(
  value: string | undefined,
  options: ParseVerticalSpanOptions = {},
): VerticalSpan | undefined {
  if (value === undefined) {
    return undefined;
  }

  const match = /^\s*(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\s*$/.exec(value);

  if (match === null) {
    return value.includes(";") ? parseSemicolonSpan(value, options) : undefined;
  }

  const from = parseFloat(match[1]);
  const to = parseFloat(match[2]);

  if (!Number.isFinite(from) || !Number.isFinite(to) || from == to) {
    return undefined;
  }

  return from < to ? { from, to } : { from: to, to: from };
}

function parseSemicolonSpan(
  value: string,
  options: ParseVerticalSpanOptions,
): VerticalSpan | undefined {
  const levels = extractLevels(value, {
    diagnostics: options.diagnostics,
    elementRef: options.elementRef,
    sourceElement: options.sourceElement,
    tagName: options.tagName,
  });

  if (levels.length < 2) {
    return undefined;
  }

  const from = Math.min(...levels);
  const to = Math.max(...levels);

  if (from == to || !Number.isFinite(from) || !Number.isFinite(to)) {
    return undefined;
  }

  const missingExistingLevels = getMissingExistingLevels(
    levels,
    from,
    to,
    options.nonExistentLevels ?? [],
  );

  if (missingExistingLevels.length > 0) {
    options.diagnostics?.error({
      code: "VerticalSpan.discontinuous-level-list",
      message:
        `Cannot parse ${options.tagName ?? "level"} value "${value}" as a vertical span: ` +
        `missing existing intermediate level(s) ${missingExistingLevels.join(", ")}.`,
      elementRef: options.elementRef,
      sourceElement: options.sourceElement,
    });
    return undefined;
  }

  return { from, to };
}

function getMissingExistingLevels(
  levels: number[],
  from: number,
  to: number,
  nonExistentLevels: number[],
): number[] {
  const authoredLevels = new Set(levels);
  const skippedLevels = new Set(nonExistentLevels);
  const missingLevels: number[] = [];

  for (let level = Math.ceil(from); level <= Math.floor(to); level++) {
    if (!authoredLevels.has(level) && !skippedLevels.has(level)) {
      missingLevels.push(level);
    }
  }

  return missingLevels;
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
