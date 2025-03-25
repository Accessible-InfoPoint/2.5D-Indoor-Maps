import { geoMap } from "../main";

export function hasCurrentLevel(feature: GeoJSON.Feature<any>): boolean {
  const currentLevel = geoMap.getCurrentLevel();
  return hasLevel(feature, currentLevel)
}

export function hasLevel(feature: GeoJSON.Feature, level: string): boolean {
  const regExSemicolon = /-?\d*(;-?\d)/;
  const regExRange = /(-?\d)-(-?\d)/;
  const arrayRange = (start: number, stop: number, step: number) => Array.from({ length: (stop - start) / step + 1 }, (v, index) => start + index * step);
  return (
    feature.properties.level === level ||
    feature.properties.level.includes(level) ||
    ("repeat_on" in feature.properties && feature.properties.repeat_on === level) ||
    ("repeat_on" in feature.properties && regExSemicolon.test(feature.properties.repeat_on) && feature.properties.repeat_on.split(";").includes(level)) ||
    ("repeat_on" in feature.properties && regExRange.test(feature.properties.repeat_on) && arrayRange(parseInt(feature.properties.repeat_on.match(regExRange)[1]), parseInt(feature.properties.repeat_on.match(regExRange)[2]), 1).map((num) => num.toString()).includes(level)) // maybe step is different from 1
  );
}
