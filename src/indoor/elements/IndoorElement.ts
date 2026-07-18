import { OverpassElement } from "../../models/overpassJson";
import { OsmGraph } from "../../overpass/OsmGraph";
import { extractLevels } from "../../utils/extractLevels";

export abstract class IndoorElement {
  readonly id: string;
  readonly tags: Record<string, string>;

  protected constructor(
    protected readonly graph: OsmGraph,
    readonly sourceElement: OverpassElement,
  ) {
    this.id = graph.keyOf(sourceElement);
    this.tags = { ...(sourceElement.tags ?? {}) };
  }

  get levels(): number[] {
    return Array.from(
      new Set([...extractLevels(this.tags.level), ...extractLevels(this.tags.repeat_on)]),
    );
  }

  hasLevel(level: number): boolean {
    return this.levels.includes(level);
  }

  abstract toGeoJsonFeature(): GeoJSON.Feature | undefined;
}
