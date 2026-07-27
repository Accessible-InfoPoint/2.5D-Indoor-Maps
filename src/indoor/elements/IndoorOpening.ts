import { OverpassElement, OverpassRelation, OverpassWay } from "../../models/overpassJson";
import { OsmGraph } from "../../overpass/OsmGraph";
import { nodeToPosition } from "../../utils/overpassJsonHelpers";
import { parsePositiveMeters } from "../../utils/tagValueHelpers";
import {
  calculateOpeningOrientationGeometry,
  OpeningOrientationGeometry,
} from "../openingOrientation";
import { IndoorRoom } from "./IndoorRoom";
import { IndoorWall } from "./IndoorWall";

export type IndoorOpeningKind = "door" | "opening";

export type IndoorOpeningSourceRole = "door" | "pathway-node" | "pathway" | "footprint" | "wall";

export interface IndoorOpeningSource {
  role: IndoorOpeningSourceRole;
  element: OverpassElement;
}

export interface IndoorOpening {
  id: string;
  kind: IndoorOpeningKind;
  nodeId: number;
  coordinate: GeoJSON.Position;
  tags: Record<string, string>;
  levels: number[];
  widthMeters: number;
  connectedRooms: IndoorRoom[];
  connectedWalls: IndoorWall[];
  sources: IndoorOpeningSource[];
  orientationGeometry: OpeningOrientationGeometry;
}

interface DoorWayContext {
  previousNodeId: number;
  afterNodeId: number;
}

export function buildIndoorOpeningForNode(options: {
  id: string;
  kind: IndoorOpeningKind;
  graph: OsmGraph;
  nodeId: number;
  coordinate: GeoJSON.Position;
  tags: Record<string, string>;
  levels: number[];
  connectedRooms: IndoorRoom[];
  connectedWalls: IndoorWall[];
  sources: IndoorOpeningSource[];
  fallbackWidthMeters?: number;
}): IndoorOpening | undefined {
  if (options.connectedRooms.length == 0 && options.connectedWalls.length == 0) {
    return undefined;
  }

  const widthMeters = getOpeningWidth(options.tags, options.fallbackWidthMeters);
  const orientationGeometry = calculateOpeningOrientation({
    ...options,
    widthMeters,
  });

  if (orientationGeometry === undefined) {
    return undefined;
  }

  return {
    id: options.id,
    kind: options.kind,
    nodeId: options.nodeId,
    coordinate: options.coordinate,
    tags: { ...options.tags },
    levels: [...options.levels],
    widthMeters,
    connectedRooms: options.connectedRooms,
    connectedWalls: options.connectedWalls,
    sources: [
      ...options.sources,
      ...options.connectedWalls.map((wall): IndoorOpeningSource => ({
        role: "wall",
        element: wall.sourceElement,
      })),
    ],
    orientationGeometry,
  };
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
  connectedRooms: IndoorRoom[];
  connectedWalls: IndoorWall[];
  widthMeters: number;
}) {
  const wayContext = findWayContext(
    options.graph,
    options.nodeId,
    options.connectedRooms,
    options.connectedWalls,
  );

  if (wayContext === undefined) {
    console.warn(
      `[IndoorOpening] Cannot calculate orientation for opening at node/${options.nodeId}: no containing room or wall way was found.`,
    );
    return undefined;
  }

  const previousNode = options.graph.getNode(wayContext.previousNodeId);
  const afterNode = options.graph.getNode(wayContext.afterNodeId);

  if (previousNode === undefined || afterNode === undefined) {
    console.warn(
      `[IndoorOpening] Cannot calculate orientation for opening at node/${options.nodeId}: surrounding room nodes are missing.`,
    );
    return undefined;
  }

  return calculateOpeningOrientationGeometry(
    options.coordinate,
    nodeToPosition(previousNode),
    nodeToPosition(afterNode),
    options.widthMeters,
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

function getOpeningWidth(tags: Record<string, string>, fallbackWidthMeters?: number): number {
  return parsePositiveMeters(tags.width) ?? fallbackWidthMeters ?? 1;
}
