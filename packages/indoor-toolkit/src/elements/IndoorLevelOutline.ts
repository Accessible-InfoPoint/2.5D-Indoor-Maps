import { OverpassElement } from "../models/overpassJson";
import { IndoorDiagnostics } from "../diagnostics";
import { OsmGraph } from "../overpass/OsmGraph";
import { getRelationAreaGeometry, getWayPolygonGeometry } from "../indoorAreaGeometry";
import { isRawIndoorLevelElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

export class IndoorLevelOutline extends IndoorElement {
  static collectFromGraph(graph: OsmGraph, diagnostics?: IndoorDiagnostics): IndoorLevelOutline[] {
    return graph.elements
      .filter(isRawIndoorLevelElement)
      .map((element) => new IndoorLevelOutline(graph, element, diagnostics));
  }

  constructor(graph: OsmGraph, sourceElement: OverpassElement, diagnostics?: IndoorDiagnostics) {
    super(graph, sourceElement, diagnostics);
  }

  get label(): string | undefined {
    return this.tags["level:ref"];
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
