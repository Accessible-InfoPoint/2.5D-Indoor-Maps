import { OverpassNode } from "../models/overpassJson";
import { IndoorDiagnostics } from "../diagnostics";
import { OsmGraph } from "../overpass/OsmGraph";
import { nodeToPosition } from "../utils/overpassJsonHelpers";
import { isRawIndoorPointFeatureElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

/**
 * Point-like indoor feature for information, accessibility, entrance, stair, and category tags.
 *
 * The parser does not decide whether a point feature becomes an application
 * marker. Applications can filter `model.elements.pointFeatures` by tags.
 */
export class IndoorPointFeature extends IndoorElement {
  /** Collect all raw point feature nodes from a graph. */
  static collectFromGraph(
    graph: OsmGraph,
    diagnostics?: IndoorDiagnostics,
    nonExistentLevels: number[] = [],
  ): IndoorPointFeature[] {
    return graph.elements
      .filter(isRawIndoorPointFeatureElement)
      .map((node) => new IndoorPointFeature(graph, node, diagnostics, nonExistentLevels));
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
    return nodeToPosition(this.sourceElement);
  }

  /** Point geometry of the source node. */
  get geometry(): GeoJSON.Point {
    return {
      type: "Point",
      coordinates: this.coordinate,
    };
  }
}
