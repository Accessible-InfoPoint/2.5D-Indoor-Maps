import { OverpassWay } from "../../models/overpassJson";
import { OsmGraph } from "../../overpass/OsmGraph";
import { nodeToPosition } from "../../utils/overpassJsonHelpers";
import { isRawIndoorWallElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

export class IndoorWall extends IndoorElement {
  static collectFromGraph(graph: OsmGraph): IndoorWall[] {
    return graph.elements.filter(isRawIndoorWallElement).map((way) => new IndoorWall(graph, way));
  }

  constructor(
    graph: OsmGraph,
    readonly sourceElement: OverpassWay,
  ) {
    super(graph, sourceElement);
  }

  includesNode(nodeId: number): boolean {
    return this.sourceElement.nodes.includes(nodeId);
  }

  get isAreaWall(): boolean {
    return this.tags.area == "yes";
  }

  toGeoJsonFeature(): GeoJSON.Feature<GeoJSON.LineString | GeoJSON.Polygon> | undefined {
    if (this.graph.getMissingWayNodeIds(this.sourceElement).length > 0) {
      return undefined;
    }

    const coordinates = this.graph.getWayNodes(this.sourceElement).map(nodeToPosition);

    if (this.isAreaWall) {
      return this.toPolygonFeature(coordinates);
    }

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

  private toPolygonFeature(
    coordinates: GeoJSON.Position[],
  ): GeoJSON.Feature<GeoJSON.Polygon> | undefined {
    if (coordinates.length < 3) {
      return undefined;
    }

    const ring = closeRing(coordinates);

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
}

function closeRing(coordinates: GeoJSON.Position[]): GeoJSON.Position[] {
  const ring = [...coordinates];
  const first = ring[0];
  const last = ring.at(-1);

  if (first !== undefined && last !== undefined && (first[0] != last[0] || first[1] != last[1])) {
    ring.push([...first]);
  }

  return ring;
}
