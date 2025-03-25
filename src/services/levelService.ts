import BuildingService from "./buildingService";
import { extractLevels } from "../utils/extractLevels";
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
  
  const currentBuildingIndoorData = BuildingService.getBuildingGeoJSON();
  const allLevelNames = new Array<string>();

  currentBuildingIndoorData.features.forEach(
    (feature: GeoJSON.Feature<any, any>) => {
      if (!["Polygon", "LineString"].includes(feature.geometry.type)) { // only use geometries for levels that are actually drawn
        return;
      }

      if (Array.isArray(feature.properties.level)) {
        feature.properties.level.forEach((level: string) => {
          if (!allLevelNames.includes(level)) {
            allLevelNames.push(level);
          }
        });
        return;
      }

      const level = (feature.properties.level =
        feature.properties.level.trim());

      if (level.includes(";")) {
        feature.properties.level = level.split(";");
      } else if (level.includes("-")) {
        feature.properties.level = extractLevels(level);
      }

      if (Array.isArray(feature.properties.level)) {
        feature.properties.level.forEach((level: string) => {
          if (!allLevelNames.includes(level)) {
            allLevelNames.push(level);
          }
        });
      } else {
        if (!allLevelNames.includes(level)) {
          allLevelNames.push(level);
        }
      }
    }
  );
  
  // console.log(allLevelNames.sort((a, b) => -parseFloat(a) + parseFloat(b)))
  // console.log(BackendService.getLevels())

  // return allLevelNames.sort((a, b) => -parseFloat(a) + parseFloat(b)); // reverse order
  
  return BackendService.getLevels();
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
