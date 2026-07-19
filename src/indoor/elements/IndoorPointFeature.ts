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
