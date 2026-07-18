import { IndoorModel } from "../../indoor/IndoorModel";
import { IndoorRoom } from "../../indoor/elements/IndoorRoom";
import { UserGroupEnum } from "../../models/userGroupEnum";
import ColorService from "../../services/colorService";
import FeatureService from "../../services/featureService";
import { isVisibleIn3DMode } from "../../utils/drawableElementFilter";
import { getRequiredFeatureId, getRequiredFeatureProperties } from "../../utils/geoJsonHelpers";
import { DoorRenderItem, IndoorLevelRenderModel } from "./indoorLevelRenderModel";
import { PositionMarkerRenderItem, RoomRenderItem } from "./indoorLevelRenderModel";

interface RawIndoorLevelRenderBuilderOptions {
  model: IndoorModel;
  level: number;
  selectedFeatureIds: string[];
  infoPointLevel: number;
  userProfile: UserGroupEnum;
}

export function buildRawIndoorLevelRenderModel(
  options: RawIndoorLevelRenderBuilderOptions,
): IndoorLevelRenderModel {
  return {
    outlineCoordinates: options.model.outlineCoordinates,
    rooms: buildRoomRenderItems(options),
    doors: buildDoorRenderItems(options),
    tactilePaving: [],
    pointMarkerFeatures: [],
    staircase: {
      doorCoordinates: [],
      lowestPoints: [],
      pathways: [],
      allNodes: [],
      simpleFeatures: [],
      complexFeatures: [],
    },
  };
}

function buildDoorRenderItems(options: RawIndoorLevelRenderBuilderOptions): DoorRenderItem[] {
  const roomsOnLevel = options.model.rooms.filter((room) => room.hasLevel(options.level));

  return options.model.doors
    .filter((door) => door.levels.length == 0 || door.hasLevel(options.level))
    .flatMap((door) => door.buildRenderItems(roomsOnLevel, options.selectedFeatureIds));
}

function buildRoomRenderItems(options: RawIndoorLevelRenderBuilderOptions): RoomRenderItem[] {
  return options.model.rooms
    .filter((room) => room.hasLevel(options.level))
    .map((room) => buildRoomRenderItem(room, options))
    .filter((item): item is RoomRenderItem => item !== undefined);
}

function buildRoomRenderItem(
  room: IndoorRoom,
  options: RawIndoorLevelRenderBuilderOptions,
): RoomRenderItem | undefined {
  const feature = room.toGeoJsonFeature();

  if (feature === undefined) {
    return undefined;
  }

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

function buildSelectedFeatureStyle(
  feature: GeoJSON.Feature,
  userProfile: UserGroupEnum,
): Record<string, unknown> {
  const properties = getRequiredFeatureProperties(feature);
  let patternFill: string | null = null;

  if ("wheelchair" in properties && properties["wheelchair"] == "yes") {
    const lineWidth = FeatureService.getWallWeight(feature) + ColorService.getLineThickness() / 20;
    const size = lineWidth <= 2 ? "small" : lineWidth <= 4 ? "medium" : "large";
    patternFill =
      "/images/pattern_fill/" + ColorService.getCurrentProfile() + "_" + size + "_roomColorS.png";
  }

  return {
    ...FeatureService.getFeatureStyle(feature),
    polygonFill: ColorService.getCurrentColors().roomColorS,
    polygonPatternFile: userProfile == UserGroupEnum.wheelchairUsers ? patternFill : null,
  };
}

function buildSelectedPositionMarker(
  feature: GeoJSON.Feature,
  options: RawIndoorLevelRenderBuilderOptions,
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
  const { indoor, stairs, ref, name, handrail, amenity } = getRequiredFeatureProperties(feature);

  const label = name || ref;

  if (label && indoor == "room" && !["toilets"].includes(amenity) && !handrail && !stairs) {
    return label as string;
  }

  return undefined;
}
