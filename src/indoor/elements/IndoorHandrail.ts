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

  toLineStringGeometry(): GeoJSON.LineString | undefined {
    if (this.graph.getMissingWayNodeIds(this.sourceElement).length > 0) {
      return undefined;
    }

    const coordinates = this.graph.getWayNodes(this.sourceElement).map(nodeToPosition);

    if (coordinates.length < 2) {
      return undefined;
    }

    return {
      type: "LineString",
      coordinates,
    };
  }

  toGeoJsonFeature(): GeoJSON.Feature<GeoJSON.LineString> | undefined {
    const geometry = this.toLineStringGeometry();

    if (geometry === undefined) {
      return undefined;
    }

    return {
      type: "Feature",
      id: this.id,
      properties: { ...this.tags },
      geometry,
    };
  }
}
