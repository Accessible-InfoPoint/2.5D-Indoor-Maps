import { OpeningRenderItem } from "../../components/indoorLevel/indoorLevelRenderModel";
import { OverpassNode, OverpassRelation, OverpassWay } from "../../models/overpassJson";
import { OsmGraph } from "../../overpass/OsmGraph";
import ColorService from "../../services/colorService";
import FeatureService from "../../services/featureService";
import { nodeToPosition } from "../../utils/overpassJsonHelpers";
import { parsePositiveMeters } from "../../utils/tagValueHelpers";
import { calculateOpeningOrientationGeometry } from "../openingOrientation";
import { isNeutralDoorColorRoomTags } from "../indoorTagFilters";
import { isRawIndoorDoorElement } from "../rawIndoorElementFilters";
import { IndoorRoom } from "./IndoorRoom";
import { IndoorElement } from "./IndoorElement";
import { IndoorWall } from "./IndoorWall";

export class IndoorDoor extends IndoorElement {
  private static readonly emittedWarnings = new Set<string>();

  static collectFromGraph(graph: OsmGraph): IndoorDoor[] {
    return graph.elements.filter(isRawIndoorDoorElement).map((node) => new IndoorDoor(graph, node));
  }

  constructor(
    graph: OsmGraph,
    readonly sourceElement: OverpassNode,
  ) {
    super(graph, sourceElement);
  }

  get coordinate(): GeoJSON.Position {
    return [this.sourceElement.lon, this.sourceElement.lat];
  }

  toGeoJsonFeature(): GeoJSON.Feature<GeoJSON.Point> {
    return {
      type: "Feature",
      id: this.id,
      properties: { ...this.tags },
      geometry: {
        type: "Point",
        coordinates: this.coordinate,
      },
    };
  }

  getConnectedRooms(rooms: IndoorRoom[]): IndoorRoom[] {
    return rooms.filter((room) => this.isPartOfRoom(room));
  }

  getConnectedWalls(walls: IndoorWall[]): IndoorWall[] {
    const connectedWalls = walls.filter((wall) => wall.includesNode(this.sourceElement.id));

    connectedWalls
      .filter((wall) => wall.isAreaWall)
      .forEach((wall) =>
        this.warnOnce(
          `area-wall-${wall.id}`,
          `Cannot connect door ${this.id} to area wall ${wall.id}: area walls are renderable areas, not pass-through wall lines.`,
        ),
      );

    return connectedWalls.filter((wall) => !wall.isAreaWall);
  }

  buildRenderItems(
    rooms: IndoorRoom[],
    walls: IndoorWall[],
    selectedFeatureIds: string[],
    fallbackWidthMeters?: number,
  ): OpeningRenderItem[] {
    const connectedRooms = this.getConnectedRooms(rooms);
    const connectedWalls = this.getConnectedWalls(walls);

    return buildOpeningRenderItemsForNode({
      kind: "door",
      graph: this.graph,
      nodeId: this.sourceElement.id,
      coordinate: this.coordinate,
      tags: this.tags,
      connectedRooms,
      connectedWalls,
      selectedFeatureIds,
      fallbackWidthMeters,
    });
  }

  private findContainingWay(room: IndoorRoom): OverpassWay | undefined {
    return findRoomWayContainingNode(this.graph, room, this.sourceElement.id);
  }

  private isPartOfRoom(room: IndoorRoom): boolean {
    return this.findContainingWay(room) !== undefined;
  }

  private warnOnce(code: string, message: string): void {
    const warningKey = `${this.id}:${code}`;

    if (IndoorDoor.emittedWarnings.has(warningKey)) {
      return;
    }

    IndoorDoor.emittedWarnings.add(warningKey);
    console.warn(`[IndoorDoor] ${message}`);
  }
}

interface DoorWayContext {
  previousNodeId: number;
  afterNodeId: number;
}

export function buildOpeningRenderItemsForNode(options: {
  kind: "door" | "opening";
  graph: OsmGraph;
  nodeId: number;
  coordinate: GeoJSON.Position;
  tags: Record<string, string>;
  connectedRooms: IndoorRoom[];
  connectedWalls: IndoorWall[];
  selectedFeatureIds: string[];
  fallbackWidthMeters?: number;
}): OpeningRenderItem[] {
  if (options.connectedRooms.length == 0 && options.connectedWalls.length == 0) {
    return [];
  }

  const orientationGeometry = calculateOpeningOrientation(options);

  if (orientationGeometry === undefined) {
    return [];
  }

  return [
    {
      kind: options.kind,
      coordinates: orientationGeometry.orientation,
      symbol: {
        lineColor: getDoorColor(options.connectedRooms, options.selectedFeatureIds),
        lineWidth: getDoorLineWidth(options.connectedWalls, options.connectedRooms),
      },
      debug: orientationGeometry.debug,
    },
  ];
}

export function getRoomsContainingNode(
  graph: OsmGraph,
  rooms: IndoorRoom[],
  nodeId: number,
): IndoorRoom[] {
  return rooms.filter((room) => findRoomWayContainingNode(graph, room, nodeId) !== undefined);
}

function calculateOpeningOrientation(options: {
  graph: OsmGraph;
  nodeId: number;
  coordinate: GeoJSON.Position;
  tags: Record<string, string>;
  connectedRooms: IndoorRoom[];
  connectedWalls: IndoorWall[];
  fallbackWidthMeters?: number;
}) {
  const wayContext = findWayContext(
    options.graph,
    options.nodeId,
    options.connectedRooms,
    options.connectedWalls,
  );

  if (wayContext === undefined) {
    console.warn(
      `[IndoorDoor] Cannot calculate orientation for opening at node/${options.nodeId}: no containing room or wall way was found.`,
    );
    return undefined;
  }

  const previousNode = options.graph.getNode(wayContext.previousNodeId);
  const afterNode = options.graph.getNode(wayContext.afterNodeId);

  if (previousNode === undefined || afterNode === undefined) {
    console.warn(
      `[IndoorDoor] Cannot calculate orientation for opening at node/${options.nodeId}: surrounding room nodes are missing.`,
    );
    return undefined;
  }

  return calculateOpeningOrientationGeometry(
    options.coordinate,
    nodeToPosition(previousNode),
    nodeToPosition(afterNode),
    getDoorWidth(options.tags, options.fallbackWidthMeters),
  );
}

function findWayContext(
  graph: OsmGraph,
  nodeId: number,
  rooms: IndoorRoom[],
  walls: IndoorWall[],
): DoorWayContext | undefined {
  for (const wall of walls) {
    const context = getDoorWayContext(wall.sourceElement, nodeId);

    if (context !== undefined) {
      return context;
    }
  }

  for (const room of rooms) {
    const way = findRoomWayContainingNode(graph, room, nodeId);

    if (way === undefined) {
      continue;
    }

    const context = getDoorWayContext(way, nodeId);

    if (context !== undefined) {
      return context;
    }
  }

  return undefined;
}

function getDoorWayContext(way: OverpassWay, doorNodeId: number): DoorWayContext | undefined {
  const isClosedWay = way.nodes.length > 2 && way.nodes[0] == way.nodes.at(-1);
  const nodeIndices = way.nodes
    .map((nodeId, index) => ({ nodeId, index }))
    .filter((entry) => entry.nodeId == doorNodeId)
    .map((entry) => entry.index);

  for (const nodeIndex of nodeIndices) {
    const previousNodeId = way.nodes[nodeIndex - 1] ?? (isClosedWay ? way.nodes.at(-2) : undefined);
    const afterNodeId = way.nodes[nodeIndex + 1] ?? (isClosedWay ? way.nodes[1] : undefined);

    if (previousNodeId === undefined || afterNodeId === undefined) {
      continue;
    }

    return {
      previousNodeId,
      afterNodeId,
    };
  }

  return undefined;
}

function findRoomWayContainingNode(
  graph: OsmGraph,
  room: IndoorRoom,
  nodeId: number,
): OverpassWay | undefined {
  if (room.sourceElement.type == "way" && room.sourceElement.nodes.includes(nodeId)) {
    return room.sourceElement;
  }

  if (room.sourceElement.type == "relation") {
    return findRelationWayContainingNode(graph, room.sourceElement, nodeId);
  }

  return undefined;
}

function findRelationWayContainingNode(
  graph: OsmGraph,
  relation: OverpassRelation,
  nodeId: number,
): OverpassWay | undefined {
  return relation.members
    .filter((member) => member.type == "way")
    .map((member) => graph.getWay(member.ref))
    .find((way) => way?.nodes.includes(nodeId));
}

function getDoorWidth(tags: Record<string, string>, fallbackWidthMeters?: number): number {
  return parsePositiveMeters(tags.width) ?? fallbackWidthMeters ?? 1;
}

function getDoorColor(connectedRooms: IndoorRoom[], selectedFeatureIds: string[]): string {
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

function getDoorLineWidth(connectedWalls: IndoorWall[], connectedRooms: IndoorRoom[]): number {
  if (connectedWalls.length > 0) {
    return FeatureService.getLineWidthFromTags(connectedWalls[0].tags);
  }

  if (connectedRooms.length > 0) {
    return FeatureService.getLineWidthFromTags(connectedRooms[0].tags);
  }

  return 1;
}
