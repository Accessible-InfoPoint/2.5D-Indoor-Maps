import { OverpassElement } from "../models/overpassJson";
import { createIndoorElementRef, IndoorElementRef } from "../models/indoorElementRef";
import { OsmGraph } from "../overpass/OsmGraph";
import { extractLevels } from "../utils/extractLevels";
import { IndoorDiagnostics } from "../diagnostics";

export abstract class IndoorElement {
  protected readonly emittedGeometryWarnings = new Set<string>();

  readonly id: string;
  readonly tags: Record<string, string>;

  protected constructor(
    protected readonly graph: OsmGraph,
    readonly sourceElement: OverpassElement,
    protected readonly diagnostics: IndoorDiagnostics = new IndoorDiagnostics(),
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

  get ref(): IndoorElementRef {
    return createIndoorElementRef({
      id: this.id,
      tags: this.tags,
      levels: this.levels,
    });
  }

  protected warnGeometryIssue(code: string, message: string): void {
    this.diagnostics.warn({
      code: `${this.constructor.name}.${code}`,
      message,
      elementRef: this.ref,
      sourceElement: this.sourceElement,
    });
  }
}
