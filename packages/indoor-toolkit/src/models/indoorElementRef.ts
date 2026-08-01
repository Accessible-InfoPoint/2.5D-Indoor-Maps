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
  id: string;
  tags: Record<string, unknown>;
  levels: number[];
  geometry?: GeoJSON.Geometry;
}

export function createIndoorElementRef(options: {
  id: string;
  tags?: Record<string, unknown>;
  levels?: number[];
  geometry?: GeoJSON.Geometry;
}): IndoorElementRef {
  return {
    id: options.id,
    tags: { ...(options.tags ?? {}) },
    levels: options.levels ?? getLevelsFromTags(options.tags ?? {}),
    geometry: options.geometry,
  };
}

export function getLevelsFromTags(tags: Record<string, unknown>): number[] {
  return Array.from(
    new Set([
      ...extractLevels(tags.level as LevelValue),
      ...extractLevels(tags.repeat_on as LevelValue),
    ]),
  );
}
