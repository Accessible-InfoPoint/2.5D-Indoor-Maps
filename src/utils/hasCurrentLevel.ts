import { geoMap } from "../main";
import { arrayRange } from "./arrayRange";

export function hasCurrentLevel(feature: GeoJSON.Feature<any>): boolean {
  const currentLevel = geoMap.getCurrentLevel();
  return hasLevel(feature, currentLevel)
}

export function hasLevel(feature: GeoJSON.Feature, level: number): boolean {
  const regExSemicolon = /-?\d*(;-?\d)/;
  const regExRange = /(-?\d)-(-?\d)/;

  return (
    ((typeof feature.properties.level === 'string' || feature.properties.level instanceof String) && feature.properties.level == level.toString()) || // nodes still have text level, as they should only have one level
    (Array.isArray(feature.properties.level) && feature.properties.level.includes(level)) || // most elements (polygons and lineStrings) should have array of levels
    ("repeat_on" in feature.properties && feature.properties.repeat_on === level.toString()) ||
    ("repeat_on" in feature.properties && regExSemicolon.test(feature.properties.repeat_on) && feature.properties.repeat_on.split(";").includes(level.toString())) ||
    ("repeat_on" in feature.properties && regExRange.test(feature.properties.repeat_on) && arrayRange(parseInt(feature.properties.repeat_on.match(regExRange)[1]), parseInt(feature.properties.repeat_on.match(regExRange)[2]), 1).includes(level)) // maybe step is different from 1
  );
}
