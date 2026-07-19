import { IndoorModel } from "../../indoor/IndoorModel";
import { IndoorColumn } from "../../indoor/elements/IndoorColumn";
import { IndoorHandrail } from "../../indoor/elements/IndoorHandrail";
import { IndoorInfoPoint } from "../../indoor/elements/IndoorInfoPoint";
import { IndoorPointFeature } from "../../indoor/elements/IndoorPointFeature";
import { IndoorRoom } from "../../indoor/elements/IndoorRoom";
import { IndoorTactilePaving } from "../../indoor/elements/IndoorTactilePaving";
import { IndoorWall } from "../../indoor/elements/IndoorWall";
import { isRoomLabelEligibleTags } from "../../indoor/indoorTagFilters";
import { UserGroupEnum } from "../../models/userGroupEnum";
import FeatureService from "../../services/featureService";
import { isVisibleIn3DMode } from "../../utils/drawableElementFilter";
import { getRequiredFeatureId, getRequiredFeatureProperties } from "../../utils/geoJsonHelpers";
import {
  buildRawStaircase2DRenderItems,
  buildRawStaircase3DRenderItems,
  isHandrailAttachedToLandingInstance,
} from "../staircase/rawStaircaseRenderBuilder";
import {
  AccessibilityMarkerRenderItem,
  DoorRenderItem,
  InfoPointRenderItem,
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
  const rooms = [
    ...buildRoomRenderItems(options),
    ...buildRawStaircase2DRenderItems({
      verticalConnections: options.model.verticalConnections,
      handrails: options.model.handrails,
      level: options.level,
      selectedFeatureIds: options.selectedFeatureIds,
    }),
  ];

  return {
    outlineCoordinates: options.model.outlineCoordinates,
    infoPoint: buildInfoPointRenderItem(options),
    rooms,
    doors: buildDoorRenderItems(options),
    walls: buildWallRenderItems(options),
    tactilePaving: buildTactilePavingRenderItems(options),
    accessibilityMarkers: buildAccessibilityMarkerRenderItems(options),
    staircase: {
      renderItems: buildRawStaircase3DRenderItems({
        verticalConnections: options.model.verticalConnections,
        handrails: options.model.handrails,
        level: options.level,
        selectedFeatureIds: options.selectedFeatureIds,
      }),
      doorCoordinates: [],
      lowestPoints: [],
      pathways: [],
      allNodes: [],
      simpleFeatures: [],
      complexFeatures: [],
    },
  };
}

function buildAccessibilityMarkerRenderItems(
  options: RawIndoorLevelRenderBuilderOptions,
): AccessibilityMarkerRenderItem[] {
  return [
    ...buildRoomAccessibilityMarkerRenderItems(options),
    ...buildPointFeatureAccessibilityMarkerRenderItems(options),
  ];
}

function buildRoomAccessibilityMarkerRenderItems(
  options: RawIndoorLevelRenderBuilderOptions,
): AccessibilityMarkerRenderItem[] {
  return options.model.rooms
    .filter((room) => room.hasLevel(options.level))
    .map((room): AccessibilityMarkerRenderItem | undefined =>
      buildAccessibilityMarkerRenderItem(room, room.tags),
    )
    .filter((marker): marker is AccessibilityMarkerRenderItem => marker !== undefined);
}

function buildPointFeatureAccessibilityMarkerRenderItems(
  options: RawIndoorLevelRenderBuilderOptions,
): AccessibilityMarkerRenderItem[] {
  return options.model.pointFeatures
    .filter((pointFeature) => pointFeature.hasLevel(options.level))
    .map((pointFeature): AccessibilityMarkerRenderItem | undefined =>
      buildAccessibilityMarkerRenderItem(pointFeature, pointFeature.tags),
    )
    .filter((marker): marker is AccessibilityMarkerRenderItem => marker !== undefined);
}

function buildAccessibilityMarkerRenderItem(
  indoorElement: IndoorRoom | IndoorPointFeature,
  tags: Record<string, string>,
): AccessibilityMarkerRenderItem | undefined {
  const feature = indoorElement.toGeoJsonFeature();

  if (feature === undefined) {
    return undefined;
  }

  const coordinates = FeatureService.getMarkerCoordinatesFromGeometry(feature.geometry);

  if (coordinates === undefined) {
    return undefined;
  }

  const markerData = FeatureService.getAccessibilityMarkerDataFromTags(tags, coordinates);

  if (markerData === null) {
    return undefined;
  }

  return {
    id: indoorElement.id,
    sourceFeature: feature,
    markerData,
  };
}

function buildInfoPointRenderItem(
  options: RawIndoorLevelRenderBuilderOptions,
): InfoPointRenderItem | undefined {
  const infoPoint = options.model.infoPoints.find((candidate) => candidate.hasLevel(options.level));

  if (infoPoint === undefined) {
    return undefined;
  }

  return buildInfoPointRenderItemFromElement(infoPoint);
}

function buildInfoPointRenderItemFromElement(
  infoPoint: IndoorInfoPoint,
): InfoPointRenderItem | undefined {
  const feature = infoPoint.toGeoJsonFeature();

  return {
    feature,
    levels: infoPoint.levels,
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
  return [
    ...options.model.walls
      .filter((wall) => wall.hasLevel(options.level))
      .map((wall): StyledFeatureRenderItem | undefined => buildWallRenderItem(wall)),
    ...options.model.handrails
      .filter((handrail) => shouldRenderHandrailAsWall(handrail, options))
      .map((handrail): StyledFeatureRenderItem | undefined => buildHandrailRenderItem(handrail)),
    ...options.model.columns
      .filter((column) => column.hasLevel(options.level))
      .map((column): StyledFeatureRenderItem | undefined => buildColumnRenderItem(column)),
  ].filter((item): item is StyledFeatureRenderItem => item !== undefined);
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

function buildHandrailRenderItem(handrail: IndoorHandrail): StyledFeatureRenderItem | undefined {
  const feature = handrail.toGeoJsonFeature();

  if (feature === undefined) {
    return undefined;
  }

  return {
    feature,
    style: buildHandrailStyle(handrail),
  };
}

function buildColumnRenderItem(column: IndoorColumn): StyledFeatureRenderItem | undefined {
  const feature = column.toGeoJsonFeature();

  if (feature === undefined) {
    return undefined;
  }

  return {
    feature,
    style: buildColumnStyle(column),
  };
}

function buildWallStyle(wall: IndoorWall): Record<string, unknown> {
  return FeatureService.getWallStyleFromTags(wall.tags);
}

function buildHandrailStyle(handrail: IndoorHandrail): Record<string, unknown> {
  return FeatureService.getHandrailStyleFromTags(handrail.tags);
}

function buildColumnStyle(column: IndoorColumn): Record<string, unknown> {
  return FeatureService.getColumnStyleFromTags(column.tags);
}

function shouldRenderHandrailAsWall(
  handrail: IndoorHandrail,
  options: RawIndoorLevelRenderBuilderOptions,
): boolean {
  return (
    handrail.hasLevel(options.level) &&
    !options.model.stairPathNetwork.components
      .flatMap((component) => component.landingInstances)
      .some((landingInstance) => isHandrailAttachedToLandingInstance(handrail, landingInstance))
  );
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
