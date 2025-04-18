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
import * as Maptalks from "maptalks";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import polygonCenter from "geojson-polygon-center";
const currentlySelectedFeatures: Map<any, boolean> = getCurrentFeatures();

function getAccessibilityDescription(feature: GeoJSON.Feature): string {
  let popUpText = feature.properties.ref ?? "(no name)";

  if (
    feature.properties.name !== undefined &&
    feature.properties.name.length !== 0
  ) {
    popUpText += " (" + feature.properties.name + ")";
  }

  popUpText += featureDescriptionHelper(
    feature,
    featureAccessibilityProperties
  );

  return lang.selectedMapObjectPrefix + popUpText;
}

function checkForMatchingTags(tags: UserFeatureEnum[]): boolean {
  if (tags == undefined) return false;
  const hasMatched = tags.some((t) => {
    return currentlySelectedFeatures.get(UserFeatureEnum[t]);
  });

  return hasMatched;
}

function getAccessibilityMarker(feature: GeoJSON.Feature): Maptalks.Marker {
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
    return new Maptalks.Marker(feature.geometry.type == "Polygon" ? polygonCenter(feature.geometry).coordinates : (feature.geometry as unknown as GeoJSON.Point).coordinates, {
      symbol: {
        markerFile: MARKERS_IMG_DIR + iconFileName,
        markerWidth: 48,
        markerHeight: 48,
        markerHorizontalAlignment: "middle",
        markerVerticalAlignment: "middle"
      } as Maptalks.FileMarkerSymbol,
    });
  }
  return null;
}

function getFeatureStyle(feature: GeoJSON.Feature<any>): any {
  let fill = "#fff";
  let pattern_fill: string = null;
  const lineWidth = getWallWeight(feature) + ColorService.getLineThickness() / 20;
  const size = lineWidth <= 2 ? "small" : (lineWidth <= 4 ? "medium": "large");

  if (feature.properties.amenity === "toilets") {
    fill = colors.toiletColor;
    if ("wheelchair" in feature.properties && feature.properties["wheelchair"] == "yes") {
      pattern_fill = "/images/pattern_fill/" + ColorService.getCurrentProfile() + "_" + size + "_toiletColor.png";
    }
  } else if (
    feature.properties.stairs ||
    (feature.properties.highway &&
      (feature.properties.highway == "elevator" ||
        feature.properties.highway == "escalator"))
  ) {
    fill = colors.stairsColor;
    if ("wheelchair" in feature.properties && feature.properties["wheelchair"] == "yes") {
      pattern_fill = "/images/pattern_fill/" + ColorService.getCurrentProfile() + "_" + size + "_stairsColor.png";
    }
  } else if (feature.properties.indoor === "room") {
    fill = colors.roomColor;
    if ("wheelchair" in feature.properties && feature.properties["wheelchair"] == "yes") {
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
  //highlight tactile paving lines
  //decides wall weight based on the user profile and feature
  return feature.geometry.type === "LineString" &&
    feature.properties.tactile_paving === "yes"
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
  return "stairs" in feature.properties && feature.properties["stairs"] == "yes" ||
  (
    "highway" in feature.properties &&
    (
      feature.properties["highway"] == "elevator" ||
      feature.properties["highway"] == "escalator"
    )
  )
}

export function isSimpleStaircase(feature: GeoJSON.Feature): boolean {
  return isStaircase(feature) && "indoor" in feature.properties && feature.properties["indoor"] == "room";
}

export function isComplexStaircase(feature: GeoJSON.Feature): boolean {
  return isStaircase(feature) && "indoor" in feature.properties && feature.properties["indoor"] != "room";
}

export default {
  getAccessibilityDescription,
  getAccessibilityMarker,
  getFeatureStyle,
  getWallWeight,
  getCurrentFeatures,
  setCurrentFeatures,
  isStaircase,
  isSimpleStaircase,
  isComplexStaircase,
};
