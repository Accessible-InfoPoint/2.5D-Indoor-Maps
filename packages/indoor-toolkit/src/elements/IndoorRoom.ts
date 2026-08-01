import { OverpassElement } from "../models/overpassJson";
import { IndoorDiagnostics } from "../diagnostics";
import { OsmGraph } from "../overpass/OsmGraph";
import { getRelationAreaGeometry, getWayPolygonGeometry } from "../indoorAreaGeometry";
import { isRawIndoorRoomElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

/**
 * Handles all rooms and areas:
 * - regular rooms
 * - corridor
 * - area (e.g. foyer)
 * - special rooms (toilets, staircases)
 * - this does not handle 3D visualizations of staircases and 2D stairs (which are different from staircases: LINK) # TODO
 *
 * Styling of elements is done in indoorLevelRenderBuilder.ts
 */
export class IndoorRoom extends IndoorElement {
  static collectFromGraph(graph: OsmGraph, diagnostics?: IndoorDiagnostics): IndoorRoom[] {
    return graph.elements
      .filter(isRawIndoorRoomElement)
      .map((element) => new IndoorRoom(graph, element, diagnostics));
  }

  constructor(graph: OsmGraph, sourceElement: OverpassElement, diagnostics?: IndoorDiagnostics) {
    super(graph, sourceElement, diagnostics);
  }

  get indoorKind(): string | undefined {
    return this.tags.indoor;
  }

  get geometry(): GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined {
    return this.toGeometry();
  }

  private toGeometry(): GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined {
    switch (this.sourceElement.type) {
      case "way":
        return getWayPolygonGeometry(this.sourceElement, this.getAreaGeometryOptions());
      case "relation":
        return getRelationAreaGeometry(this.sourceElement, this.getAreaGeometryOptions());
      case "node":
        this.warnGeometryIssue(
          "node-geometry",
          `Cannot build room geometry for ${this.id}: rooms must be mapped as ways or relations, not nodes.`,
        );
        return undefined;
    }
  }

  private getAreaGeometryOptions() {
    return {
      graph: this.graph,
      elementId: this.id,
      elementKind: "room",
      warningPrefix: "IndoorRoom",
      emittedWarnings: this.emittedGeometryWarnings,
      diagnostics: this.diagnostics,
      elementRef: this.ref,
      sourceElement: this.sourceElement,
    };
  }
}
