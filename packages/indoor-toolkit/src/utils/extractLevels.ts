import { arrayRange } from "./arrayRange";
import type { IndoorDiagnostic } from "../diagnostics";
import type { IndoorElementRef } from "../models/indoorElementRef";
import type { OverpassElement } from "../models/overpassJson";

export type LevelValue = string | number | Array<string | number> | null | undefined;

export interface ExtractLevelsOptions {
  diagnostics?: {
    warn: (diagnostic: Omit<IndoorDiagnostic, "severity">) => void;
    error: (diagnostic: Omit<IndoorDiagnostic, "severity">) => void;
  };
  elementRef?: IndoorElementRef;
  sourceElement?: OverpassElement;
  tagName?: string;
}

export function extractLevels(level: LevelValue, options: ExtractLevelsOptions = {}): number[] {
  return deduplicateLevels(extractLevelsWithDuplicates(level, options), level, options);
}

function extractLevelsWithDuplicates(level: LevelValue, options: ExtractLevelsOptions): number[] {
  if (level == null) return [];

  if (typeof level == "number") return [level];

  if (Array.isArray(level))
    return level.flatMap((val) => extractLevelsWithDuplicates(val, options));

  level = level.trim();

  if (level == "") return [];

  if (level.includes(",")) {
    reportExtractLevelsError(
      options,
      "comma-separated-levels",
      `Cannot parse ${getTagLabel(options)} value "${level}": commas are ambiguous because they can mean either decimal separators or list separators. Use decimal points and semicolons instead.`,
    );
    return [];
  }

  const regExRange = /^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/;
  let finalArray: number[] = [];

  if (level.includes(";")) {
    finalArray = level.split(";").flatMap((val) => extractLevelsWithDuplicates(val, options));
  } else if (regExRange.test(level)) {
    const matches = regExRange.exec(level);
    if (!matches) {
      return [];
    }
    const from = parseFloat(matches[1]);
    const to = parseFloat(matches[2]);

    if (from > to) {
      reportExtractLevelsWarning(
        options,
        "inverted-level-range",
        `Parsed inverted ${getTagLabel(options)} range "${level}". Prefer ascending ranges like "${to}-${from}".`,
      );
    }

    finalArray = arrayRange(from, to, from <= to ? 1 : -1);
  } else if (!isNaN(parseFloat(level))) {
    finalArray = [parseFloat(level)];
  }

  return finalArray;
}

function deduplicateLevels(
  levels: number[],
  sourceValue: LevelValue,
  options: ExtractLevelsOptions,
): number[] {
  const uniqueLevels: number[] = [];
  const seenLevels = new Set<number>();
  const duplicateLevels = new Set<number>();

  levels.forEach((level) => {
    if (seenLevels.has(level)) {
      duplicateLevels.add(level);
      return;
    }

    seenLevels.add(level);
    uniqueLevels.push(level);
  });

  if (duplicateLevels.size > 0) {
    reportExtractLevelsWarning(
      options,
      "duplicate-level-values",
      `Removed duplicate ${getTagLabel(options)} value(s) ${Array.from(duplicateLevels).join(", ")} from "${String(sourceValue)}".`,
    );
  }

  return uniqueLevels;
}

function reportExtractLevelsWarning(
  options: ExtractLevelsOptions,
  code: string,
  message: string,
): void {
  options.diagnostics?.warn({
    code: `ExtractLevels.${code}`,
    message,
    elementRef: options.elementRef,
    sourceElement: options.sourceElement,
  });
}

function reportExtractLevelsError(
  options: ExtractLevelsOptions,
  code: string,
  message: string,
): void {
  options.diagnostics?.error({
    code: `ExtractLevels.${code}`,
    message,
    elementRef: options.elementRef,
    sourceElement: options.sourceElement,
  });
}

function getTagLabel(options: ExtractLevelsOptions): string {
  return options.tagName === undefined ? "level" : options.tagName;
}
