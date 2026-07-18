import { hasLevel } from "../utils/hasCurrentLevel";
import AccessibilityService from "./accessibilityService";
import { lang } from "./languageService";
import BackendService from "./backendService";
import { getRequiredMapValue } from "../utils/requiredHelpers";
import { IndoorDataPipelineEnum } from "../models/indoorDataPipelineEnum";

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

  if (
    BackendService.getBackendConfig().indoorDataPipeline === IndoorDataPipelineEnum.rawIndoorModel
  ) {
    const emptyLevelFeatureCollection = emptyFeatureCollection();

    geoJSONByLevel.set(level, emptyLevelFeatureCollection);
    return emptyLevelFeatureCollection;
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

function emptyFeatureCollection(): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [],
  };
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

export default {
  getCurrentLevelGeoJSON,
  getLevelGeoJSON,
  getLevelNames,
  getCurrentLevelDescription,
  clearData,
};
