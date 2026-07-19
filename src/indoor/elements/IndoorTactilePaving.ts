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

  toGeoJsonFeature(): GeoJSON.Feature<GeoJSON.LineString> | undefined {
    if (this.graph.getMissingWayNodeIds(this.sourceElement).length > 0) {
      return undefined;
    }

    const coordinates = this.graph.getWayNodes(this.sourceElement).map(nodeToPosition);

    if (coordinates.length < 2) {
      return undefined;
    }

    return {
      type: "Feature",
      id: this.id,
      properties: { ...this.tags },
      geometry: {
        type: "LineString",
        coordinates,
      },
    };
  }
}
