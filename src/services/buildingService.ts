import { BuildingInterface } from "../models/buildingInterface";
import { lang } from "./languageService";
import BackendService from "./backendService";
import { filterInsideAndLevel, findBuildingBySearchString } from "../utils/buildingGeoJsonFilters";
import { getRequiredFeatureId, getRequiredFeatureProperties } from "../utils/geoJsonHelpers";
import { getFeatureLevels } from "../utils/featureLevels";
import { chainComparators } from "../utils/compareChain";
import { getRequiredMapValue } from "../utils/requiredHelpers";

export interface SearchSuggestion {
  id: string;
  displayName: string;
  levels: number[];
  type: string | undefined;
  feature: GeoJSON.Feature;
}

export interface SuggestionSortContext {
  currentLevel: number;
  selectedFeature?: GeoJSON.Feature;
  infoPointFeature?: GeoJSON.Feature;
  wheelchairMode?: boolean;
}

/**
 * Finding a building by search string:
 * 1) Iterate through all building Features if there is a Feature with the given name. If so, return the building Feature.
 * 2) Otherwise, call Nominatim service to do a more advanced search. Since Nominatim does not return a GeoJSON Feature,
 *    we have to again iterate through all building Features to find the id returned by Nominatim.
 */

function handleSearch(
  featureCollection: GeoJSON.FeatureCollection,
  searchString: string,
): Promise<BuildingInterface> {
  const returnBuilding = findBuildingBySearchString(featureCollection, searchString);

  if (returnBuilding) {
    return Promise.resolve(returnBuilding);
  }

  return Promise.reject(new Error(`${lang.buildingNotFound}: ${searchString}`));
}

const OSM_NAME_ARTIFACTS = new Set([]);
const EXCLUDED_AMENITIES = new Set(["waste_basket"]);
const SEARCH_SUGGESTIONS_DEBUG_KEY = "debugSearchSuggestions";

function getValidName(p: Record<string, unknown>): string | undefined {
  const name = p.name;
  if (typeof name !== "string" || OSM_NAME_ARTIFACTS.has(name.toLowerCase())) return undefined;
  return name;
}

function filterForSuggestions(f: GeoJSON.Feature, searchString: string): boolean {
  const p = getRequiredFeatureProperties(f);
  if (getFeatureLevels(f).length === 0) return false;
  if (p.amenity && EXCLUDED_AMENITIES.has(String(p.amenity))) return false;
  const s = searchString.toLowerCase();
  return !!(
    getValidName(p)?.toLowerCase().includes(s) ||
    p.ref?.toLowerCase().includes(s) ||
    p.amenity?.toLowerCase().includes(s)
  );
}

function getFeatureCentroid(feature: GeoJSON.Feature): [number, number] | undefined {
  const geom = feature.geometry;
  if (geom.type === "Polygon" && geom.coordinates[0]?.length > 0) {
    const ring = geom.coordinates[0];
    return [
      ring.reduce((s, c) => s + c[0], 0) / ring.length,
      ring.reduce((s, c) => s + c[1], 0) / ring.length,
    ];
  }
  if (geom.type === "LineString" && geom.coordinates.length > 0) {
    const pts = geom.coordinates;
    return [
      pts.reduce((s, c) => s + c[0], 0) / pts.length,
      pts.reduce((s, c) => s + c[1], 0) / pts.length,
    ];
  }
  if (geom.type === "Point") {
    return [geom.coordinates[0], geom.coordinates[1]];
  }
  return undefined;
}

const FIELD_PRIORITY: Record<"name" | "ref" | "amenity", number> = {
  name: 0,
  ref: 1,
  amenity: 2,
};
const QUALITY_TIER_COUNT = 3; // exact, prefix, substring

function matchQuality(value: string | undefined, query: string): number | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase();
  if (v === query) return 0;
  if (v.startsWith(query)) return 1;
  if (v.includes(query)) return 2;
  return undefined;
}

/**
 * Scores a feature's relevance to a search query across its name, ref and
 * amenity fields, then combines them so a better match on a lower-priority
 * field still ranks close to a worse match on a higher-priority field
 * (e.g. an exact ref match ranks just behind a substring name match).
 * Lower is better. Reorder FIELD_PRIORITY to change field precedence.
 */
function matchScore(
  p: Record<string, unknown>,
  validName: string | undefined,
  searchString: string,
): number {
  const query = searchString.toLowerCase();
  const fieldValues: Array<[keyof typeof FIELD_PRIORITY, string | undefined]> = [
    ["name", validName],
    ["ref", p.ref as string | undefined],
    ["amenity", p.amenity as string | undefined],
  ];

  const scores = fieldValues
    .map(([field, value]) => {
      const quality = matchQuality(value, query);
      return quality === undefined
        ? undefined
        : FIELD_PRIORITY[field] * QUALITY_TIER_COUNT + quality;
    })
    .filter((score): score is number => score !== undefined);

  return Math.min(...scores);
}

function minLevelDistance(levels: number[], currentLevel: number): number {
  return Math.min(...levels.map((l) => Math.abs(l - currentLevel)));
}

function isWheelchairAccessible(feature: GeoJSON.Feature): boolean {
  const wheelchair = getRequiredFeatureProperties(feature).wheelchair;
  return wheelchair !== undefined && ["yes", "designated"].includes(wheelchair);
}

function isSearchSuggestionsDebugEnabled(): boolean {
  try {
    return globalThis.localStorage?.getItem(SEARCH_SUGGESTIONS_DEBUG_KEY) === "true";
  } catch {
    return false;
  }
}

function searchSuggestions(
  searchString: string,
  context: SuggestionSortContext,
): SearchSuggestion[] {
  if (!searchString) return [];
  const geoJSON = getBuildingGeoJSON();
  const suggestions: SearchSuggestion[] = [];
  const scores = new Map<string, number>();

  geoJSON.features
    .filter((f) => filterForSuggestions(f, searchString))
    .forEach((f) => {
      const p = getRequiredFeatureProperties(f);
      const validName = getValidName(p);
      const id = getRequiredFeatureId(f);

      suggestions.push({
        id,
        displayName: (validName ?? p.ref ?? p.indoor ?? p.amenity ?? "?") as string,
        levels: getFeatureLevels(f),
        type: (p.amenity ?? p.indoor) as string | undefined,
        feature: f,
      });
      scores.set(id, matchScore(p, validName, searchString));
    });

  const centroids = new Map<string, [number, number] | undefined>(
    suggestions.map((s) => [s.id, getFeatureCentroid(s.feature)]),
  );
  const selectedCoords = context.selectedFeature
    ? getFeatureCentroid(context.selectedFeature)
    : undefined;
  const infoCoords = context.infoPointFeature
    ? getFeatureCentroid(context.infoPointFeature)
    : undefined;

  const squaredDist = (a: [number, number], b: [number, number]): number =>
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

  const distanceTo = (
    suggestion: SearchSuggestion,
    coords: [number, number] | undefined,
  ): number | undefined => {
    if (!coords) return undefined;
    const centroid = centroids.get(suggestion.id);
    return centroid ? squaredDist(centroid, coords) : undefined;
  };

  const byMatchScore = (a: SearchSuggestion, b: SearchSuggestion): number =>
    getRequiredMapValue(scores, a.id, "Search suggestion score") -
    getRequiredMapValue(scores, b.id, "Search suggestion score");

  const byWheelchairAccessibility = (a: SearchSuggestion, b: SearchSuggestion): number => {
    if (!context.wheelchairMode) return 0;
    return Number(isWheelchairAccessible(b.feature)) - Number(isWheelchairAccessible(a.feature));
  };

  const byLevelDistance = (a: SearchSuggestion, b: SearchSuggestion): number =>
    minLevelDistance(a.levels, context.currentLevel) -
    minLevelDistance(b.levels, context.currentLevel);

  const byProximityTo =
    (coords: [number, number] | undefined) =>
    (a: SearchSuggestion, b: SearchSuggestion): number => {
      if (!coords) return 0;
      const da = distanceTo(a, coords);
      const db = distanceTo(b, coords);
      if (da === undefined || db === undefined) return 0;
      return da - db;
    };

  // Priority order, most important first. Reorder this list to change ranking behavior.
  const sortedSuggestions = suggestions.sort(
    chainComparators(
      byMatchScore,
      byWheelchairAccessibility,
      byLevelDistance,
      byProximityTo(selectedCoords),
      byProximityTo(infoCoords),
    ),
  );

  // debug view for suggestion rankings
  // activate using: localStorage.setItem("debugSearchSuggestions", "true")
  // deactivate using: localStorage.removeItem("debugSearchSuggestions")
  logSearchSuggestionRanking(searchString, sortedSuggestions, {
    context,
    scores,
    centroids,
    selectedCoords,
    infoCoords,
    distanceTo,
  });

  return sortedSuggestions;
}

function logSearchSuggestionRanking(
  searchString: string,
  suggestions: SearchSuggestion[],
  debugContext: {
    context: SuggestionSortContext;
    scores: Map<string, number>;
    centroids: Map<string, [number, number] | undefined>;
    selectedCoords: [number, number] | undefined;
    infoCoords: [number, number] | undefined;
    distanceTo: (
      suggestion: SearchSuggestion,
      coords: [number, number] | undefined,
    ) => number | undefined;
  },
): void {
  if (!isSearchSuggestionsDebugEnabled()) return;

  const rows = suggestions.map((suggestion, index) => {
    const centroid = debugContext.centroids.get(suggestion.id);
    const wheelchairAccessible = isWheelchairAccessible(suggestion.feature);
    return {
      rank: index + 1,
      id: suggestion.id,
      displayName: suggestion.displayName,
      type: suggestion.type ?? "",
      levels: suggestion.levels.join(", "),
      matchScore: getRequiredMapValue(
        debugContext.scores,
        suggestion.id,
        "Search suggestion score",
      ),
      wheelchairScore: debugContext.context.wheelchairMode ? (wheelchairAccessible ? 0 : 1) : 0,
      wheelchairAccessible,
      levelDistance: minLevelDistance(suggestion.levels, debugContext.context.currentLevel),
      selectedDistanceSq: debugContext.distanceTo(suggestion, debugContext.selectedCoords) ?? "",
      infoDistanceSq: debugContext.distanceTo(suggestion, debugContext.infoCoords) ?? "",
      centroid: centroid ? centroid.join(", ") : "",
    };
  });

  console.debug("[SearchSuggestions] ranking context", {
    query: searchString,
    currentLevel: debugContext.context.currentLevel,
    wheelchairMode: debugContext.context.wheelchairMode === true,
    selectedCoords: debugContext.selectedCoords,
    infoCoords: debugContext.infoCoords,
    sortOrder: [
      "matchScore",
      "wheelchairScore",
      "levelDistance",
      "selectedDistanceSq",
      "infoDistanceSq",
    ],
    note: "Lower scores sort first. Proximity values are squared distances.",
  });
  console.table(rows);
}

function getBuildingGeoJSON(): GeoJSON.FeatureCollection<any> {
  return BackendService.getGeoJson();
}

function getBuildingDescription(): string {
  return BackendService.getBuildingDescription();
}

export default {
  getBuildingGeoJSON,
  getBuildingDescription,
  handleSearch,
  searchSuggestions,
  filterInsideAndLevel,
};
