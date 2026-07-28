import { OverpassWay } from "../../models/overpassJson";
import { OsmGraph } from "../../overpass/OsmGraph";
import { nodeToPosition } from "../../utils/overpassJsonHelpers";
import { isRawIndoorHandrailElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

export class IndoorHandrail extends IndoorElement {
  static collectFromGraph(graph: OsmGraph): IndoorHandrail[] {
    return graph.elements
      .filter(isRawIndoorHandrailElement)
      .map((way) => new IndoorHandrail(graph, way));
  }

  constructor(
    graph: OsmGraph,
    readonly sourceElement: OverpassWay,
  ) {
    super(graph, sourceElement);
  }

  get nodeIds(): number[] {
    return [...this.sourceElement.nodes];
  }

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

  get geometry(): GeoJSON.LineString | undefined {
    return this.toLineStringGeometry();
  }

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
