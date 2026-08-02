import { OverpassElement, OverpassRelation, OverpassWay } from "../models/overpassJson";
import { IndoorDiagnostics } from "../diagnostics";
import { createIndoorElementRef } from "../models/indoorElementRef";
import { OsmGraph } from "../overpass/OsmGraph";
import { nodeToPosition } from "../utils/overpassJsonHelpers";
import { parsePositiveMeters } from "../utils/tagValueHelpers";
import {
  IndoorLandingInstance,
  IndoorStairPathwayInstance,
} from "../verticalConnections/IndoorStairPathNetwork";
import {
  calculateOpeningOrientationGeometry,
  OpeningOrientationGeometry,
} from "../openingOrientation";
import { IndoorRoom } from "./IndoorRoom";
import { IndoorWall } from "./IndoorWall";

export type IndoorOpeningKind = "door" | "opening" | "pathway-landing";

export type IndoorOpeningSourceRole =
  "door" | "pathway-node" | "pathway" | "footprint" | "landing" | "wall";

/** Raw OSM source contributing to an `IndoorOpening`. */
export interface IndoorOpeningSource {
  /** Role the source element played in deriving the opening. */
  role: IndoorOpeningSourceRole;
  /** Raw OSM element used as evidence for the opening. */
  element: OverpassElement;
}

/**
 * Pass-through connection at a node.
 *
 * Openings can come from explicit door nodes or be inferred from stair topology.
 * Door and footprint openings carry room and wall context for rendering.
 * Pathway/landing openings are non-rendered topology facts for routing and
 * similar downstream tools.
 */
export interface IndoorOpening {
  /** Stable opening id. Explicit doors reuse the door id. */
  id: string;
  /** `door` for explicit door nodes, `opening` or `pathway-landing` for inferred pass-through connections. */
  kind: IndoorOpeningKind;
  /** OSM node id where the opening is located. */
  nodeId: number;
  /** Opening coordinate as `[lon, lat]`. */
  coordinate: GeoJSON.Position;
  /** Source tags from the explicit door, or empty tags for inferred openings. */
  tags: Record<string, string>;
  /** Levels where this opening is usable. */
  levels: number[];
  /** Opening width in meters. */
  widthMeters: number;
  /** Room-like areas connected by this opening. */
  connectedRooms: IndoorRoom[];
  /** Line walls that provide wall context for this opening. */
  connectedWalls: IndoorWall[];
  /** Stair pathway instances connected by this opening, when it is stair-topology-only. */
  connectedPathwayInstances: IndoorStairPathwayInstance[];
  /** Stair landing instances connected by this opening, when it is stair-topology-only. */
  connectedLandingInstances: IndoorLandingInstance[];
  /** Raw OSM source elements used to derive this opening. */
  sources: IndoorOpeningSource[];
  /** Geometry derived from surrounding wall or room nodes for renderable openings. */
  orientationGeometry?: OpeningOrientationGeometry;
}

interface DoorWayContext {
  previousNodeId: number;
  afterNodeId: number;
}

/**
 * Build an opening from a node and already resolved room/wall context.
 *
 * Returns `undefined` and records a diagnostic when no usable context or
 * orientation can be derived.
 */
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
  diagnostics?: IndoorDiagnostics;
}): IndoorOpening | undefined {
  if (options.connectedRooms.length == 0 && options.connectedWalls.length == 0) {
    warnOpeningIssue(
      options.diagnostics,
      options.id,
      options.tags,
      options.levels,
      "no-connected-room-or-wall",
      `Cannot build ${options.kind} ${options.id} at node/${options.nodeId}: no connected room or wall was found.`,
    );
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
    connectedPathwayInstances: [],
    connectedLandingInstances: [],
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

/** Return rooms whose raw boundary contains the given node id. */
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
  diagnostics?: IndoorDiagnostics;
  id: string;
  tags: Record<string, string>;
  levels: number[];
}) {
  const wayContext = findWayContext(
    options.graph,
    options.nodeId,
    options.connectedRooms,
    options.connectedWalls,
  );

  if (wayContext === undefined) {
    warnOpeningIssue(
      options.diagnostics,
      options.id,
      options.tags,
      options.levels,
      "missing-containing-way",
      `Cannot calculate orientation for opening at node/${options.nodeId}: no containing room or wall way was found.`,
    );
    return undefined;
  }

  const previousNode = options.graph.getNode(wayContext.previousNodeId);
  const afterNode = options.graph.getNode(wayContext.afterNodeId);

  if (previousNode === undefined || afterNode === undefined) {
    warnOpeningIssue(
      options.diagnostics,
      options.id,
      options.tags,
      options.levels,
      "missing-surrounding-nodes",
      `Cannot calculate orientation for opening at node/${options.nodeId}: surrounding room nodes are missing.`,
    );
    return undefined;
  }

  return calculateOpeningOrientationGeometry(
    options.coordinate,
    nodeToPosition(previousNode),
    nodeToPosition(afterNode),
    options.widthMeters,
    options.diagnostics,
    createIndoorElementRef({
      id: options.id,
      tags: options.tags,
      levels: options.levels,
    }),
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

function warnOpeningIssue(
  diagnostics: IndoorDiagnostics | undefined,
  id: string,
  tags: Record<string, string>,
  levels: number[],
  code: string,
  message: string,
): void {
  if (diagnostics === undefined) {
    console.warn(`[IndoorOpening] ${message}`);
    return;
  }

  diagnostics.warn({
    code: `IndoorOpening.${code}`,
    message,
    elementRef: createIndoorElementRef({
      id,
      tags,
      levels,
    }),
  });
}
