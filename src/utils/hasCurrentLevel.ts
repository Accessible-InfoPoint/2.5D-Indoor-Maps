import { extractLevels } from "./extractLevels";

export function hasCurrentLevel(
  feature: GeoJSON.Feature<any>,
  currentLevel: number | string,
): boolean {
  return hasLevel(feature, currentLevel);
}

export function hasLevel(feature: GeoJSON.Feature, level: number | string): boolean {
  const targetLevel = typeof level == "number" ? level : parseFloat(level);

  if (isNaN(targetLevel)) return false;

  const levels = extractLevels(feature.properties?.level);
  const repeatedLevels = extractLevels(feature.properties?.repeat_on);

  return levels.includes(targetLevel) || repeatedLevels.includes(targetLevel);
}
