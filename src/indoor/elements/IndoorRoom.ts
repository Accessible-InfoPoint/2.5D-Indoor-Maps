import { OverpassElement, OverpassNode, OverpassWay } from "../../models/overpassJson";
import { OsmGraph } from "../../overpass/OsmGraph";
import { isRawIndoorRoomElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

/**
 * Handles all rooms and areas:
 * - regular rooms
 * - corridor
 * - area (e.g. foyer)
 * - special rooms (toilets, staircases)
 * - this does not handle 3D visualizations of staircases and 2D stairs (which are different from staircases: LINK) # TODO
 *
 * Styling of elements is done in rawIndoorLevelRenderBuilder.ts
 */
export class IndoorRoom extends IndoorElement {
  static collectFromGraph(graph: OsmGraph): IndoorRoom[] {
    return graph.elements
      .filter(isRawIndoorRoomElement)
      .map((element) => new IndoorRoom(graph, element));
  }

  constructor(graph: OsmGraph, sourceElement: OverpassElement) {
    super(graph, sourceElement);
  }

  get indoorKind(): string | undefined {
    return this.tags.indoor;
  }

  toGeoJsonFeature(): GeoJSON.Feature<GeoJSON.Polygon> | undefined {
    if (this.sourceElement.type != "way") {
      return undefined;
    }

    const ring = this.getWayRing(this.sourceElement);

    if (ring === undefined) {
      return undefined;
    }

    return {
      type: "Feature",
      id: this.id,
      properties: { ...this.tags },
      geometry: {
        type: "Polygon",
        coordinates: [ring],
      },
    };
  }

  private getWayRing(way: OverpassWay): GeoJSON.Position[] | undefined {
    if (this.graph.getMissingWayNodeIds(way).length > 0) {
      return undefined;
    }

    const nodes = this.graph.getWayNodes(way);

    if (nodes.length < 3) {
      return undefined;
    }

    const ring = nodes.map(nodeToPosition);
    const first = ring[0];
    const last = ring.at(-1);

    if (first === undefined || last === undefined) {
      return undefined;
    }

    if (first[0] != last[0] || first[1] != last[1]) {
      ring.push([...first]);
    }

    return ring;
  }
}

function nodeToPosition(node: OverpassNode): GeoJSON.Position {
  return [node.lon, node.lat];
}
