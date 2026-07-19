import { featureDescriptionHelper } from "../utils/featureDescriptionHelper";
import { featureAccessibilityProperties } from "../data/featureAccessibilityProperties";
import UserService from "../services/userService";
import { lang } from "./languageService";
import { MARKERS_IMG_DIR, ICONS } from "../../public/strings/constants.json";
import { FILL_OPACITY, WALL_WEIGHT, WALL_WEIGHT_PAVING } from "../../public/strings/settings.json";
import { UserGroupEnum } from "../models/userGroupEnum";
import { UserFeatureEnum } from "../models/userFeatureEnum";
import { UserFeatureSelection } from "../data/userFeatureSelection";
import {
  IndoorTags,
  isAccessibleToiletTags,
  isEmergencyExitTags,
  isEntranceTags,
  isGeneralToiletTags,
  isInfoPointTags,
  isInformationBoardTags,
  isRoomTags,
  isStaircaseTags,
  isStepsTags,
  isTactileInformationTags,
  isToiletTags,
  isWheelchairAccessibleElevatorTags,
} from "../indoor/indoorTagFilters";
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

export interface IndoorFeatureStyle extends Record<string, unknown> {
  polygonFill: string;
  lineWidth: number;
  lineColor: string;
  polygonOpacity: number;
  polygonPatternFile: string | null;
  lineOpacity?: number;
  lineDasharray?: number[];
}

export interface IndoorFillStyle {
  polygonFill: string;
  polygonPatternFile: string | null;
}

function getAccessibilityDescription(feature: GeoJSON.Feature): string {
  const properties = getRequiredFeatureProperties(feature);
  let popUpText = properties.ref ?? "(no name)";

  if (properties.name !== undefined && properties.name.length !== 0) {
    popUpText += " (" + properties.name + ")";
  }

  popUpText += featureDescriptionHelper(feature, featureAccessibilityProperties);

  return lang.selectedMapObjectPrefix + popUpText;
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
  const coordinates = getMarkerCoordinatesFromGeometry(feature.geometry);

  return coordinates == undefined
    ? null
    : getAccessibilityMarkerDataFromTags(getRequiredFeatureProperties(feature), coordinates);
}

export function getAccessibilityMarkerDataFromTags(
  tags: IndoorTags,
  coordinates: GeoJSON.Position,
): AccessibilityMarkerData | null {
  if (isInfoPointTags(tags)) {
    return null;
  }

  const rule = ACCESSIBILITY_MARKER_RULES.find(
    (candidate) =>
      candidate.userGroups.includes(UserService.getCurrentProfile()) &&
      candidate.matches(tags) &&
      checkForMatchingTags(candidate.tags),
  );

  if (rule === undefined) {
    return null;
  }

  return {
    coordinates,
    symbol: {
      markerFile: MARKERS_IMG_DIR + rule.iconFilename,
      markerWidth: 48,
      markerHeight: 48,
      markerHorizontalAlignment: "middle",
      markerVerticalAlignment: "middle",
    },
  };
}

const ACCESSIBILITY_MARKER_RULES: Array<{
  matches: (tags: IndoorTags) => boolean;
  userGroups: UserGroupEnum[];
  iconFilename: string;
  tags?: UserFeatureEnum[];
}> = [
  {
    matches: isTactileInformationTags,
    userGroups: [UserGroupEnum.blindPeople],
    iconFilename: ICONS.INFO,
    tags: [UserFeatureEnum.tactileLines],
  },
  {
    matches: isAccessibleToiletTags,
    userGroups: [UserGroupEnum.wheelchairUsers],
    iconFilename: ICONS.TOILETS_WHEELCHAIR,
    tags: [UserFeatureEnum.accessibleToilets],
  },
  {
    matches: isWheelchairAccessibleElevatorTags,
    userGroups: [UserGroupEnum.wheelchairUsers],
    iconFilename: ICONS.ELEVATOR,
    tags: [UserFeatureEnum.elevators],
  },
  {
    matches: isGeneralToiletTags,
    userGroups: [UserGroupEnum.noImpairments, UserGroupEnum.blindPeople],
    iconFilename: ICONS.TOILETS,
    tags: [UserFeatureEnum.toilets],
  },
  {
    matches: isEntranceTags,
    userGroups: [
      UserGroupEnum.blindPeople,
      UserGroupEnum.noImpairments,
      UserGroupEnum.wheelchairUsers,
    ],
    iconFilename: ICONS.ENTRANCE,
    tags: [UserFeatureEnum.entrancesExits],
  },
  {
    matches: isEmergencyExitTags,
    userGroups: [
      UserGroupEnum.blindPeople,
      UserGroupEnum.noImpairments,
      UserGroupEnum.wheelchairUsers,
    ],
    iconFilename: ICONS.EMERGENCY_EXIT,
    tags: [UserFeatureEnum.emergencyExits],
  },
  {
    matches: isInformationBoardTags,
    userGroups: [UserGroupEnum.noImpairments, UserGroupEnum.wheelchairUsers],
    iconFilename: ICONS.INFO,
    tags: [UserFeatureEnum.service, UserFeatureEnum.tactileLines],
  },
  {
    matches: isStepsTags,
    userGroups: [UserGroupEnum.noImpairments, UserGroupEnum.blindPeople],
    iconFilename: ICONS.STAIRS,
    tags: [UserFeatureEnum.stairs],
  },
];

export function getMarkerCoordinatesFromGeometry(
  geometry: GeoJSON.Geometry,
): GeoJSON.Position | undefined {
  if (geometry.type == "Polygon") {
    return (polygonCenter(geometry) as GeoJSON.Point).coordinates;
  }

  if (geometry.type == "Point") {
    return geometry.coordinates;
  }

  return undefined;
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

function getFeatureStyle(feature: GeoJSON.Feature<any>): IndoorFeatureStyle {
  return getFeatureStyleFromTags(getRequiredFeatureProperties(feature), feature.geometry.type);
}

export function getFeatureStyleFromTags(
  tags: IndoorTags,
  geometryType?: GeoJSON.Geometry["type"],
): IndoorFeatureStyle {
  const colors = ColorService.getCurrentColors();
  const lineWidth = getLineWidthFromTags(tags, geometryType);
  const fillStyle = getIndoorFillStyleFromTags(tags, lineWidth);

  return {
    ...fillStyle,
    lineWidth,
    lineColor: colors.wallColor,
    polygonOpacity: FILL_OPACITY,
  };
}

export function getIndoorFillStyleFromTags(
  tags: IndoorTags,
  lineWidth = getLineWidthFromTags(tags),
): IndoorFillStyle {
  const colors = ColorService.getCurrentColors();
  const size = getPatternSize(lineWidth);

  if (isToiletTags(tags)) {
    return {
      polygonFill: colors.toiletColor,
      polygonPatternFile: getWheelchairPatternFile(tags, size, "toiletColor"),
    };
  }

  if (isStaircaseTags(tags)) {
    return {
      polygonFill: colors.stairsColor,
      polygonPatternFile: getWheelchairPatternFile(tags, size, "stairsColor"),
    };
  }

  if (isRoomTags(tags)) {
    return {
      polygonFill: colors.roomColor,
      polygonPatternFile: getWheelchairPatternFile(tags, size, "roomColor"),
    };
  }

  return {
    polygonFill: "#fff",
    polygonPatternFile: null,
  };
}

export function getSelectedRoomStyleFromTags(
  tags: IndoorTags,
  userProfile: UserGroupEnum,
): IndoorFeatureStyle {
  const lineWidth = getLineWidthFromTags(tags);
  const size = getPatternSize(lineWidth);

  return {
    ...getFeatureStyleFromTags(tags),
    polygonFill: ColorService.getCurrentColors().roomColorS,
    polygonPatternFile:
      userProfile == UserGroupEnum.wheelchairUsers
        ? getWheelchairPatternFile(tags, size, "roomColorS", true)
        : null,
  };
}

export function getWallStyleFromTags(tags: IndoorTags): IndoorFeatureStyle {
  const wallColor = ColorService.getCurrentColors().wallColor;

  return {
    polygonFill: wallColor,
    polygonOpacity: 1,
    polygonPatternFile: null,
    lineColor: wallColor,
    lineWidth: getLineWidthFromTags(tags),
    lineOpacity: 1,
  };
}

export function getTactilePavingStyleFromTags(tags: IndoorTags): IndoorFeatureStyle {
  return {
    ...getFeatureStyleFromTags(tags, "LineString"),
    polygonOpacity: 0,
    lineDasharray: [2, 2],
  };
}

export function getLineWidthFromTags(
  tags: IndoorTags,
  geometryType?: GeoJSON.Geometry["type"],
): number {
  return getWallWeightFromTags(tags, geometryType) + ColorService.getLineThickness() / 20;
}

export function getWallWeightFromTags(
  tags: IndoorTags,
  geometryType?: GeoJSON.Geometry["type"],
): number {
  //highlight tactile paving lines
  //decides wall weight based on the user profile and feature
  return geometryType === "LineString" && tags.tactile_paving === "yes"
    ? WALL_WEIGHT_PAVING
    : WALL_WEIGHT;
}

function getWallWeight(feature: GeoJSON.Feature<any>): number {
  return getWallWeightFromTags(getRequiredFeatureProperties(feature), feature.geometry.type);
}

function getPatternSize(lineWidth: number): "small" | "medium" | "large" {
  return lineWidth <= 2 ? "small" : lineWidth <= 4 ? "medium" : "large";
}

function getWheelchairPatternFile(
  tags: IndoorTags,
  size: "small" | "medium" | "large",
  colorName: string,
  ignoreCurrentProfile = false,
): string | null {
  if (tags.wheelchair != "yes") {
    return null;
  }

  if (!ignoreCurrentProfile && UserService.getCurrentProfile() != UserGroupEnum.wheelchairUsers) {
    return null;
  }

  return `/images/pattern_fill/${ColorService.getCurrentProfile()}_${size}_${colorName}.png`;
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
  return isStaircaseTags(getRequiredFeatureProperties(feature));
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
  getAccessibilityMarkerDataFromTags,
  getMarkerCoordinatesFromGeometry,
  getFeatureStyle,
  getFeatureStyleFromTags,
  getIndoorFillStyleFromTags,
  getSelectedRoomStyleFromTags,
  getWallStyleFromTags,
  getTactilePavingStyleFromTags,
  getLineWidthFromTags,
  getWallWeightFromTags,
  getWallWeight,
  getCurrentFeatures,
  setCurrentFeatures,
  isStaircase,
  isSimpleStaircase,
  isComplexStaircase,
  getCategoryIcon,
};
