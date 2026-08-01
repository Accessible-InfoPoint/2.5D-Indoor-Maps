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

export class IndoorDoor extends IndoorElement {
  static collectFromGraph(graph: OsmGraph, diagnostics?: IndoorDiagnostics): IndoorDoor[] {
    return graph.elements
      .filter(isRawIndoorDoorElement)
      .map((node) => new IndoorDoor(graph, node, diagnostics));
  }

  constructor(
    graph: OsmGraph,
    readonly sourceElement: OverpassNode,
    diagnostics?: IndoorDiagnostics,
  ) {
    super(graph, sourceElement, diagnostics);
  }

  get coordinate(): GeoJSON.Position {
    return [this.sourceElement.lon, this.sourceElement.lat];
  }

  get geometry(): GeoJSON.Point {
    return {
      type: "Point",
      coordinates: this.coordinate,
    };
  }

  getConnectedRooms(rooms: IndoorRoom[]): IndoorRoom[] {
    return getRoomsContainingNode(this.graph, rooms, this.sourceElement.id);
  }

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
