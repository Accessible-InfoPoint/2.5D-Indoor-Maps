import { OverpassElement } from "../models/overpassJson";
import { IndoorDiagnostics } from "../diagnostics";
import { OsmGraph } from "../overpass/OsmGraph";
import { getRelationAreaGeometry, getWayPolygonGeometry } from "../indoorAreaGeometry";
import { isRawIndoorLevelElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

/**
 * Explicit floor plate geometry parsed from `indoor=level`.
 *
 * Level outlines can provide full per-level geometry and display labels through
 * `level:ref=*`, while keeping numeric `level=*` values for internal logic.
 */
export class IndoorLevelOutline extends IndoorElement {
  /** Collect all raw level outline ways and relations from a graph. */
  static collectFromGraph(
    graph: OsmGraph,
    diagnostics?: IndoorDiagnostics,
    nonExistentLevels: number[] = [],
  ): IndoorLevelOutline[] {
    return graph.elements
      .filter(isRawIndoorLevelElement)
      .map((element) => new IndoorLevelOutline(graph, element, diagnostics, nonExistentLevels));
  }

  constructor(
    graph: OsmGraph,
    sourceElement: OverpassElement,
    diagnostics?: IndoorDiagnostics,
    nonExistentLevels: number[] = [],
  ) {
    super(graph, sourceElement, diagnostics, { nonExistentLevels });
  }

  /** Optional level selector/display label from `level:ref=*`. */
  get label(): string | undefined {
    return this.tags["level:ref"];
  }

  /**
   * Numeric levels described by this explicit floor plate.
   *
   * Unlike repeated room-like elements, a level outline is literal geometry for
   * the tagged `level=*`; `repeat_on=*` would imply copying floor-plate geometry
   * and labels across levels, which is not meaningful for `indoor=level`.
   */
  override get levels(): number[] {
    return this.extractLevelsFromTag("level");
  }

  /** Polygon or multipolygon geometry for the level outline. */
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
          `Cannot build level outline geometry for ${this.id}: indoor=level must be mapped as a way or relation, not a node.`,
        );
        return undefined;
    }
  }

  private getAreaGeometryOptions() {
    return {
      graph: this.graph,
      elementId: this.id,
      elementKind: "level outline",
      warningPrefix: "IndoorLevelOutline",
      emittedWarnings: this.emittedGeometryWarnings,
      diagnostics: this.diagnostics,
      elementRef: this.ref,
      sourceElement: this.sourceElement,
    };
  }
}
