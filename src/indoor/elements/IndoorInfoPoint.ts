import { OverpassNode } from "../../models/overpassJson";
import { OsmGraph } from "../../overpass/OsmGraph";
import { nodeToPosition } from "../../utils/overpassJsonHelpers";
import { isRawIndoorInfoPointElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

export class IndoorInfoPoint extends IndoorElement {
  static collectFromGraph(graph: OsmGraph): IndoorInfoPoint[] {
    return graph.elements
      .filter(isRawIndoorInfoPointElement)
      .map((node) => new IndoorInfoPoint(graph, node));
  }

  constructor(
    graph: OsmGraph,
    readonly sourceElement: OverpassNode,
  ) {
    super(graph, sourceElement);
  }

  toGeoJsonFeature(): GeoJSON.Feature<GeoJSON.Point> {
    return {
      type: "Feature",
      id: this.id,
      properties: { ...this.tags },
      geometry: {
        type: "Point",
        coordinates: nodeToPosition(this.sourceElement),
      },
    };
  }
}
