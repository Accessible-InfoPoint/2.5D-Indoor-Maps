import { OverpassRelation, OverpassWay } from "../../models/overpassJson";
import { OsmGraph } from "../../overpass/OsmGraph";
import { getRelationAreaGeometry, getWayPolygonGeometry } from "../indoorAreaGeometry";
import { getRawElementNodeIds } from "../rawElementNodeIds";
import { isRawIndoorStepAreaElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

export class IndoorStepArea extends IndoorElement {
  private static readonly emittedWarnings = new Set<string>();

  static collectFromGraph(graph: OsmGraph): IndoorStepArea[] {
    return graph.elements
      .filter(isRawIndoorStepAreaElement)
      .map((element) => new IndoorStepArea(graph, element));
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
      elementKind: "step area",
      warningPrefix: "IndoorStepArea",
      emittedWarnings: IndoorStepArea.emittedWarnings,
    };
  }
}
