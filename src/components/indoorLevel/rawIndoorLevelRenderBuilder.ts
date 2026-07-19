import { IndoorModel } from "../../indoor/IndoorModel";
import { IndoorRoom } from "../../indoor/elements/IndoorRoom";
import { IndoorTactilePaving } from "../../indoor/elements/IndoorTactilePaving";
import { IndoorWall } from "../../indoor/elements/IndoorWall";
import { isRoomLabelEligibleTags } from "../../indoor/indoorTagFilters";
import { UserGroupEnum } from "../../models/userGroupEnum";
import FeatureService from "../../services/featureService";
import { isVisibleIn3DMode } from "../../utils/drawableElementFilter";
import { getRequiredFeatureId, getRequiredFeatureProperties } from "../../utils/geoJsonHelpers";
import {
  DoorRenderItem,
  IndoorLevelRenderModel,
  StyledFeatureRenderItem,
} from "./indoorLevelRenderModel";
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
    walls: buildWallRenderItems(options),
    tactilePaving: buildTactilePavingRenderItems(options),
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

function buildTactilePavingRenderItems(
  options: RawIndoorLevelRenderBuilderOptions,
): StyledFeatureRenderItem[] {
  return options.model.tactilePaving
    .filter((tactilePaving) => tactilePaving.hasLevel(options.level))
    .map((tactilePaving): StyledFeatureRenderItem | undefined =>
      buildTactilePavingRenderItem(tactilePaving),
    )
    .filter((item): item is StyledFeatureRenderItem => item !== undefined);
}

function buildTactilePavingRenderItem(
  tactilePaving: IndoorTactilePaving,
): StyledFeatureRenderItem | undefined {
  const feature = tactilePaving.toGeoJsonFeature();

  if (feature === undefined) {
    return undefined;
  }

  return {
    feature,
    style: buildTactilePavingStyle(tactilePaving),
  };
}

function buildTactilePavingStyle(tactilePaving: IndoorTactilePaving): Record<string, unknown> {
  return FeatureService.getTactilePavingStyleFromTags(tactilePaving.tags);
}

function buildWallRenderItems(
  options: RawIndoorLevelRenderBuilderOptions,
): StyledFeatureRenderItem[] {
  return options.model.walls
    .filter((wall) => wall.hasLevel(options.level))
    .map((wall): StyledFeatureRenderItem | undefined => buildWallRenderItem(wall))
    .filter((item): item is StyledFeatureRenderItem => item !== undefined);
}

function buildWallRenderItem(wall: IndoorWall): StyledFeatureRenderItem | undefined {
  const feature = wall.toGeoJsonFeature();

  if (feature === undefined) {
    return undefined;
  }

  return {
    feature,
    style: buildWallStyle(wall),
  };
}

function buildWallStyle(wall: IndoorWall): Record<string, unknown> {
  return FeatureService.getWallStyleFromTags(wall.tags);
}

function buildDoorRenderItems(options: RawIndoorLevelRenderBuilderOptions): DoorRenderItem[] {
  const roomsOnLevel = options.model.rooms.filter((room) => room.hasLevel(options.level));
  const wallsOnLevel = options.model.walls.filter((wall) => wall.hasLevel(options.level));

  return options.model.doors
    .filter((door) => door.hasLevel(options.level))
    .flatMap((door) =>
      door.buildRenderItems(roomsOnLevel, wallsOnLevel, options.selectedFeatureIds),
    );
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
    label: getRoomLabel(room),
    style: isSelected
      ? buildSelectedFeatureStyle(room, options.userProfile)
      : FeatureService.getFeatureStyleFromTags(room.tags, feature.geometry.type),
    selectedPositionMarker: isSelected ? buildSelectedPositionMarker(feature, options) : undefined,
  };
}

function buildSelectedFeatureStyle(
  room: IndoorRoom,
  userProfile: UserGroupEnum,
): Record<string, unknown> {
  return FeatureService.getSelectedRoomStyleFromTags(room.tags, userProfile);
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

function getRoomLabel(room: IndoorRoom): string | undefined {
  const label = room.tags.name || room.tags.ref;

  if (typeof label == "string" && isRoomLabelEligibleTags(room.tags)) {
    return label;
  }

  return undefined;
}
