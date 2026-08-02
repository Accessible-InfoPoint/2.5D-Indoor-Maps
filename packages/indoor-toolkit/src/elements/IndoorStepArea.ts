import { OverpassRelation, OverpassWay } from "../models/overpassJson";
import { IndoorDiagnostics } from "../diagnostics";
import { OsmGraph } from "../overpass/OsmGraph";
import { getRelationAreaGeometry, getWayPolygonGeometry } from "../indoorAreaGeometry";
import { getRawElementNodeIds } from "../rawElementNodeIds";
import { isRawIndoorStepAreaElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

/**
 * `area:highway=steps` area used by downstream stair tooling.
 *
 * Step areas are not rooms or vertical connections by themselves. Renderers or
 * routing tools can use their geometry to infer stair width or footprint shape.
 */
export class IndoorStepArea extends IndoorElement {
  /** Collect all raw step area ways and relations from a graph. */
  static collectFromGraph(
    graph: OsmGraph,
    diagnostics?: IndoorDiagnostics,
    nonExistentLevels: number[] = [],
  ): IndoorStepArea[] {
    return graph.elements
      .filter(isRawIndoorStepAreaElement)
      .map((element) => new IndoorStepArea(graph, element, diagnostics, nonExistentLevels));
  }

  constructor(
    graph: OsmGraph,
    readonly sourceElement: OverpassWay | OverpassRelation,
    diagnostics?: IndoorDiagnostics,
    nonExistentLevels: number[] = [],
  ) {
    super(graph, sourceElement, diagnostics, { nonExistentLevels });
  }

  /** Node ids that make up the step area geometry, resolved through ways or relation members. */
  get nodeIds(): number[] {
    return getRawElementNodeIds(this.graph, this.sourceElement);
  }

  /** Polygon or multipolygon geometry for the step area. */
  get geometry(): GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined {
    return this.toAreaGeometry();
  }

  /** Build step area geometry from a way or relation. */
  toAreaGeometry(): GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined {
    switch (this.sourceElement.type) {
      case "way":
        return getWayPolygonGeometry(this.sourceElement, this.getAreaGeometryOptions());
      case "relation":
        return getRelationAreaGeometry(this.sourceElement, this.getAreaGeometryOptions());
    }
  }

  private getAreaGeometryOptions() {
    return {
      graph: this.graph,
      elementId: this.id,
      elementKind: "step area",
      warningPrefix: "IndoorStepArea",
      emittedWarnings: this.emittedGeometryWarnings,
      diagnostics: this.diagnostics,
      elementRef: this.ref,
      sourceElement: this.sourceElement,
    };
  }
}
