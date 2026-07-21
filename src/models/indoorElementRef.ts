import { extractLevels, LevelValue } from "../utils/extractLevels";
import { getRequiredFeatureId, getRequiredFeatureProperties } from "../utils/geoJsonHelpers";

/**
 * Lightweight reference to an indoor element that can participate in UI flows
 * such as search, highlighting, map interactions, and accessibility descriptions.
 *
 * This intentionally is not the full domain element. It carries only the stable
 * identity and shared metadata that callers need before knowing whether the
 * source was raw OSM, a domain model object, or a compatibility GeoJSON feature.
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

export function createIndoorElementRefFromFeature(feature: GeoJSON.Feature): IndoorElementRef {
  const tags = getRequiredFeatureProperties(feature);

  return createIndoorElementRef({
    id: getRequiredFeatureId(feature),
    tags,
    levels: getLevelsFromTags(tags),
    geometry: feature.geometry,
  });
}

export function getLevelsFromTags(tags: Record<string, unknown>): number[] {
  return Array.from(
    new Set([
      ...extractLevels(tags.level as LevelValue),
      ...extractLevels(tags.repeat_on as LevelValue),
    ]),
  );
}
