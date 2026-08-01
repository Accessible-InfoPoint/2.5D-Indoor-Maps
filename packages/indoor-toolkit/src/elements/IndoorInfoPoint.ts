import { OverpassNode } from "../models/overpassJson";
import { IndoorDiagnostics } from "../diagnostics";
import { OsmGraph } from "../overpass/OsmGraph";
import { nodeToPosition } from "../utils/overpassJsonHelpers";
import { isRawIndoorInfoPointElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

export class IndoorInfoPoint extends IndoorElement {
  static collectFromGraph(graph: OsmGraph, diagnostics?: IndoorDiagnostics): IndoorInfoPoint[] {
    return graph.elements
      .filter(isRawIndoorInfoPointElement)
      .map((node) => new IndoorInfoPoint(graph, node, diagnostics));
  }

  constructor(
    graph: OsmGraph,
    readonly sourceElement: OverpassNode,
    diagnostics?: IndoorDiagnostics,
  ) {
    super(graph, sourceElement, diagnostics);
  }

  get coordinate(): GeoJSON.Position {
    return nodeToPosition(this.sourceElement);
  }

  get geometry(): GeoJSON.Point {
    return {
      type: "Point",
      coordinates: this.coordinate,
    };
  }
}
