import { arrayRange } from "./arrayRange";

export type LevelValue = string | number | Array<string | number> | null | undefined;

export function extractLevels(level: LevelValue): number[] {
  if (level == null)
    return [];

  if (typeof level == "number")
    return [level];

  if (Array.isArray(level))
    return level.flatMap(val => extractLevels(val));

  level = level.trim();

  if (level == "")
    return [];

  const regExRange = /^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/;
  let finalArray: number[] = [];

  if (level.includes(";")) {
    finalArray = level.split(";").flatMap(val => extractLevels(val));
  } else if (regExRange.test(level)) {
    const matches = regExRange.exec(level);
    if (!matches) {
      return [];
    }
    finalArray = arrayRange(parseFloat(matches[1]), parseFloat(matches[2]), 1)
  } else if (!isNaN(parseFloat(level))) {
    finalArray = [parseFloat(level)]
  }

  return finalArray;
}
