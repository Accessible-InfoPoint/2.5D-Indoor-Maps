import { OverpassWay } from "../../models/overpassJson";
import { OsmGraph } from "../../overpass/OsmGraph";
import { extractLevels } from "../../utils/extractLevels";
import { nodeToPosition } from "../../utils/overpassJsonHelpers";
import { parsePositiveMeters } from "../../utils/tagValueHelpers";
import { isRawIndoorStairPathwayElement } from "../rawIndoorElementFilters";
import { parseVerticalSpan, VerticalSpan } from "../verticalConnections/VerticalSpan";
import { IndoorElement } from "./IndoorElement";

const DEFAULT_STAIR_PATHWAY_WIDTH_METERS = 1;

export class IndoorStairPathway extends IndoorElement {
  static collectFromGraph(graph: OsmGraph): IndoorStairPathway[] {
    return graph.elements
      .filter(isRawIndoorStairPathwayElement)
      .map((way) => new IndoorStairPathway(graph, way));
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

  get widthMeters(): number {
    return parsePositiveMeters(this.tags.width) ?? DEFAULT_STAIR_PATHWAY_WIDTH_METERS;
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

  toGeoJsonFeature(): undefined {
    return undefined;
  }
}
