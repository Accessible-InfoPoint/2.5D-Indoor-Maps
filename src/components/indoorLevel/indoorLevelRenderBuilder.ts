import FeatureService from "../../services/featureService";
import { UserGroupEnum } from "../../models/userGroupEnum";
import { isRoomLabelEligibleTags } from "../../indoor/indoorTagFilters";
import { extractLevels } from "../../utils/extractLevels";
import { isDrawableRoomOrArea, isVisibleIn3DMode } from "../../utils/drawableElementFilter";
import { getRequiredFeatureId, getRequiredFeatureProperties } from "../../utils/geoJsonHelpers";
import {
  AccessibilityMarkerRenderItem,
  IndoorLevelRenderModel,
  PositionMarkerRenderItem,
  RoomRenderItem,
  StyledFeatureRenderItem,
} from "./indoorLevelRenderModel";

interface IndoorLevelRenderBuilderOptions {
  geoJSON: GeoJSON.FeatureCollection;
  buildingGeoJSON: GeoJSON.FeatureCollection;
  outlineCoordinates: number[][];
  level: number;
  selectedFeatureIds: string[];
  infoPointLevel: number;
  userProfile: UserGroupEnum;
}

export function buildIndoorLevelRenderModel(
  options: IndoorLevelRenderBuilderOptions,
): IndoorLevelRenderModel {
  const rooms: RoomRenderItem[] = [];
  const accessibilityMarkers: AccessibilityMarkerRenderItem[] = [];
  const tactilePaving: StyledFeatureRenderItem[] = [];
  let infoPoint = undefined;

  options.geoJSON.features.forEach((feature) => {
    const properties = getRequiredFeatureProperties(feature);

    if (properties["information"] == "tactile_map") {
      infoPoint = {
        feature,
        levels: extractLevels(properties.level ?? options.infoPointLevel.toString()),
      };
    }

    if (isDrawableRoomOrArea(feature)) {
      const room = buildRoomRenderItem(feature, options);
      rooms.push(room);
      pushAccessibilityMarker(accessibilityMarkers, feature);
    } else if (properties["tactile_paving"]) {
      tactilePaving.push({
        feature,
        style: buildTactilePavingStyle(feature),
      });
    } else if (feature.geometry.type == "Point") {
      pushAccessibilityMarker(accessibilityMarkers, feature);
    }
  });

  return {
    outlineCoordinates: options.outlineCoordinates,
    infoPoint,
    rooms,
    doors: [],
    walls: [],
    tactilePaving,
    accessibilityMarkers,
    staircase: {
      renderItems: [],
      doorCoordinates: getDoorCoordinates(options.geoJSON),
      lowestPoints: options.buildingGeoJSON.features.filter(
        (feature) => "point:lowest" in getRequiredFeatureProperties(feature),
      ),
      pathways: options.geoJSON.features.filter((feature) => {
        const properties = getRequiredFeatureProperties(feature);

        return "indoor" in properties && properties["indoor"] == "pathway";
      }),
      allNodes: options.buildingGeoJSON.features.filter(
        (feature) => feature.geometry.type == "Point",
      ),
      simpleFeatures: getStaircaseFeatures(
        options.geoJSON,
        options,
        FeatureService.isSimpleStaircase,
      ),
      complexFeatures: getStaircaseFeatures(
        options.geoJSON,
        options,
        FeatureService.isComplexStaircase,
      ),
    },
  };
}

function pushAccessibilityMarker(
  accessibilityMarkers: AccessibilityMarkerRenderItem[],
  feature: GeoJSON.Feature,
): void {
  const markerData = FeatureService.getAccessibilityMarkerData(feature);

  if (markerData === null) {
    return;
  }

  accessibilityMarkers.push({
    id: getRequiredFeatureId(feature),
    sourceFeature: feature,
    markerData,
  });
}

function buildRoomRenderItem(
  feature: GeoJSON.Feature,
  options: IndoorLevelRenderBuilderOptions,
): RoomRenderItem {
  const isSelected = options.selectedFeatureIds.includes(getRequiredFeatureId(feature));

  return {
    feature,
    isSelected,
    isVisibleIn3D: isVisibleIn3DMode(feature, options.selectedFeatureIds),
    label: getRoomLabel(feature),
    style: isSelected
      ? buildSelectedFeatureStyle(feature, options.userProfile)
      : FeatureService.getFeatureStyle(feature),
    selectedPositionMarker: isSelected ? buildSelectedPositionMarker(feature, options) : undefined,
  };
}

function buildTactilePavingStyle(feature: GeoJSON.Feature): Record<string, unknown> {
  return FeatureService.getTactilePavingStyleFromTags(getRequiredFeatureProperties(feature));
}

function buildSelectedFeatureStyle(
  feature: GeoJSON.Feature,
  userProfile: UserGroupEnum,
): Record<string, unknown> {
  return FeatureService.getSelectedRoomStyleFromTags(
    getRequiredFeatureProperties(feature),
    userProfile,
  );
}

function buildSelectedPositionMarker(
  feature: GeoJSON.Feature,
  options: IndoorLevelRenderBuilderOptions,
): PositionMarkerRenderItem | undefined {
  const properties = getRequiredFeatureProperties(feature);
  const diff = options.level - options.infoPointLevel;
  const label = diff > 0 ? "+" + diff.toString() : diff.toString();

  if (
    Array.isArray(properties["level"]) &&
    Math.min(
      ...(properties["level"] as number[]).map((level) => Math.abs(level - options.infoPointLevel)),
    ) != Math.abs(diff)
  ) {
    return undefined;
  }

  return {
    feature,
    label,
  };
}

function getRoomLabel(feature: GeoJSON.Feature): string | undefined {
  const properties = getRequiredFeatureProperties(feature);
  const label = properties.name || properties.ref;

  if (typeof label == "string" && isRoomLabelEligibleTags(properties)) {
    return label;
  }

  return undefined;
}

function getDoorCoordinates(geoJSON: GeoJSON.FeatureCollection): GeoJSON.Position[] {
  return geoJSON.features
    .filter((feature) => "door" in getRequiredFeatureProperties(feature))
    .map((feature) => (feature.geometry as GeoJSON.Point).coordinates);
}

function getStaircaseFeatures(
  geoJSON: GeoJSON.FeatureCollection,
  options: IndoorLevelRenderBuilderOptions,
  isStaircaseType: (feature: GeoJSON.Feature) => boolean,
): GeoJSON.Feature[] {
  return geoJSON.features
    .filter((feat) => {
      const properties = getRequiredFeatureProperties(feat);

      return (
        isStaircaseType(feat) &&
        (!Array.isArray(properties.level) ||
          (Array.isArray(properties.level) && properties.level.at(-1) != options.level))
      );
    })
    .filter((feat) => {
      const properties = getRequiredFeatureProperties(feat);

      return (
        options.userProfile != UserGroupEnum.wheelchairUsers ||
        (options.userProfile == UserGroupEnum.wheelchairUsers &&
          "wheelchair" in properties &&
          properties["wheelchair"] == "yes")
      );
    });
}
