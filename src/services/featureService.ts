import { featureDescriptionHelper } from "../utils/featureDescriptionHelper";
import { featureAccessibilityProperties } from "../data/featureAccessibilityProperties";
import UserService from "../services/userService";
import { lang } from "./languageService";
import { MARKERS_IMG_DIR, ICONS } from "../../public/strings/constants.json";
import { FILL_OPACITY, WALL_WEIGHT, WALL_WEIGHT_PAVING } from "../../public/strings/settings.json";
import { UserGroupEnum } from "../models/userGroupEnum";
import { UserFeatureEnum } from "../models/userFeatureEnum";
import { UserFeatureSelection } from "../data/userFeatureSelection";
import ColorService from "./colorService";
import { getRequiredFeatureProperties } from "../utils/geoJsonHelpers";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import polygonCenter from "geojson-polygon-center";

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

function getFeatureTitle(feature: GeoJSON.Feature): string {
  const properties = getRequiredFeatureProperties(feature);
  let title = properties.ref ?? "(no name)";

  if (properties.name !== undefined && properties.name.length !== 0) {
    title += " (" + properties.name + ")";
  }

  return title;
}

function getAccessibilityDescription(feature: GeoJSON.Feature): string {
  return (
    lang.selectedMapObjectPrefix +
    getFeatureTitle(feature) +
    featureDescriptionHelper(feature, featureAccessibilityProperties)
  );
}

function checkForMatchingTags(tags: UserFeatureEnum[] | undefined): boolean {
  if (tags == undefined) return false;
  const currentlySelectedFeatures = getCurrentFeatures();
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
    },
  );

  if (isFeatureAccessible) {
    return {
      coordinates:
        feature.geometry.type == "Polygon"
          ? polygonCenter(feature.geometry).coordinates
          : (feature.geometry as GeoJSON.Point).coordinates,
      symbol: {
        markerFile: MARKERS_IMG_DIR + iconFileName,
        markerWidth: 48,
        markerHeight: 48,
        markerHorizontalAlignment: "middle",
        markerVerticalAlignment: "middle",
      },
    };
  }
  return null;
}

const CATEGORY_ICON_RULES: Array<{
  matches: (p: Record<string, unknown>) => boolean;
  iconFilename: string;
}> = [
  {
    matches: (p) =>
      p.amenity === "toilets" && ["yes", "designated"].includes(p.wheelchair as string),
    iconFilename: ICONS.TOILETS_WHEELCHAIR,
  },
  { matches: (p) => p.amenity === "toilets", iconFilename: ICONS.TOILETS },
  { matches: (p) => p.highway === "elevator", iconFilename: ICONS.ELEVATOR },
  { matches: (p) => p.highway === "steps" || p.stairs === "yes", iconFilename: ICONS.STAIRS },
  { matches: (p) => p.amenity === "cafe" || p.amenity === "restaurant", iconFilename: ICONS.CAFE },
  { matches: (p) => p.shop !== undefined, iconFilename: ICONS.SHOP },
  {
    matches: (p) =>
      p.entrance !== undefined && ["yes", "main", "secondary"].includes(p.entrance as string),
    iconFilename: ICONS.ENTRANCE,
  },
  {
    matches: (p) =>
      (p.exit !== undefined && ["yes", "emergency"].includes(p.exit as string)) ||
      (p.entrance !== undefined && ["exit", "emergency"].includes(p.entrance as string)),
    iconFilename: ICONS.EMERGENCY_EXIT,
  },
  {
    matches: (p) =>
      p.information !== undefined && ["board", "map"].includes(p.information as string),
    iconFilename: ICONS.INFO,
  },
];

/**
 * Profile-agnostic category icon for a feature, for use in contexts (like
 * search results) where the icon must stay consistent regardless of the
 * user's currently-selected accessibility profile or toggled map filters.
 * Returns undefined when no specific category icon applies.
 */
export function getCategoryIcon(feature: GeoJSON.Feature): string | undefined {
  const properties = getRequiredFeatureProperties(feature);
  const rule = CATEGORY_ICON_RULES.find(({ matches }) => matches(properties));
  return rule ? MARKERS_IMG_DIR + rule.iconFilename : undefined;
}

function getFeatureStyle(feature: GeoJSON.Feature<any>): any {
  const properties = getRequiredFeatureProperties(feature);
  const colors = ColorService.getCurrentColors();
  let fill = "#fff";
  let pattern_fill: string | null = null;
  const lineWidth = getWallWeight(feature) + ColorService.getLineThickness() / 20;
  const size = lineWidth <= 2 ? "small" : lineWidth <= 4 ? "medium" : "large";

  if (properties.amenity === "toilets") {
    fill = colors.toiletColor;
    if ("wheelchair" in properties && properties["wheelchair"] == "yes") {
      pattern_fill =
        "/images/pattern_fill/" +
        ColorService.getCurrentProfile() +
        "_" +
        size +
        "_toiletColor.png";
    }
  } else if (
    properties.stairs ||
    (properties.highway && (properties.highway == "elevator" || properties.highway == "escalator"))
  ) {
    fill = colors.stairsColor;
    if ("wheelchair" in properties && properties["wheelchair"] == "yes") {
      pattern_fill =
        "/images/pattern_fill/" +
        ColorService.getCurrentProfile() +
        "_" +
        size +
        "_stairsColor.png";
    }
  } else if (properties.indoor === "room") {
    fill = colors.roomColor;
    if ("wheelchair" in properties && properties["wheelchair"] == "yes") {
      pattern_fill =
        "/images/pattern_fill/" + ColorService.getCurrentProfile() + "_" + size + "_roomColor.png";
    }
  }

  return {
    polygonFill: fill,
    lineWidth: lineWidth,
    lineColor: colors.wallColor,
    polygonOpacity: FILL_OPACITY,
    polygonPatternFile:
      UserService.getCurrentProfile() == UserGroupEnum.wheelchairUsers ? pattern_fill : null,
  };
}

function getWallWeight(feature: GeoJSON.Feature<any>): number {
  const properties = getRequiredFeatureProperties(feature);

  //highlight tactile paving lines
  //decides wall weight based on the user profile and feature
  return feature.geometry.type === "LineString" && properties.tactile_paving === "yes"
    ? WALL_WEIGHT_PAVING
    : WALL_WEIGHT;
}

export function getCurrentFeatures(): Map<string, boolean> {
  const currentProfile = UserService.getCurrentProfile();
  const currentlySelectedFeatures: Map<string, boolean> = localStorage.getItem(
    "currentlySelectedFeatures",
  )
    ? new Map(JSON.parse(localStorage.currentlySelectedFeatures))
    : (() => {
        const currentlySelectedFeatures = new Map();
        for (const v of UserFeatureSelection.values()) {
          if (v.userGroups.some((g: any) => g === currentProfile))
            currentlySelectedFeatures.set(v.id, true);
          else currentlySelectedFeatures.set(v.id, false);

          //currentlySelectedFeatures.set(v.id, v.isCheckedDefault);
        }
        return currentlySelectedFeatures;
      })();

  return currentlySelectedFeatures;
}

export function setCurrentFeatures(checkboxState: Map<string, boolean>): void {
  localStorage.currentlySelectedFeatures = JSON.stringify([...checkboxState.entries()]);
}

export function isStaircase(feature: GeoJSON.Feature): boolean {
  const properties = getRequiredFeatureProperties(feature);

  return (
    ("stairs" in properties && properties["stairs"] == "yes") ||
    ("highway" in properties &&
      (properties["highway"] == "elevator" || properties["highway"] == "escalator"))
  );
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
  getFeatureTitle,
  getAccessibilityMarkerData,
  getFeatureStyle,
  getWallWeight,
  getCurrentFeatures,
  setCurrentFeatures,
  isStaircase,
  isSimpleStaircase,
  isComplexStaircase,
  getCategoryIcon,
};
