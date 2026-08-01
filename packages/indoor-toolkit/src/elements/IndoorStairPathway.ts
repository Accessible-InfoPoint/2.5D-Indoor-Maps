import { OverpassNode, OverpassWay } from "../models/overpassJson";
import { IndoorDiagnostics } from "../diagnostics";
import { createIndoorElementRef } from "../models/indoorElementRef";
import { OsmGraph } from "../overpass/OsmGraph";
import { extractLevels } from "../utils/extractLevels";
import { nodeToPosition } from "../utils/overpassJsonHelpers";
import { parsePositiveMeters } from "../utils/tagValueHelpers";
import { isRawIndoorStairPathwayElement } from "../rawIndoorElementFilters";
import { parseVerticalSpan, VerticalSpan } from "../verticalConnections/VerticalSpan";
import { IndoorElement } from "./IndoorElement";

const DEFAULT_STAIR_PATHWAY_WIDTH_METERS = 1;

/**
 * Stair middle-line way parsed from `indoor=pathway`.
 *
 * `level=*` is interpreted as a vertical span for pathways, while `repeat_on=*`
 * and `repeat_on_offset=*` create repeated pathway instances in the stair path
 * network.
 */
export class IndoorStairPathway extends IndoorElement {
  /** Collect all raw stair pathway ways from a graph. */
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

  /** Raw node ids of the pathway way in authored order. */
  get nodeIds(): number[] {
    return [...this.sourceElement.nodes];
  }

  /** Per-node level anchors parsed from node `level=*` tags, if present. */
  get nodeLevels(): Array<number | undefined> {
    return this.sourceElement.nodes.map((nodeId) => {
      const node = this.graph.getNode(nodeId);

      return node === undefined ? undefined : this.extractNodeLevels(node)[0];
    });
  }

  /** Effective pathway width in meters, falling back to the parser default when absent. */
  get widthMeters(): number {
    return this.explicitWidthMeters ?? DEFAULT_STAIR_PATHWAY_WIDTH_METERS;
  }

  /** Width parsed directly from `width=*`, without applying the default. */
  get explicitWidthMeters(): number | undefined {
    return parsePositiveMeters(this.tags.width);
  }

  /** Vertical span parsed from pathway `level=from-to`. */
  get verticalSpan(): VerticalSpan | undefined {
    return parseVerticalSpan(this.tags.level);
  }

  /**
   * Offsets used to create repeated pathway instances.
   *
   * `repeat_on=*` values are interpreted as repeated start levels, while
   * `repeat_on_offset=*` values are direct offsets from the authored span.
   */
  get repeatOffsets(): number[] {
    const span = this.verticalSpan;

    if (span === undefined) {
      return [];
    }

    return Array.from(
      new Set([
        0,
        ...this.extractLevelsFromTag("repeat_on").map((repeatStart) => repeatStart - span.from),
        ...this.extractLevelsFromTag("repeat_on_offset"),
      ]),
    );
  }

  /** LineString geometry for the pathway, if all way nodes are available. */
  get geometry(): GeoJSON.LineString | undefined {
    return this.toLineStringGeometry();
  }

  /** Build the pathway LineString and emit diagnostics for missing or too-short geometry. */
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

  private extractNodeLevels(node: OverpassNode): number[] {
    return extractLevels(node.tags?.level, {
      diagnostics: this.diagnostics,
      elementRef: createIndoorElementRef({
        id: this.graph.keyOf(node),
        tags: node.tags ?? {},
        levels: [],
      }),
      sourceElement: node,
      tagName: "level",
    });
  }
}
