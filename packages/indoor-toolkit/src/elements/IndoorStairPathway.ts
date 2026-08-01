import { OverpassWay } from "../models/overpassJson";
import { IndoorDiagnostics } from "../diagnostics";
import { OsmGraph } from "../overpass/OsmGraph";
import { extractLevels } from "../utils/extractLevels";
import { nodeToPosition } from "../utils/overpassJsonHelpers";
import { parsePositiveMeters } from "../utils/tagValueHelpers";
import { isRawIndoorStairPathwayElement } from "../rawIndoorElementFilters";
import { parseVerticalSpan, VerticalSpan } from "../verticalConnections/VerticalSpan";
import { IndoorElement } from "./IndoorElement";

const DEFAULT_STAIR_PATHWAY_WIDTH_METERS = 1;

export class IndoorStairPathway extends IndoorElement {
  static collectFromGraph(graph: OsmGraph, diagnostics?: IndoorDiagnostics): IndoorStairPathway[] {
    return graph.elements
      .filter(isRawIndoorStairPathwayElement)
      .map((way) => new IndoorStairPathway(graph, way, diagnostics));
  }

  constructor(
    graph: OsmGraph,
    readonly sourceElement: OverpassWay,
    diagnostics?: IndoorDiagnostics,
  ) {
    super(graph, sourceElement, diagnostics);
  }

  get nodeIds(): number[] {
    return [...this.sourceElement.nodes];
  }

  get nodeLevels(): Array<number | undefined> {
    return this.sourceElement.nodes.map((nodeId) => {
      const node = this.graph.getNode(nodeId);

      return node === undefined ? undefined : extractLevels(node.tags?.level)[0];
    });
  }

  get widthMeters(): number {
    return this.explicitWidthMeters ?? DEFAULT_STAIR_PATHWAY_WIDTH_METERS;
  }

  get explicitWidthMeters(): number | undefined {
    return parsePositiveMeters(this.tags.width);
  }

  get verticalSpan(): VerticalSpan | undefined {
    return parseVerticalSpan(this.tags.level);
  }

  get repeatOffsets(): number[] {
    const span = this.verticalSpan;

    if (span === undefined) {
      return [];
    }

    return Array.from(
      new Set([
        0,
        ...extractLevels(this.tags.repeat_on).map((repeatStart) => repeatStart - span.from),
        ...extractLevels(this.tags.repeat_on_offset),
      ]),
    );
  }

  get geometry(): GeoJSON.LineString | undefined {
    return this.toLineStringGeometry();
  }

  toLineStringGeometry(): GeoJSON.LineString | undefined {
    const missingNodeIds = this.graph.getMissingWayNodeIds(this.sourceElement);

    if (missingNodeIds.length > 0) {
      this.warnGeometryIssue(
        "missing-nodes",
        `Cannot build stair pathway geometry for ${this.id}: missing node(s) ${missingNodeIds.join(", ")}.`,
      );
      return undefined;
    }

    const coordinates = this.graph.getWayNodes(this.sourceElement).map(nodeToPosition);

    if (coordinates.length < 2) {
      this.warnGeometryIssue(
        "short-linestring",
        `Cannot build stair pathway geometry for ${this.id}: at least two coordinates are required.`,
      );
      return undefined;
    }

    return {
      type: "LineString",
      coordinates,
    };
  }
}
