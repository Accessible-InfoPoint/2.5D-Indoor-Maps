import { OverpassRelation, OverpassWay } from "../../models/overpassJson";
import { OsmGraph } from "../../overpass/OsmGraph";
import { extractLevels } from "../../utils/extractLevels";
import { getRelationAreaGeometry, getWayPolygonGeometry } from "../indoorAreaGeometry";
import { getRawElementNodeIds } from "../rawElementNodeIds";
import { isRawIndoorLandingElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

export class IndoorLanding extends IndoorElement {
  private static readonly emittedWarnings = new Set<string>();

  static collectFromGraph(graph: OsmGraph): IndoorLanding[] {
    return graph.elements
      .filter(isRawIndoorLandingElement)
      .map((element) => new IndoorLanding(graph, element));
  }

  constructor(
    graph: OsmGraph,
    readonly sourceElement: OverpassWay | OverpassRelation,
  ) {
    super(graph, sourceElement);
  }

  get nodeIds(): number[] {
    return getRawElementNodeIds(this.graph, this.sourceElement);
  }

  get authoredLevels(): number[] {
    return extractLevels(this.tags.level);
  }

  get repeatLevels(): number[] {
    return extractLevels(this.tags.repeat_on);
  }

  get repeatOffsetValues(): number[] {
    return extractLevels(this.tags.repeat_on_offset);
  }

  toAreaGeometry(): GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined {
    switch (this.sourceElement.type) {
      case "way":
        return getWayPolygonGeometry(this.sourceElement, this.getAreaGeometryOptions());
      case "relation":
        return getRelationAreaGeometry(this.sourceElement, this.getAreaGeometryOptions());
    }
  }

  toGeoJsonFeature(): undefined {
    return undefined;
  }

  private getAreaGeometryOptions() {
    return {
      graph: this.graph,
      elementId: this.id,
      elementKind: "landing",
      warningPrefix: "IndoorLanding",
      emittedWarnings: IndoorLanding.emittedWarnings,
    };
  }
}
