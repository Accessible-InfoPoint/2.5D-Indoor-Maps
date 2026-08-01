import { getRoomsContainingNode } from "./elements/IndoorOpening";
import { IndoorOpening } from "./elements/IndoorOpening";
import { IndoorRoom } from "./elements/IndoorRoom";
import { IndoorWall } from "./elements/IndoorWall";
import { IndoorElementRegistry } from "./IndoorElementRegistry";
import { OsmGraph } from "./overpass/OsmGraph";
import {
  IndoorVerticalConnection,
  IndoorVerticalConnectionKind,
} from "./verticalConnections/IndoorVerticalConnection";
import { VerticalSpan } from "./verticalConnections/VerticalSpan";

export interface IndoorRoomConnection {
  /** Opening through which the rooms are connected. */
  opening: IndoorOpening;
  /** Deduplicated rooms connected by the opening. */
  rooms: IndoorRoom[];
}

/**
 * Relationship helpers derived from raw OSM membership and parsed indoor semantics.
 *
 * This is intentionally not a routing graph. Routing tools can use these facts
 * to decide how to create nodes, edges, costs, restrictions, or review tasks.
 */
export class IndoorTopology {
  constructor(
    private readonly graph: OsmGraph,
    private readonly elements: IndoorElementRegistry,
  ) {}

  /** Return all openings that connect to the given room id. */
  getOpeningsForRoom(roomId: string): IndoorOpening[] {
    return this.elements.openings.filter((opening) =>
      opening.connectedRooms.some((room) => room.id == roomId),
    );
  }

  /** Return rooms connected to an opening id. */
  getRoomsForOpening(openingId: string): IndoorRoom[] {
    return this.elements.openings.find((opening) => opening.id == openingId)?.connectedRooms ?? [];
  }

  /** Return rooms reachable from `roomId` through one shared opening. */
  getConnectedRooms(roomId: string): IndoorRoom[] {
    const roomsById = new Map<string, IndoorRoom>();

    this.getOpeningsForRoom(roomId).forEach((opening) =>
      opening.connectedRooms
        .filter((room) => room.id != roomId)
        .forEach((room) => roomsById.set(room.id, room)),
    );

    return Array.from(roomsById.values());
  }

  /** Return every opening that connects at least two deduplicated rooms. */
  getConnectedRoomPairs(): IndoorRoomConnection[] {
    return this.elements.openings
      .map((opening) => ({
        opening,
        rooms: deduplicateRooms(opening.connectedRooms),
      }))
      .filter((connection) => connection.rooms.length >= 2);
  }

  /** Return room-like areas whose raw boundary contains `nodeId`, optionally filtered by level. */
  getRoomsAtNode(nodeId: number, level?: number): IndoorRoom[] {
    return getRoomsContainingNode(
      this.graph,
      this.elements.rooms.filter((room) => level === undefined || room.hasLevel(level)),
      nodeId,
    );
  }

  /** Return wall ways whose raw node list contains `nodeId`, optionally filtered by level. */
  getWallsAtNode(nodeId: number, level?: number): IndoorWall[] {
    return this.elements.walls.filter(
      (wall) => (level === undefined || wall.hasLevel(level)) && wall.includesNode(nodeId),
    );
  }

  /** Return vertical connections touching a level, optionally restricted to one connection kind. */
  getVerticalConnectionsForLevel(
    level: number,
    kind?: IndoorVerticalConnectionKind,
  ): IndoorVerticalConnection[] {
    return this.elements.verticalConnections.filter(
      (connection) =>
        (kind === undefined || connection.kind == kind) &&
        verticalConnectionHasLevel(connection, level),
    );
  }

  /** Return vertical connections that include an exact pathway span from one level to another. */
  getVerticalConnectionsBetweenLevels(from: number, to: number): IndoorVerticalConnection[] {
    return this.elements.verticalConnections.filter((connection) =>
      getVerticalConnectionSpans(connection).some((span) => span.from == from && span.to == to),
    );
  }
}

function deduplicateRooms(rooms: IndoorRoom[]): IndoorRoom[] {
  return Array.from(new Map(rooms.map((room) => [room.id, room])).values());
}

function verticalConnectionHasLevel(connection: IndoorVerticalConnection, level: number): boolean {
  return (
    connection.footprint?.hasLevel(level) == true ||
    getVerticalConnectionSpans(connection).some((span) => level >= span.from && level <= span.to)
  );
}

function getVerticalConnectionSpans(connection: IndoorVerticalConnection): VerticalSpan[] {
  return connection.pathComponents.flatMap((component) =>
    component.pathwayInstances.map((pathway) => pathway.span),
  );
}
