import { OverpassElement } from "../models/overpassJson";
import { createIndoorElementRef, IndoorElementRef } from "../models/indoorElementRef";
import { OsmGraph } from "../overpass/OsmGraph";
import { extractLevels } from "../utils/extractLevels";
import { IndoorDiagnostics } from "../diagnostics";

export interface IndoorElementOptions {
  nonExistentLevels?: number[];
}

/**
 * Base class for parsed indoor elements backed by one raw OSM element.
 *
 * Subclasses expose parser-level geometry and semantics. They intentionally do
 * not expose renderer-specific styling or render items.
 */
export abstract class IndoorElement {
  protected readonly emittedGeometryWarnings = new Set<string>();

  /** Stable normalized id, for example `way/123` or `node/456`. */
  readonly id: string;
  /** Shallow copy of the source element tags. */
  readonly tags: Record<string, string>;

  protected constructor(
    protected readonly graph: OsmGraph,
    readonly sourceElement: OverpassElement,
    protected readonly diagnostics: IndoorDiagnostics = new IndoorDiagnostics(),
    private readonly options: IndoorElementOptions = {},
  ) {
    this.id = graph.keyOf(sourceElement);
    this.tags = { ...(sourceElement.tags ?? {}) };
  }

  get levels(): number[] {
    return Array.from(
      new Set([...this.extractLevelsFromTag("level"), ...this.extractLevelsFromTag("repeat_on")]),
    );
  }

  /** Return whether this element is present on the given numeric indoor level. */
  hasLevel(level: number): boolean {
    return this.levels.includes(level);
  }

  /** Lightweight reference suitable for search, selection, diagnostics, and lookup. */
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

  protected extractLevelsFromTag(tagName: string): number[] {
    return extractLevels(this.tags[tagName], {
      diagnostics: this.diagnostics,
      elementRef: createIndoorElementRef({
        id: this.id,
        tags: this.tags,
        levels: [],
      }),
      sourceElement: this.sourceElement,
      tagName,
      excludedLevels: this.options.nonExistentLevels,
    });
  }
}
