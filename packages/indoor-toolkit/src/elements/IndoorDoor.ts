import { OverpassNode } from "../models/overpassJson";
import { IndoorDiagnostics } from "../diagnostics";
import { OsmGraph } from "../overpass/OsmGraph";
import { isRawIndoorDoorElement } from "../rawIndoorElementFilters";
import { IndoorRoom } from "./IndoorRoom";
import { IndoorElement } from "./IndoorElement";
import { IndoorWall } from "./IndoorWall";
import {
  buildIndoorOpeningForNode,
  getRoomsContainingNode,
  IndoorOpening,
  IndoorOpeningSource,
} from "./IndoorOpening";

/**
 * Explicit OSM door node.
 *
 * Doors become renderable or routable `IndoorOpening` objects only when their
 * node participates in connected room or wall geometry. The parser uses raw OSM
 * node membership instead of coordinate comparison.
 */
export class IndoorDoor extends IndoorElement {
  /** Collect all raw door nodes from a graph. */
  static collectFromGraph(
    graph: OsmGraph,
    diagnostics?: IndoorDiagnostics,
    nonExistentLevels: number[] = [],
  ): IndoorDoor[] {
    return graph.elements
      .filter(isRawIndoorDoorElement)
      .map((node) => new IndoorDoor(graph, node, diagnostics, nonExistentLevels));
  }

  constructor(
    graph: OsmGraph,
    readonly sourceElement: OverpassNode,
    diagnostics?: IndoorDiagnostics,
    nonExistentLevels: number[] = [],
  ) {
    super(graph, sourceElement, diagnostics, { nonExistentLevels });
  }

  get coordinate(): GeoJSON.Position {
    return [this.sourceElement.lon, this.sourceElement.lat];
  }

  /** Point geometry of the door node. */
  get geometry(): GeoJSON.Point {
    return {
      type: "Point",
      coordinates: this.coordinate,
    };
  }

  /** Return room-like elements whose raw boundary contains this door node. */
  getConnectedRooms(rooms: IndoorRoom[]): IndoorRoom[] {
    return getRoomsContainingNode(this.graph, rooms, this.sourceElement.id);
  }

  /**
   * Return line walls that contain this door node.
   *
   * Area walls are reported as diagnostics and excluded because they are solid
   * wall volumes, not pass-through wall lines.
   */
  getConnectedWalls(walls: IndoorWall[]): IndoorWall[] {
    const connectedWalls = walls.filter((wall) => wall.includesNode(this.sourceElement.id));

    connectedWalls
      .filter((wall) => wall.isAreaWall)
      .forEach((wall) =>
        this.diagnostics.warn({
          code: `IndoorDoor.area-wall-${wall.id}`,
          message: `Cannot connect door ${this.id} to area wall ${wall.id}: area walls are renderable areas, not pass-through wall lines.`,
          elementRef: this.ref,
          sourceElement: this.sourceElement,
        }),
      );

    return connectedWalls.filter((wall) => !wall.isAreaWall);
  }

  /**
   * Convert the door node into an `IndoorOpening` when enough context exists.
   *
   * `fallbackWidthMeters` is used when `width=*` is absent, for example when an
   * open staircase connection can infer the opening width from the stair path.
   */
  toOpening(
    rooms: IndoorRoom[],
    walls: IndoorWall[],
    fallbackWidthMeters?: number,
    levels = this.levels,
    additionalSources: IndoorOpeningSource[] = [],
  ): IndoorOpening | undefined {
    const connectedRooms = this.getConnectedRooms(rooms);
    const connectedWalls = this.getConnectedWalls(walls);

    return buildIndoorOpeningForNode({
      id: this.id,
      kind: "door",
      graph: this.graph,
      nodeId: this.sourceElement.id,
      coordinate: this.coordinate,
      tags: this.tags,
      levels,
      connectedRooms,
      connectedWalls,
      fallbackWidthMeters,
      sources: [{ role: "door", element: this.sourceElement }, ...additionalSources],
      diagnostics: this.diagnostics,
    });
  }
}
