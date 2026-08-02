import { extractLevels, LevelValue } from "../utils/extractLevels";

/**
 * Lightweight reference to an indoor element that can participate in UI flows
 * such as search, highlighting, map interactions, and accessibility descriptions.
 *
 * This intentionally is not the full domain element. It carries only the stable
 * identity and shared metadata that callers need before knowing whether they
 * were handed the original raw OSM element or a richer domain model object.
 */
export interface IndoorElementRef {
  /** Stable normalized id, for example `way/123` or `node/456`. */
  id: string;
  /** Tags associated with the referenced element. */
  tags: Record<string, unknown>;
  /** Numeric levels where the referenced element is present. */
  levels: number[];
  /** Optional geometry for callers that need spatial hints without resolving the full element. */
  geometry?: GeoJSON.Geometry;
}

/**
 * Create a lightweight indoor element reference.
 *
 * If `levels` are omitted, they are derived from `level=*` and `repeat_on=*`
 * tags without diagnostics.
 */
export function createIndoorElementRef(options: {
  id: string;
  tags?: Record<string, unknown>;
  levels?: number[];
  geometry?: GeoJSON.Geometry;
  excludedLevels?: number[];
}): IndoorElementRef {
  return {
    id: options.id,
    tags: { ...(options.tags ?? {}) },
    levels:
      options.levels ??
      getLevelsFromTags(options.tags ?? {}, { excludedLevels: options.excludedLevels }),
    geometry: options.geometry,
  };
}

export interface GetLevelsFromTagsOptions {
  /** Numeric levels that should be omitted from expanded `level=*` and `repeat_on=*` values. */
  excludedLevels?: number[];
}

/** Derive numeric levels from an arbitrary tag object. */
export function getLevelsFromTags(
  tags: Record<string, unknown>,
  options: GetLevelsFromTagsOptions = {},
): number[] {
  return Array.from(
    new Set([
      ...extractLevels(tags.level as LevelValue, { excludedLevels: options.excludedLevels }),
      ...extractLevels(tags.repeat_on as LevelValue, { excludedLevels: options.excludedLevels }),
    ]),
  );
}
