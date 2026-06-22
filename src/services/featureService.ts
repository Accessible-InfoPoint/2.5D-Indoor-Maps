import { featureDescriptionHelper } from "../utils/featureDescriptionHelper";
import { featureAccessibilityProperties } from "../data/featureAccessibilityProperties";
import UserService from "../services/userService";
import { lang } from "./languageService";
import {
  MARKERS_IMG_DIR,
} from "../../public/strings/constants.json";
import {
  FILL_OPACITY,
  WALL_WEIGHT,
  WALL_WEIGHT_PAVING,
} from "../../public/strings/settings.json";
import { UserGroupEnum } from "../models/userGroupEnum";
import { UserFeatureEnum } from "../models/userFeatureEnum";
import { UserFeatureSelection } from "../data/userFeatureSelection";
import ColorService, { colors } from "./colorService";
import { getRequiredFeatureProperties } from "../utils/geoJsonHelpers";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import polygonCenter from "geojson-polygon-center";
const currentlySelectedFeatures: Map<any, boolean> = getCurrentFeatures();

export interface AccessibilityMarkerData {
  coordinates: GeoJSON.Position;
  symbol: {
    markerFile: string;
    markerWidth: number;
    markerHeight: number;
    markerHorizontalAlignment: "middle";
    markerVerticalAlignment: "middle";
  };
}

function getAccessibilityDescription(feature: GeoJSON.Feature): string {
  const properties = getRequiredFeatureProperties(feature);
  let popUpText = properties.ref ?? "(no name)";

  if (
    properties.name !== undefined &&
    properties.name.length !== 0
  ) {
    popUpText += " (" + properties.name + ")";
  }

  popUpText += featureDescriptionHelper(
    feature,
    featureAccessibilityProperties
  );

  return lang.selectedMapObjectPrefix + popUpText;
}

function checkForMatchingTags(tags: UserFeatureEnum[] | undefined): boolean {
  if (tags == undefined) return false;
  const hasMatched = tags.some((t) => {
    return currentlySelectedFeatures.get(UserFeatureEnum[t]);
  });

  return hasMatched;
}

function getAccessibilityMarkerData(feature: GeoJSON.Feature): AccessibilityMarkerData | null {
  let iconFileName = "";

  const isFeatureAccessible = featureAccessibilityProperties.some(
    ({ hasCorrectProperties, iconFilename, userGroups, tags }) => {
      if (
        userGroups.includes(UserService.getCurrentProfile()) &&
        hasCorrectProperties(feature) &&
        iconFilename !== undefined &&
        checkForMatchingTags(tags)
      ) {
        iconFileName = iconFilename;
        return true;
      }
      return false;
    }
  );

  if (isFeatureAccessible) {
    return {
      coordinates: feature.geometry.type == "Polygon" ? polygonCenter(feature.geometry).coordinates : (feature.geometry as GeoJSON.Point).coordinates,
      symbol: {
        markerFile: MARKERS_IMG_DIR + iconFileName,
        markerWidth: 48,
        markerHeight: 48,
        markerHorizontalAlignment: "middle",
        markerVerticalAlignment: "middle"
      },
    };
  }
  return null;
}

function getFeatureStyle(feature: GeoJSON.Feature<any>): any {
  const properties = getRequiredFeatureProperties(feature);
  let fill = "#fff";
  let pattern_fill: string | null = null;
  const lineWidth = getWallWeight(feature) + ColorService.getLineThickness() / 20;
  const size = lineWidth <= 2 ? "small" : (lineWidth <= 4 ? "medium": "large");

  if (properties.amenity === "toilets") {
    fill = colors.toiletColor;
    if ("wheelchair" in properties && properties["wheelchair"] == "yes") {
      pattern_fill = "/images/pattern_fill/" + ColorService.getCurrentProfile() + "_" + size + "_toiletColor.png";
    }
  } else if (
    properties.stairs ||
    (properties.highway &&
      (properties.highway == "elevator" ||
        properties.highway == "escalator"))
  ) {
    fill = colors.stairsColor;
    if ("wheelchair" in properties && properties["wheelchair"] == "yes") {
      pattern_fill = "/images/pattern_fill/" + ColorService.getCurrentProfile() + "_" + size + "_stairsColor.png";
    }
  } else if (properties.indoor === "room") {
    fill = colors.roomColor;
    if ("wheelchair" in properties && properties["wheelchair"] == "yes") {
      pattern_fill = "/images/pattern_fill/" + ColorService.getCurrentProfile() + "_" + size + "_roomColor.png";
    }
  }

  return {
    polygonFill: fill,
    lineWidth: lineWidth,
    lineColor: colors.wallColor,
    polygonOpacity: FILL_OPACITY,
    polygonPatternFile: UserService.getCurrentProfile() == UserGroupEnum.wheelchairUsers ? pattern_fill : null
  };
}

function getWallWeight(feature: GeoJSON.Feature<any>): number {
  const properties = getRequiredFeatureProperties(feature);

  //highlight tactile paving lines
  //decides wall weight based on the user profile and feature
  return feature.geometry.type === "LineString" &&
    properties.tactile_paving === "yes"
    ? WALL_WEIGHT_PAVING
    : WALL_WEIGHT;
}

export function getCurrentFeatures(): Map<UserFeatureEnum, boolean> {
  const currentProfile = UserService.getCurrentProfile();
  const currentlySelectedFeatures: Map<UserFeatureEnum, boolean> =
    localStorage.getItem("currentlySelectedFeatures")
      ? new Map(JSON.parse(localStorage.currentlySelectedFeatures))
      : (() => {
          const currentlySelectedFeatures = new Map();
          for (const v of UserFeatureSelection.values()) {
            if (v.userGroups.some((g: any) => g === currentProfile))
              currentlySelectedFeatures.set(v.id, true)
            else
              currentlySelectedFeatures.set(v.id, false);

            //currentlySelectedFeatures.set(v.id, v.isCheckedDefault);
          }
          return currentlySelectedFeatures;
        })();

  return currentlySelectedFeatures;
}

export function setCurrentFeatures(checkboxState: Map<UserFeatureEnum, boolean>): void {
  localStorage.currentlySelectedFeatures = JSON.stringify([
    ...checkboxState.entries(),
  ]);
}

export function isStaircase(feature: GeoJSON.Feature): boolean {
  const properties = getRequiredFeatureProperties(feature);

  return "stairs" in properties && properties["stairs"] == "yes" ||
  (
    "highway" in properties &&
    (
      properties["highway"] == "elevator" ||
      properties["highway"] == "escalator"
    )
  )
}

export function isSimpleStaircase(feature: GeoJSON.Feature): boolean {
  const properties = getRequiredFeatureProperties(feature);

  return isStaircase(feature) && "indoor" in properties && properties["indoor"] == "room";
}

export function isComplexStaircase(feature: GeoJSON.Feature): boolean {
  const properties = getRequiredFeatureProperties(feature);

  return isStaircase(feature) && "indoor" in properties && properties["indoor"] != "room";
}

export default {
  getAccessibilityDescription,
  getAccessibilityMarkerData,
  getFeatureStyle,
  getWallWeight,
  getCurrentFeatures,
  setCurrentFeatures,
  isStaircase,
  isSimpleStaircase,
  isComplexStaircase,
};
