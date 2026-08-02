import { OverpassElement } from "../models/overpassJson";
import { IndoorDiagnostics } from "../diagnostics";
import { OsmGraph } from "../overpass/OsmGraph";
import { getRelationAreaGeometry, getWayPolygonGeometry } from "../indoorAreaGeometry";
import { isRawIndoorRoomElement } from "../rawIndoorElementFilters";
import { isIndoorLandingElement } from "../stairLandingClassification";
import { IndoorElement } from "./IndoorElement";

/**
 * Room-like indoor area parsed from `indoor=room`, `indoor=corridor`, or `indoor=area`.
 *
 * The parser keeps rooms, corridors, open areas, toilets, and vertical
 * connection footprints in this shared class because they all describe
 * level-bound indoor areas. Stair landing areas are excluded, including
 * untagged `indoor=area` elements inferred as landings from stair path
 * topology. Callers can inspect `tags.indoor` and other tags to decide styling,
 * search categories, walkability, or routing behavior.
 */
export class IndoorRoom extends IndoorElement {
  /** Collect all raw room-like ways and relations from a graph. */
  static collectFromGraph(
    graph: OsmGraph,
    diagnostics?: IndoorDiagnostics,
    nonExistentLevels: number[] = [],
  ): IndoorRoom[] {
    return graph.elements
      .filter(
        (element) => isRawIndoorRoomElement(element) && !isIndoorLandingElement(graph, element),
      )
      .map((element) => new IndoorRoom(graph, element, diagnostics, nonExistentLevels));
  }

  constructor(
    graph: OsmGraph,
    sourceElement: OverpassElement,
    diagnostics?: IndoorDiagnostics,
    nonExistentLevels: number[] = [],
  ) {
    super(graph, sourceElement, diagnostics, { nonExistentLevels });
  }

  get indoorKind(): string | undefined {
    return this.tags.indoor;
  }

  /** Polygon or multipolygon geometry for the room-like area, if the raw geometry is complete. */
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
