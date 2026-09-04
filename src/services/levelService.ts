import { hasLevel } from "../utils/hasCurrentLevel";
import AccessibilityService from "./accessibilityService";
import { lang } from "./languageService";
import BackendService from "./backendService";
import { getRequiredMapValue } from "../utils/requiredHelpers";

const geoJSONByLevel = new Map<number, GeoJSON.FeatureCollection>();

function clearData(): void {
  geoJSONByLevel.clear();
}

function getCurrentLevelGeoJSON(currentLevel: number): GeoJSON.FeatureCollection<any> {
  return getLevelGeoJSON(currentLevel);
}

function getLevelGeoJSON(level: number): GeoJSON.FeatureCollection {
  if (geoJSONByLevel.get(level) !== undefined) {
    return getRequiredMapValue(geoJSONByLevel, level, "GeoJSON by level");
  }

  const currentBuildingIndoorData = BackendService.getGeoJson();

  const levelFilteredFeatures = currentBuildingIndoorData.features.filter((feat) =>
    hasLevel(feat, level),
  );
  const levelFilteredFeatureCollection: GeoJSON.FeatureCollection<any, any> = {
    type: "FeatureCollection",
    features: levelFilteredFeatures,
  };

  geoJSONByLevel.set(level, levelFilteredFeatureCollection);
  return levelFilteredFeatureCollection;
}

function getLevelNames(): string[] {
  return BackendService.getAllLevels().map((val) => val.toString()); // reverse order
}

function getCurrentLevelDescription(currentLevel: number): string {
  const levelAccessibilityInformation = AccessibilityService.getForLevel(
    currentLevel,
    getCurrentLevelGeoJSON(currentLevel),
  );
  return lang.currentLevel + currentLevel + " " + levelAccessibilityInformation;
}

function getCurrentLevelAccessibilityBody(currentLevel: number): string {
  return AccessibilityService.getForLevel(currentLevel, getCurrentLevelGeoJSON(currentLevel));
}

export default {
  getCurrentLevelGeoJSON,
  getLevelGeoJSON,
  getLevelNames,
  getCurrentLevelDescription,
  getCurrentLevelAccessibilityBody,
  clearData,
};
