import { OverpassWay } from "../models/overpassJson";
import { IndoorDiagnostics } from "../diagnostics";
import { OsmGraph } from "../overpass/OsmGraph";
import { nodeToPosition } from "../utils/overpassJsonHelpers";
import { isRawIndoorTactilePavingElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

/**
 * Tactile paving line parsed from `indoor=yes + tactile_paving=yes`.
 */
export class IndoorTactilePaving extends IndoorElement {
  /** Collect all raw tactile paving ways from a graph. */
  static collectFromGraph(graph: OsmGraph, diagnostics?: IndoorDiagnostics): IndoorTactilePaving[] {
    return graph.elements
      .filter(isRawIndoorTactilePavingElement)
      .map((way) => new IndoorTactilePaving(graph, way, diagnostics));
  }

  constructor(
    graph: OsmGraph,
    readonly sourceElement: OverpassWay,
    diagnostics?: IndoorDiagnostics,
  ) {
    super(graph, sourceElement, diagnostics);
  }

  /** LineString geometry for the tactile paving way, if all way nodes are available. */
  get geometry(): GeoJSON.LineString | undefined {
    const missingNodeIds = this.graph.getMissingWayNodeIds(this.sourceElement);

    if (missingNodeIds.length > 0) {
      this.warnGeometryIssue(
        "missing-nodes",
        `Cannot build tactile paving geometry for ${this.id}: missing node(s) ${missingNodeIds.join(", ")}.`,
      );
      return undefined;
    }

    const coordinates = this.graph.getWayNodes(this.sourceElement).map(nodeToPosition);

    if (coordinates.length < 2) {
      this.warnGeometryIssue(
        "short-linestring",
        `Cannot build tactile paving geometry for ${this.id}: at least two coordinates are required.`,
      );
      return undefined;
    }

    return {
      type: "LineString",
      coordinates,
    };
  }
}
