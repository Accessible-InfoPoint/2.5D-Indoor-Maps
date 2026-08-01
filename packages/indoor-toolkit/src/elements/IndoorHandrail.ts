import { OverpassWay } from "../models/overpassJson";
import { IndoorDiagnostics } from "../diagnostics";
import { OsmGraph } from "../overpass/OsmGraph";
import { nodeToPosition } from "../utils/overpassJsonHelpers";
import { isRawIndoorHandrailElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

/**
 * Standalone handrail line parsed from `barrier=handrail`.
 *
 * Applications can render these directly or associate them with stair landings
 * when they share enough raw nodes.
 */
export class IndoorHandrail extends IndoorElement {
  /** Collect all raw handrail ways from a graph. */
  static collectFromGraph(graph: OsmGraph, diagnostics?: IndoorDiagnostics): IndoorHandrail[] {
    return graph.elements
      .filter(isRawIndoorHandrailElement)
      .map((way) => new IndoorHandrail(graph, way, diagnostics));
  }

  constructor(
    graph: OsmGraph,
    readonly sourceElement: OverpassWay,
    diagnostics?: IndoorDiagnostics,
  ) {
    super(graph, sourceElement, diagnostics);
  }

  /** Raw node ids of the handrail way in authored order. */
  get nodeIds(): number[] {
    return [...this.sourceElement.nodes];
  }

  /** Return whether this handrail shares at least two nodes with another element. */
  sharesAtLeastTwoNodes(nodeIds: Iterable<number>): boolean {
    const otherNodeIds = new Set(nodeIds);
    let sharedNodeCount = 0;

    for (const nodeId of this.sourceElement.nodes) {
      if (otherNodeIds.has(nodeId)) {
        sharedNodeCount++;
      }

      if (sharedNodeCount >= 2) {
        return true;
      }
    }

    return false;
  }

  /** LineString geometry for the handrail, if all way nodes are available. */
  get geometry(): GeoJSON.LineString | undefined {
    return this.toLineStringGeometry();
  }

  /** Build the handrail LineString and emit diagnostics for missing or too-short geometry. */
  toLineStringGeometry(): GeoJSON.LineString | undefined {
    const missingNodeIds = this.graph.getMissingWayNodeIds(this.sourceElement);

    if (missingNodeIds.length > 0) {
      this.warnGeometryIssue(
        "missing-nodes",
        `Cannot build handrail geometry for ${this.id}: missing node(s) ${missingNodeIds.join(", ")}.`,
      );
      return undefined;
    }

    const coordinates = this.graph.getWayNodes(this.sourceElement).map(nodeToPosition);

    if (coordinates.length < 2) {
      this.warnGeometryIssue(
        "short-linestring",
        `Cannot build handrail geometry for ${this.id}: at least two coordinates are required.`,
      );
      return undefined;
    }

    return {
      type: "LineString",
      coordinates,
    };
  }
}
