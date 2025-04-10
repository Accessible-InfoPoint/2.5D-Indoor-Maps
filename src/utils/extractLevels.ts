import { arrayRange } from "./arrayRange";

export function extractLevels(level: string): number[] {
  level = level.trim();

  if (level == "")
    return [];

  const regExRange = /(-?\d)-(-?\d)/;
  let finalArray: number[] = [];

  if (level.includes(";")) {
    finalArray = level.split(";").flatMap(val => extractLevels(val));
  } else if (regExRange.test(level)) {
    finalArray = arrayRange(parseInt(regExRange.exec(level)[1]), parseInt(regExRange.exec(level)[2]), 1)
  } else if (!isNaN(parseFloat(level))) {
    finalArray = [parseFloat(level)]
  }

  return finalArray;
}
