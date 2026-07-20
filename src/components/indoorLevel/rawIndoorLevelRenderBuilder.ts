import { IndoorModel } from "../../indoor/IndoorModel";
import {
  buildOpeningRenderItemsForNode,
  getRoomsContainingNode,
} from "../../indoor/elements/IndoorDoor";
import { IndoorColumn } from "../../indoor/elements/IndoorColumn";
import { IndoorHandrail } from "../../indoor/elements/IndoorHandrail";
import { IndoorInfoPoint } from "../../indoor/elements/IndoorInfoPoint";
import { IndoorPointFeature } from "../../indoor/elements/IndoorPointFeature";
import { IndoorRoom } from "../../indoor/elements/IndoorRoom";
import { IndoorTactilePaving } from "../../indoor/elements/IndoorTactilePaving";
import { IndoorWall } from "../../indoor/elements/IndoorWall";
import { isRoomLabelEligibleTags } from "../../indoor/indoorTagFilters";
import { getRawElementNodeIds } from "../../indoor/rawElementNodeIds";
import { IndoorStairPathwayInstance } from "../../indoor/verticalConnections/IndoorStairPathNetwork";
import { IndoorVerticalConnection } from "../../indoor/verticalConnections/IndoorVerticalConnection";
import { UserGroupEnum } from "../../models/userGroupEnum";
import FeatureService from "../../services/featureService";
import { isVisibleIn3DMode } from "../../utils/drawableElementFilter";
import { getRequiredFeatureId, getRequiredFeatureProperties } from "../../utils/geoJsonHelpers";
import { nodeToPosition } from "../../utils/overpassJsonHelpers";
import {
  buildRawStaircase2DOutlineRenderItems,
  buildRawStaircase2DRenderItems,
  buildRawStaircase3DRenderItems,
  getInterpolatedPathLevels,
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
    outlineGeometry: getOutlineGeometry(options),
    infoPoint: buildInfoPointRenderItem(options),
    rooms,
    openings: buildOpeningRenderItems(options),
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

function getOutlineGeometry(
  options: RawIndoorLevelRenderBuilderOptions,
): IndoorLevelOutlineGeometry {
  return (
    options.model.levelOutlines.find((outline) => outline.hasLevel(options.level))?.geometry ?? {
      type: "Polygon",
      coordinates: [options.model.outlineCoordinates],
    }
  );
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
    ...buildRawStaircase2DOutlineRenderItems({
      verticalConnections: options.model.verticalConnections,
      handrails: options.model.handrails,
      level: options.level,
      selectedFeatureIds: options.selectedFeatureIds,
    }),
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

function buildOpeningRenderItems(options: RawIndoorLevelRenderBuilderOptions): OpeningRenderItem[] {
  const roomsOnLevel = options.model.rooms.filter((room) => room.hasLevel(options.level));
  const wallsOnLevel = options.model.walls.filter((wall) => wall.hasLevel(options.level));
  const staircaseOpenings = collectOpenStaircaseOpeningNodes(options, roomsOnLevel);
  const staircaseWidthByNodeId = buildStaircaseWidthByNodeId(staircaseOpenings);
  const explicitDoorNodeIds = new Set(
    options.model.doors
      .filter((door) => door.hasLevel(options.level))
      .map((door) => door.sourceElement.id),
  );

  return [
    ...options.model.doors
      .filter((door) => door.hasLevel(options.level))
      .flatMap((door) =>
        door.buildRenderItems(
          roomsOnLevel,
          wallsOnLevel,
          options.selectedFeatureIds,
          staircaseWidthByNodeId.get(door.sourceElement.id),
        ),
      ),
    ...staircaseOpenings
      .filter((opening) => !explicitDoorNodeIds.has(opening.nodeId))
      .flatMap((opening) => buildGeneratedOpeningRenderItems(opening, options, roomsOnLevel)),
  ];
}

interface OpenStaircaseOpeningNode {
  nodeId: number;
  widthMeters: number;
  footprint: IndoorRoom;
}

function collectOpenStaircaseOpeningNodes(
  options: RawIndoorLevelRenderBuilderOptions,
  roomsOnLevel: IndoorRoom[],
): OpenStaircaseOpeningNode[] {
  const openingsByKey = new Map<string, OpenStaircaseOpeningNode>();

  options.model.verticalConnections
    .filter(
      (connection): connection is IndoorVerticalConnection & { footprint: IndoorRoom } =>
        connection.kind == "open" &&
        connection.footprint !== undefined &&
        connection.footprint.hasLevel(options.level),
    )
    .forEach((connection) => {
      const footprintNodeIds = new Set(
        getRawElementNodeIds(options.model.graphs.indoor, connection.footprint.sourceElement),
      );

      connection.pathComponents.forEach((component) =>
        component.pathwayInstances.forEach((pathwayInstance) => {
          collectPathwayOpeningNodes(
            pathwayInstance,
            footprintNodeIds,
            options.level,
            connection.footprint,
          ).forEach((opening) => {
            const key = `${opening.footprint.id}:${opening.nodeId}`;
            const previous = openingsByKey.get(key);

            openingsByKey.set(key, {
              ...opening,
              widthMeters: Math.max(previous?.widthMeters ?? 0, opening.widthMeters),
            });
          });
        }),
      );
    });

  return Array.from(openingsByKey.values()).filter((opening) =>
    getRoomsContainingNode(options.model.graphs.indoor, roomsOnLevel, opening.nodeId).some(
      (room) => room.id == opening.footprint.id,
    ),
  );
}

function collectPathwayOpeningNodes(
  pathwayInstance: IndoorStairPathwayInstance,
  footprintNodeIds: Set<number>,
  level: number,
  footprint: IndoorRoom,
): OpenStaircaseOpeningNode[] {
  const geometry = pathwayInstance.source.toLineStringGeometry();

  if (geometry === undefined) {
    return [];
  }

  const pathLevels = getInterpolatedPathLevels(geometry.coordinates, pathwayInstance);

  return pathwayInstance.nodeIds
    .map((nodeId, index): OpenStaircaseOpeningNode | undefined =>
      footprintNodeIds.has(nodeId) && isSameLevel(pathLevels[index], level)
        ? {
            nodeId,
            widthMeters: pathwayInstance.source.widthMeters,
            footprint,
          }
        : undefined,
    )
    .filter((opening): opening is OpenStaircaseOpeningNode => opening !== undefined);
}

function buildStaircaseWidthByNodeId(openings: OpenStaircaseOpeningNode[]): Map<number, number> {
  const widthByNodeId = new Map<number, number>();

  openings.forEach((opening) =>
    widthByNodeId.set(
      opening.nodeId,
      Math.max(widthByNodeId.get(opening.nodeId) ?? 0, opening.widthMeters),
    ),
  );

  return widthByNodeId;
}

function buildGeneratedOpeningRenderItems(
  opening: OpenStaircaseOpeningNode,
  options: RawIndoorLevelRenderBuilderOptions,
  roomsOnLevel: IndoorRoom[],
): OpeningRenderItem[] {
  const node = options.model.graphs.indoor.getNode(opening.nodeId);

  if (node === undefined) {
    return [];
  }

  const connectedRooms = getRoomsContainingNode(
    options.model.graphs.indoor,
    roomsOnLevel,
    opening.nodeId,
  );

  return buildOpeningRenderItemsForNode({
    kind: "opening",
    graph: options.model.graphs.indoor,
    nodeId: opening.nodeId,
    coordinate: nodeToPosition(node),
    tags: {},
    connectedRooms: [
      opening.footprint,
      ...connectedRooms.filter((room) => room.id != opening.footprint.id),
    ],
    connectedWalls: [],
    selectedFeatureIds: options.selectedFeatureIds,
    fallbackWidthMeters: opening.widthMeters,
  });
}

function isSameLevel(a: number | undefined, b: number): boolean {
  return a !== undefined && Math.abs(a - b) < 0.000001;
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
    style: buildRoomStyle(room, feature.geometry.type, isSelected, options),
    selectedPositionMarker: isSelected ? buildSelectedPositionMarker(feature, options) : undefined,
  };
}

function buildRoomStyle(
  room: IndoorRoom,
  geometryType: GeoJSON.Geometry["type"],
  isSelected: boolean,
  options: RawIndoorLevelRenderBuilderOptions,
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
  options: RawIndoorLevelRenderBuilderOptions,
): boolean {
  const connection = options.model.verticalConnections.find(
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
