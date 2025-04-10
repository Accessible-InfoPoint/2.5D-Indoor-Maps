import BuildingService from "./buildingService";
import { hasLevel } from "../utils/hasCurrentLevel";
import AccessibilityService from "./accessibilityService";
import { geoMap } from "../main";
import { lang } from "./languageService";
import BackendService from "./backendService";

const geoJSONByLevel = new Map<string, any>();

function clearData(): void {
  geoJSONByLevel.clear();
}

function getCurrentLevelGeoJSON(): GeoJSON.FeatureCollection<any> {
  const currentLevel = geoMap.getCurrentLevel();
  return getLevelGeoJSON(currentLevel);
}

function getLevelGeoJSON(level: string): GeoJSON.FeatureCollection {
  const currentBuildingIndoorData = BuildingService.getBuildingGeoJSON();

  if (geoJSONByLevel.get(level) !== undefined) {
    return geoJSONByLevel.get(level);
  }

  const levelFilteredFeatures =
    currentBuildingIndoorData.features.filter((feat) => hasLevel(feat, level));
  const levelFilteredFeatureCollection: GeoJSON.FeatureCollection<any, any> = {
    type: "FeatureCollection",
    features: levelFilteredFeatures,
  };

  geoJSONByLevel.set(level, levelFilteredFeatureCollection);
  return levelFilteredFeatureCollection;
}

function getLevelNames(): string[] {
  return BackendService.getAllLevels().map(val => val.toString()); // reverse order
}

function getCurrentLevelDescription(): string {
  const currentLevel = geoMap.getCurrentLevel();
  const levelAccessibilityInformation = AccessibilityService.getForLevel(
    currentLevel,
    getCurrentLevelGeoJSON()
  );
  return lang.currentLevel + currentLevel + " " + levelAccessibilityInformation;
}

export default {
  getCurrentLevelGeoJSON,
  getLevelGeoJSON,
  getLevelNames,
  getCurrentLevelDescription,
  clearData,
};
