import {
  IndoorColumn,
  IndoorHandrail,
  IndoorModel,
  IndoorOpening,
  IndoorPointFeature,
  IndoorRoom,
  IndoorTactilePaving,
  IndoorWall,
  isInfoPointTags,
  isNeutralDoorColorRoomTags,
  isRoomLabelEligibleTags,
} from "../../indoor";
import { createIndoorElementRef } from "../../indoor";
import { UserGroupEnum } from "../../models/userGroupEnum";
import ColorService from "../../services/colorService";
import FeatureService from "../../services/featureService";
import {
  buildRawStaircase2DOutlineRenderItems,
  buildRawStaircase2DRenderItems,
  buildRawStaircase3DRenderItems,
  hasVerticalConnectionHandrailTags,
  isHandrailAttachedToLandingInstance,
} from "../staircase/rawStaircaseRenderBuilder";
import {
  AccessibilityMarkerRenderItem,
  InfoPointRenderItem,
  IndoorLevelRenderModel,
  IndoorLevelOutlineGeometry,
  OpeningRenderItem,
  StyledFeatureRenderItem,
} from "./indoorLevelRenderModel";
import { PositionMarkerRenderItem, RoomRenderItem } from "./indoorLevelRenderModel";

interface IndoorLevelRenderBuilderOptions {
  model: IndoorModel;
  buildingOutlineGeometry: IndoorLevelOutlineGeometry;
  level: number;
  selectedFeatureIds: string[];
  infoPointLevel: number;
  userProfile: UserGroupEnum;
}

export function buildIndoorLevelRenderModel(
  options: IndoorLevelRenderBuilderOptions,
): IndoorLevelRenderModel {
  const rooms = [
    ...buildRoomRenderItems(options),
    ...buildRawStaircase2DRenderItems({
      verticalConnections: options.model.elements.verticalConnections,
      handrails: options.model.elements.handrails,
      stepAreas: options.model.elements.stepAreas,
      level: options.level,
      selectedFeatureIds: options.selectedFeatureIds,
    }),
  ];

  return {
    outlineGeometry: getOutlineGeometry(options),
    infoPoint: buildInfoPointRenderItem(options),
    rooms,
    openings: buildOpeningRenderItems(options),
    walls: buildWallRenderItems(options),
    tactilePaving: buildTactilePavingRenderItems(options),
    accessibilityMarkers: buildAccessibilityMarkerRenderItems(options),
    staircase: buildRawStaircase3DRenderItems({
      verticalConnections: options.model.elements.verticalConnections,
      handrails: options.model.elements.handrails,
      stepAreas: options.model.elements.stepAreas,
      level: options.level,
      selectedFeatureIds: options.selectedFeatureIds,
    }),
  };
}

function getOutlineGeometry(options: IndoorLevelRenderBuilderOptions): IndoorLevelOutlineGeometry {
  return (
    options.model.elements.levelOutlines.find((outline) => outline.hasLevel(options.level))
      ?.geometry ?? options.buildingOutlineGeometry
  );
}

function buildAccessibilityMarkerRenderItems(
  options: IndoorLevelRenderBuilderOptions,
): AccessibilityMarkerRenderItem[] {
  return [
    ...buildRoomAccessibilityMarkerRenderItems(options),
    ...buildPointFeatureAccessibilityMarkerRenderItems(options),
  ];
}

function buildRoomAccessibilityMarkerRenderItems(
  options: IndoorLevelRenderBuilderOptions,
): AccessibilityMarkerRenderItem[] {
  return options.model.elements.rooms
    .filter((room) => room.hasLevel(options.level))
    .map((room): AccessibilityMarkerRenderItem | undefined =>
      buildAccessibilityMarkerRenderItem(room, room.tags),
    )
    .filter((marker): marker is AccessibilityMarkerRenderItem => marker !== undefined);
}

function buildPointFeatureAccessibilityMarkerRenderItems(
  options: IndoorLevelRenderBuilderOptions,
): AccessibilityMarkerRenderItem[] {
  return options.model.elements.pointFeatures
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
  const feature = buildElementFeature(indoorElement, indoorElement.geometry);

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
    elementRef: createIndoorElementRef({
      id: indoorElement.id,
      tags,
      levels: indoorElement.levels,
      geometry: feature.geometry,
    }),
    sourceFeature: feature,
    markerData,
  };
}

function buildInfoPointRenderItem(
  options: IndoorLevelRenderBuilderOptions,
): InfoPointRenderItem | undefined {
  const infoPoint = options.model.elements.pointFeatures.find(
    (candidate) => isInfoPointTags(candidate.tags) && candidate.hasLevel(options.level),
  );

  if (infoPoint === undefined) {
    return undefined;
  }

  return buildInfoPointRenderItemFromElement(infoPoint);
}

function buildInfoPointRenderItemFromElement(
  infoPoint: IndoorPointFeature,
): InfoPointRenderItem | undefined {
  const feature = buildElementFeature(infoPoint, infoPoint.geometry);

  return {
    feature,
    elementRef: createIndoorElementRef({
      id: infoPoint.id,
      tags: infoPoint.tags,
      levels: infoPoint.levels,
      geometry: feature.geometry,
    }),
    levels: infoPoint.levels,
  };
}

function buildTactilePavingRenderItems(
  options: IndoorLevelRenderBuilderOptions,
): StyledFeatureRenderItem[] {
  return options.model.elements.tactilePaving
    .filter((tactilePaving) => tactilePaving.hasLevel(options.level))
    .map((tactilePaving): StyledFeatureRenderItem | undefined =>
      buildTactilePavingRenderItem(tactilePaving),
    )
    .filter((item): item is StyledFeatureRenderItem => item !== undefined);
}

function buildTactilePavingRenderItem(
  tactilePaving: IndoorTactilePaving,
): StyledFeatureRenderItem | undefined {
  const feature = buildElementFeature(tactilePaving, tactilePaving.geometry);

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

function buildWallRenderItems(options: IndoorLevelRenderBuilderOptions): StyledFeatureRenderItem[] {
  return [
    ...options.model.elements.walls
      .filter((wall) => wall.hasLevel(options.level))
      .map((wall): StyledFeatureRenderItem | undefined => buildWallRenderItem(wall)),
    ...options.model.elements.handrails
      .filter((handrail) => shouldRenderHandrailAsWall(handrail, options))
      .map((handrail): StyledFeatureRenderItem | undefined => buildHandrailRenderItem(handrail)),
    ...buildRawStaircase2DOutlineRenderItems({
      verticalConnections: options.model.elements.verticalConnections,
      handrails: options.model.elements.handrails,
      stepAreas: options.model.elements.stepAreas,
      level: options.level,
      selectedFeatureIds: options.selectedFeatureIds,
    }),
    ...options.model.elements.columns
      .filter((column) => column.hasLevel(options.level))
      .map((column): StyledFeatureRenderItem | undefined => buildColumnRenderItem(column)),
  ].filter((item): item is StyledFeatureRenderItem => item !== undefined);
}

function buildWallRenderItem(wall: IndoorWall): StyledFeatureRenderItem | undefined {
  const feature = buildElementFeature(wall, wall.geometry);

  if (feature === undefined) {
    return undefined;
  }

  return {
    feature,
    style: buildWallStyle(wall),
  };
}

function buildHandrailRenderItem(handrail: IndoorHandrail): StyledFeatureRenderItem | undefined {
  const feature = buildElementFeature(handrail, handrail.geometry);

  if (feature === undefined) {
    return undefined;
  }

  return {
    feature,
    style: buildHandrailStyle(handrail),
  };
}

function buildColumnRenderItem(column: IndoorColumn): StyledFeatureRenderItem | undefined {
  const feature = buildElementFeature(column, column.geometry);

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
  options: IndoorLevelRenderBuilderOptions,
): boolean {
  return (
    handrail.hasLevel(options.level) &&
    !options.model.stairPathNetwork.components
      .flatMap((component) => component.landingInstances)
      .some((landingInstance) => isHandrailAttachedToLandingInstance(handrail, landingInstance))
  );
}

function buildOpeningRenderItems(options: IndoorLevelRenderBuilderOptions): OpeningRenderItem[] {
  return options.model.elements.openings
    .filter((opening) => opening.levels.includes(options.level))
    .flatMap((opening) => openingToRenderItems(opening, options));
}

function openingToRenderItems(
  opening: IndoorOpening,
  options: IndoorLevelRenderBuilderOptions,
): OpeningRenderItem[] {
  const connectedRooms = opening.connectedRooms.filter((room) => room.hasLevel(options.level));
  const connectedWalls = opening.connectedWalls.filter((wall) => wall.hasLevel(options.level));

  return [
    {
      kind: opening.kind,
      coordinates: opening.orientationGeometry.orientation,
      symbol: {
        lineColor: getOpeningLineColor(connectedRooms, options.selectedFeatureIds),
        lineWidth: getOpeningLineWidth(connectedWalls, connectedRooms),
      },
      debug: opening.orientationGeometry.debug,
    },
  ];
}

function getOpeningLineColor(connectedRooms: IndoorRoom[], selectedFeatureIds: string[]): string {
  if (connectedRooms.some((room) => selectedFeatureIds.includes(room.id))) {
    return ColorService.getCurrentColors().roomColorS;
  }

  const nonCorridorRoom = connectedRooms.find((room) => !isNeutralDoorColorRoomTags(room.tags));

  if (connectedRooms.length == 0) {
    return "#ffffff";
  }

  return FeatureService.getIndoorFillStyleFromTags(nonCorridorRoom?.tags ?? connectedRooms[0].tags)
    .polygonFill;
}

function getOpeningLineWidth(connectedWalls: IndoorWall[], connectedRooms: IndoorRoom[]): number {
  if (connectedWalls.length > 0) {
    return FeatureService.getLineWidthFromTags(connectedWalls[0].tags);
  }

  if (connectedRooms.length > 0) {
    const implicitWallRoom =
      connectedRooms.find((room) => room.tags.indoor == "room") ?? connectedRooms[0];

    return FeatureService.getLineWidthFromTags(implicitWallRoom.tags);
  }

  return 1;
}

function buildRoomRenderItems(options: IndoorLevelRenderBuilderOptions): RoomRenderItem[] {
  return options.model.elements.rooms
    .filter((room) => room.hasLevel(options.level))
    .map((room) => buildRoomRenderItem(room, options))
    .filter((item): item is RoomRenderItem => item !== undefined);
}

function buildRoomRenderItem(
  room: IndoorRoom,
  options: IndoorLevelRenderBuilderOptions,
): RoomRenderItem | undefined {
  const feature = buildElementFeature(room, room.geometry);

  if (feature === undefined) {
    return undefined;
  }

  const isSelected = options.selectedFeatureIds.includes(room.id);

  return {
    feature,
    elementRef: createIndoorElementRef({
      id: room.id,
      tags: room.tags,
      levels: room.levels,
      geometry: feature.geometry,
    }),
    isSelected,
    isVisibleIn3D: isVisibleIn3DMode(room, options.selectedFeatureIds),
    label: getRoomLabel(room),
    style: buildRoomStyle(room, feature.geometry.type, isSelected, options),
    selectedPositionMarker: isSelected
      ? buildSelectedPositionMarker(feature, room, options)
      : undefined,
  };
}

function buildRoomStyle(
  room: IndoorRoom,
  geometryType: GeoJSON.Geometry["type"],
  isSelected: boolean,
  options: IndoorLevelRenderBuilderOptions,
): Record<string, unknown> {
  const style = isSelected
    ? buildSelectedFeatureStyle(room, options.userProfile)
    : FeatureService.getFeatureStyleFromTags(room.tags, geometryType);

  return shouldSuppressOpenStaircaseFootprintOutline(room, options)
    ? {
        ...style,
        lineWidth: 0,
      }
    : style;
}

function shouldSuppressOpenStaircaseFootprintOutline(
  room: IndoorRoom,
  options: IndoorLevelRenderBuilderOptions,
): boolean {
  const connection = options.model.elements.verticalConnections.find(
    (candidate) => candidate.kind == "open" && candidate.footprint?.id == room.id,
  );

  return connection !== undefined && !hasVerticalConnectionHandrailTags(connection);
}

function buildSelectedFeatureStyle(
  room: IndoorRoom,
  userProfile: UserGroupEnum,
): Record<string, unknown> {
  return FeatureService.getSelectedRoomStyleFromTags(room.tags, userProfile);
}

function buildSelectedPositionMarker(
  feature: GeoJSON.Feature,
  room: IndoorRoom,
  options: IndoorLevelRenderBuilderOptions,
): PositionMarkerRenderItem | undefined {
  const diff = options.level - options.infoPointLevel;
  const label = diff > 0 ? "+" + diff.toString() : diff.toString();

  if (
    room.levels.length > 0 &&
    Math.min(...room.levels.map((level) => Math.abs(level - options.infoPointLevel))) !=
      Math.abs(diff)
  ) {
    return undefined;
  }

  return {
    feature,
    label,
  };
}

function isVisibleIn3DMode(room: IndoorRoom, selectedFeatureIds: string[] = []): boolean {
  return (
    room.tags.indoor == "corridor" ||
    room.tags.indoor == "area" ||
    room.tags.highway == "elevator" ||
    room.tags.stairs == "yes" ||
    selectedFeatureIds.includes(room.id)
  );
}

function getRoomLabel(room: IndoorRoom): string | undefined {
  const label = room.tags.name || room.tags.ref;

  if (typeof label == "string" && isRoomLabelEligibleTags(room.tags)) {
    return label;
  }

  return undefined;
}

function buildElementFeature<TGeometry extends GeoJSON.Geometry>(
  element: { id: string; tags: Record<string, string> },
  geometry: TGeometry | undefined,
): GeoJSON.Feature<TGeometry> | undefined {
  if (geometry === undefined) {
    return undefined;
  }

  return {
    type: "Feature",
    id: element.id,
    properties: { ...element.tags },
    geometry,
  };
}
