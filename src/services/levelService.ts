import { hasLevel } from "../utils/hasCurrentLevel";
import AccessibilityService from "./accessibilityService";
import { lang } from "./languageService";
import BackendService from "./backendService";
import { getRequiredMapValue } from "../utils/requiredHelpers";
import { IndoorDataPipelineEnum } from "../models/indoorDataPipelineEnum";
import { IndoorElement } from "../indoor/elements/IndoorElement";
import { IndoorTags } from "../indoor/indoorTagFilters";

const geoJSONByLevel = new Map<number, GeoJSON.FeatureCollection>();

export interface LevelOption {
  level: number;
  label: string;
}

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
  return getLevelOptions().map((option) => option.label); // reverse order
}

function getLevelOptions(): LevelOption[] {
  return BackendService.getAllLevels().map((level) => ({
    level,
    label: BackendService.getLevelLabel(level),
  }));
}

function getCurrentLevelDescription(currentLevel: number): string {
  const levelAccessibilityInformation =
    BackendService.getBackendConfig().indoorDataPipeline === IndoorDataPipelineEnum.rawIndoorModel
      ? AccessibilityService.getForLevelTags(currentLevel, getRawLevelTags(currentLevel))
      : AccessibilityService.getForLevel(currentLevel, getCurrentLevelGeoJSON(currentLevel));

  return lang.currentLevel + currentLevel + " " + levelAccessibilityInformation;
}

function getRawLevelTags(level: number): IndoorTags[] {
  const model = BackendService.getIndoorModel();
  const elements: IndoorElement[] = [
    ...model.rooms,
    ...model.pointFeatures,
    ...model.infoPoints,
    ...model.tactilePaving,
    ...model.stairPathways,
  ];

  return elements.filter((element) => element.hasLevel(level)).map((element) => element.tags);
}

export default {
  getCurrentLevelGeoJSON,
  getLevelGeoJSON,
  getLevelNames,
  getLevelOptions,
  getCurrentLevelDescription,
  clearData,
};
