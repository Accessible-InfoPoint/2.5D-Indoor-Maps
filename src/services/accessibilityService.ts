import { levelAccessibilityProperties } from "../data/levelAccessibilityProperties";
import UserService from "./userService";
import { getRequiredMapValue } from "../utils/requiredHelpers";
import { IndoorTags } from "../indoor/indoorTagFilters";

const propertiesByLevel = new Map<number, string>();

function getForLevel(
  level: number,
  featureCollection: GeoJSON.FeatureCollection<any, any>,
): string {
  if (propertiesByLevel.get(level) !== undefined) {
    return getRequiredMapValue(propertiesByLevel, level, "Accessibility properties by level");
  }

  propertiesByLevel.set(
    level,
    getAccessibilityInformationFromTags(
      featureCollection.features.map((feature) => feature.properties ?? {}),
    ),
  );
  return getRequiredMapValue(propertiesByLevel, level, "Accessibility properties by level");
}

function getForLevelTags(level: number, tagSets: IndoorTags[]): string {
  if (propertiesByLevel.get(level) !== undefined) {
    return getRequiredMapValue(propertiesByLevel, level, "Accessibility properties by level");
  }

  propertiesByLevel.set(level, getAccessibilityInformationFromTags(tagSets));
  return getRequiredMapValue(propertiesByLevel, level, "Accessibility properties by level");
}

function reset(): void {
  propertiesByLevel.clear();
}

function getAccessibilityInformationFromTags(tagSets: IndoorTags[]): string {
  let returnString = "";

  levelAccessibilityProperties.forEach((levelAccessibilityProperty) => {
    if (!levelAccessibilityProperty.userGroups.includes(UserService.getCurrentProfile())) {
      return; // only show properties for currently selected user profile
    }

    const foundAccessibilityFeature = tagSets.some((tags) =>
      levelAccessibilityProperty.hasCorrectTags(tags),
    );

    const message = foundAccessibilityFeature
      ? levelAccessibilityProperty.msgTrue
      : levelAccessibilityProperty.msgFalse;

    if (message !== null) {
      returnString += message;
      returnString += ", ";
    }
  });

  if (returnString) {
    //remove last comma
    returnString = "[" + returnString.slice(0, -2) + "]";
    return returnString;
  } else {
    return "";
  }
}

export default {
  getForLevel,
  getForLevelTags,
  reset,
  getAccessibilityInformationFromTags,
};
