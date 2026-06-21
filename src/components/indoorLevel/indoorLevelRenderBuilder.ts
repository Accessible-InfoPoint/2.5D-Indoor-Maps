import FeatureService from "../../services/featureService";
import ColorService, { colors } from "../../services/colorService";
import { UserGroupEnum } from "../../models/userGroupEnum";
import { extractLevels } from "../../utils/extractLevels";
import { isDrawableRoomOrArea, isVisibleIn3DMode } from "../../utils/drawableElementFilter";
import {
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

export function buildIndoorLevelRenderModel(options: IndoorLevelRenderBuilderOptions): IndoorLevelRenderModel {
  const rooms: RoomRenderItem[] = [];
  const tactilePaving: StyledFeatureRenderItem[] = [];
  const pointMarkerFeatures: GeoJSON.Feature[] = [];
  let infoPoint = undefined;

  options.geoJSON.features.forEach((feature) => {
    if (feature.properties["information"] == "tactile_map") {
      infoPoint = {
        feature,
        levels: extractLevels(feature.properties.level ?? options.infoPointLevel.toString()),
      };
    }

    if (isDrawableRoomOrArea(feature)) {
      rooms.push(buildRoomRenderItem(feature, options));
    } else if (feature.properties["tactile_paving"]) {
      tactilePaving.push({
        feature,
        style: buildTactilePavingStyle(feature),
      });
    } else if (feature.geometry.type == "Point") {
      pointMarkerFeatures.push(feature);
    }
  });

  return {
    outlineCoordinates: options.outlineCoordinates,
    infoPoint,
    rooms,
    tactilePaving,
    pointMarkerFeatures,
    staircase: {
      doorCoordinates: getDoorCoordinates(options.geoJSON),
      lowestPoints: options.buildingGeoJSON.features.filter(
        (feature) => "point:lowest" in feature.properties
      ),
      pathways: options.geoJSON.features.filter(
        (feature) =>
          "indoor" in feature.properties &&
          feature.properties["indoor"] == "pathway"
      ),
      allNodes: options.buildingGeoJSON.features.filter(
        (feature) => feature.geometry.type == "Point"
      ),
      simpleFeatures: getStaircaseFeatures(options.geoJSON, options, FeatureService.isSimpleStaircase),
      complexFeatures: getStaircaseFeatures(options.geoJSON, options, FeatureService.isComplexStaircase),
    },
  };
}

function buildRoomRenderItem(
  feature: GeoJSON.Feature,
  options: IndoorLevelRenderBuilderOptions
): RoomRenderItem {
  const isSelected = options.selectedFeatureIds.includes(feature.id.toString());

  return {
    feature,
    isSelected,
    isVisibleIn3D: isVisibleIn3DMode(feature, options.selectedFeatureIds),
    label: getRoomLabel(feature),
    style: isSelected ? buildSelectedFeatureStyle(feature, options.userProfile) : FeatureService.getFeatureStyle(feature),
    selectedPositionMarker: isSelected ? buildSelectedPositionMarker(feature, options) : undefined,
  };
}

function buildTactilePavingStyle(feature: GeoJSON.Feature): Record<string, unknown> {
  return {
    ...FeatureService.getFeatureStyle(feature),
    polygonOpacity: 0,
    lineDasharray: [10, 10],
  };
}

function buildSelectedFeatureStyle(feature: GeoJSON.Feature, userProfile: UserGroupEnum): Record<string, unknown> {
  let patternFill: string = null;

  if ("wheelchair" in feature.properties && feature.properties["wheelchair"] == "yes") {
    const lineWidth = FeatureService.getWallWeight(feature) + ColorService.getLineThickness() / 20;
    const size = lineWidth <= 2 ? "small" : (lineWidth <= 4 ? "medium" : "large");
    patternFill = "/images/pattern_fill/" + ColorService.getCurrentProfile() + "_" + size + "_roomColorS.png";
  }

  return {
    polygonFill: colors.roomColorS,
    polygonPatternFile: userProfile == UserGroupEnum.wheelchairUsers ? patternFill : null,
  };
}

function buildSelectedPositionMarker(
  feature: GeoJSON.Feature,
  options: IndoorLevelRenderBuilderOptions
): PositionMarkerRenderItem {
  const diff = options.level - options.infoPointLevel;
  const label = diff > 0 ? "+" + diff.toString() : diff.toString();

  if (
    Array.isArray(feature.properties["level"]) &&
    Math.min(...(feature.properties["level"] as number[]).map(level => Math.abs(level - options.infoPointLevel))).toString() != label
  ) {
    return undefined;
  }

  return {
    feature,
    label,
  };
}

function getRoomLabel(feature: GeoJSON.Feature): string {
  const {
    indoor,
    stairs,
    ref,
    name,
    handrail,
    amenity,
  } = feature.properties;

  const label = name || ref;

  if (label && indoor == "room" && !["toilets"].includes(amenity) && !handrail && !stairs) {
    return label;
  }

  return undefined;
}

function getDoorCoordinates(geoJSON: GeoJSON.FeatureCollection): GeoJSON.Position[] {
  return geoJSON.features
    .filter((feature) => "door" in feature.properties)
    .map((feature) => (feature.geometry as GeoJSON.Point).coordinates);
}

function getStaircaseFeatures(
  geoJSON: GeoJSON.FeatureCollection,
  options: IndoorLevelRenderBuilderOptions,
  isStaircaseType: (feature: GeoJSON.Feature) => boolean
): GeoJSON.Feature[] {
  return geoJSON.features.filter(feat =>
    isStaircaseType(feat) &&
    (
      !Array.isArray(feat.properties.level) ||
      Array.isArray(feat.properties.level) &&
      (feat.properties.level.at(-1) != options.level)
    )
  ).filter(feat =>
    options.userProfile != UserGroupEnum.wheelchairUsers ||
    (
      options.userProfile == UserGroupEnum.wheelchairUsers &&
      "wheelchair" in feat.properties && feat.properties["wheelchair"] == "yes"
    )
  );
}
