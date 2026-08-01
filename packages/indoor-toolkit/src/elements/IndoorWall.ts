import { OverpassWay } from "../models/overpassJson";
import { IndoorDiagnostics } from "../diagnostics";
import { OsmGraph } from "../overpass/OsmGraph";
import { nodeToPosition } from "../utils/overpassJsonHelpers";
import { isRawIndoorWallElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

export class IndoorWall extends IndoorElement {
  static collectFromGraph(graph: OsmGraph, diagnostics?: IndoorDiagnostics): IndoorWall[] {
    return graph.elements
      .filter(isRawIndoorWallElement)
      .map((way) => new IndoorWall(graph, way, diagnostics));
  }

  constructor(
    graph: OsmGraph,
    readonly sourceElement: OverpassWay,
    diagnostics?: IndoorDiagnostics,
  ) {
    super(graph, sourceElement, diagnostics);
  }

  includesNode(nodeId: number): boolean {
    return this.sourceElement.nodes.includes(nodeId);
  }

  get isAreaWall(): boolean {
    return this.tags.area == "yes";
  }

  get geometry(): GeoJSON.LineString | GeoJSON.Polygon | undefined {
    const missingNodeIds = this.graph.getMissingWayNodeIds(this.sourceElement);

    if (missingNodeIds.length > 0) {
      this.warnGeometryIssue(
        "missing-nodes",
        `Cannot build wall geometry for ${this.id}: missing node(s) ${missingNodeIds.join(", ")}.`,
      );
      return undefined;
    }

    const coordinates = this.graph.getWayNodes(this.sourceElement).map(nodeToPosition);

    if (this.isAreaWall) {
      return this.toPolygonGeometry(coordinates);
    }

    if (coordinates.length < 2) {
      this.warnGeometryIssue(
        "short-linestring",
        `Cannot build wall line geometry for ${this.id}: at least two coordinates are required.`,
      );
      return undefined;
    }

    return {
      type: "LineString",
      coordinates,
    };
  }

  private toPolygonGeometry(coordinates: GeoJSON.Position[]): GeoJSON.Polygon | undefined {
    if (coordinates.length < 3) {
      this.warnGeometryIssue(
        "short-polygon",
        `Cannot build area wall geometry for ${this.id}: at least three coordinates are required.`,
      );
      return undefined;
    }

    const ring = closeRing(coordinates);

    return {
      type: "Polygon",
      coordinates: [ring],
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
