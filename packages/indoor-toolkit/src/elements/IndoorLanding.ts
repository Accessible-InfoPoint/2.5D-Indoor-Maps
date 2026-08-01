import { OverpassRelation, OverpassWay } from "../models/overpassJson";
import { IndoorDiagnostics } from "../diagnostics";
import { OsmGraph } from "../overpass/OsmGraph";
import { getRelationAreaGeometry, getWayPolygonGeometry } from "../indoorAreaGeometry";
import { getRawElementNodeIds } from "../rawElementNodeIds";
import { isIndoorLandingElement } from "../stairLandingClassification";
import { IndoorElement } from "./IndoorElement";

/**
 * Stair landing area parsed from explicit `landing=yes` tags or inferred from
 * an `indoor=area` that connects only to stair pathways.
 *
 * Landings are stair components rather than normal rooms. They can connect stair
 * pathway instances when their level lies on a pathway span boundary.
 */
export class IndoorLanding extends IndoorElement {
  /** Collect all raw stair landing ways and relations from a graph. */
  static collectFromGraph(graph: OsmGraph, diagnostics?: IndoorDiagnostics): IndoorLanding[] {
    return graph.elements
      .filter((element) => isIndoorLandingElement(graph, element, diagnostics))
      .map((element) => new IndoorLanding(graph, element, diagnostics));
  }

  constructor(
    graph: OsmGraph,
    readonly sourceElement: OverpassWay | OverpassRelation,
    diagnostics?: IndoorDiagnostics,
  ) {
    super(graph, sourceElement, diagnostics);
  }

  /** Node ids that make up the landing geometry, resolved through ways or relation members. */
  get nodeIds(): number[] {
    return getRawElementNodeIds(this.graph, this.sourceElement);
  }

  /** Levels authored directly on `level=*`. */
  get authoredLevels(): number[] {
    return this.extractLevelsFromTag("level");
  }

  /** Repeated landing levels from `repeat_on=*`. */
  get repeatLevels(): number[] {
    return this.extractLevelsFromTag("repeat_on");
  }

  /** Direct repeat offsets from `repeat_on_offset=*`. */
  get repeatOffsetValues(): number[] {
    return this.extractLevelsFromTag("repeat_on_offset");
  }

  /** Polygon or multipolygon geometry for the landing area. */
  get geometry(): GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined {
    return this.toAreaGeometry();
  }

  /** Build landing area geometry from a way or relation. */
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
      elementKind: "landing",
      warningPrefix: "IndoorLanding",
      emittedWarnings: this.emittedGeometryWarnings,
      diagnostics: this.diagnostics,
      elementRef: this.ref,
      sourceElement: this.sourceElement,
    };
  }
}
