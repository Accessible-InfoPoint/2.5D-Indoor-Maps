import { OverpassWay } from "../../models/overpassJson";
import { OsmGraph } from "../../overpass/OsmGraph";
import { nodeToPosition } from "../../utils/overpassJsonHelpers";
import { isRawIndoorTactilePavingElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

export class IndoorTactilePaving extends IndoorElement {
  static collectFromGraph(graph: OsmGraph): IndoorTactilePaving[] {
    return graph.elements
      .filter(isRawIndoorTactilePavingElement)
      .map((way) => new IndoorTactilePaving(graph, way));
  }

  constructor(
    graph: OsmGraph,
    readonly sourceElement: OverpassWay,
  ) {
    super(graph, sourceElement);
  }

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
