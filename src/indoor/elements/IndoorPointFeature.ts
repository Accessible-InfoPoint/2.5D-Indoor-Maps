import { OverpassNode } from "../../models/overpassJson";
import { OsmGraph } from "../../overpass/OsmGraph";
import { nodeToPosition } from "../../utils/overpassJsonHelpers";
import { isRawIndoorPointFeatureElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

export class IndoorPointFeature extends IndoorElement {
  static collectFromGraph(graph: OsmGraph): IndoorPointFeature[] {
    return graph.elements
      .filter(isRawIndoorPointFeatureElement)
      .map((node) => new IndoorPointFeature(graph, node));
  }

  constructor(
    graph: OsmGraph,
    readonly sourceElement: OverpassNode,
  ) {
    super(graph, sourceElement);
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
