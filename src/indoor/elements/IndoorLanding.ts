import { OverpassRelation, OverpassWay } from "../../models/overpassJson";
import { OsmGraph } from "../../overpass/OsmGraph";
import { extractLevels } from "../../utils/extractLevels";
import { getRawElementNodeIds } from "../rawElementNodeIds";
import { isRawIndoorLandingElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

export class IndoorLanding extends IndoorElement {
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

  toGeoJsonFeature(): undefined {
    return undefined;
  }
}
