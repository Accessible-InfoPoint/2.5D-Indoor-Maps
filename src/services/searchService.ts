import BackendService from "./backendService";
import { chainComparators } from "../utils/compareChain";
import { getRequiredMapValue } from "../utils/requiredHelpers";
import { createIndoorElementRef, IndoorElementRef } from "../indoor";
import { searchTagAliases } from "../data/searchTagAliases";

export interface SearchSuggestion {
  id: string;
  displayName: string;
  levels: number[];
  type: string | undefined;
  elementRef: IndoorElementRef;
}

export interface SuggestionSortContext {
  currentLevel: number;
  selectedElementRef?: IndoorElementRef;
  infoPointElementRef?: IndoorElementRef;
  wheelchairMode?: boolean;
}

const OSM_NAME_ARTIFACTS = new Set([]);
const EXCLUDED_AMENITIES = new Set(["waste_basket"]);
const SEARCH_SUGGESTIONS_DEBUG_KEY = "debugSearchSuggestions";
type SearchField = "name" | "ref" | "amenity" | "room";

function getValidName(p: Record<string, unknown>): string | undefined {
  const name = p.name;
  if (typeof name !== "string" || OSM_NAME_ARTIFACTS.has(name.toLowerCase())) return undefined;
  return name;
}

function filterForSuggestions(elementRef: IndoorElementRef, searchString: string): boolean {
  const p = elementRef.tags;
  if (elementRef.levels.length === 0) return false;
  if (p.amenity && EXCLUDED_AMENITIES.has(String(p.amenity))) return false;
  const s = searchString.toLowerCase();
  return getSearchFieldValues(p, getValidName(p)).some((value) => value.toLowerCase().includes(s));
}

function getStringTag(value: unknown): string | undefined {
  return typeof value == "string" ? value : undefined;
}

function getElementRefCentroid(
  elementRef: IndoorElementRef | undefined,
): [number, number] | undefined {
  const geom = elementRef?.geometry;

  if (geom === undefined) {
    return undefined;
  }

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

const FIELD_PRIORITY: Record<SearchField, number> = {
  name: 0,
  ref: 1,
  amenity: 2,
  room: 3,
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

function bestMatchQuality(values: string[], query: string): number | undefined {
  const qualities = values
    .map((value) => matchQuality(value, query))
    .filter((quality): quality is number => quality !== undefined);

  return qualities.length == 0 ? undefined : Math.min(...qualities);
}

function getSearchFieldValues(
  tags: Record<string, unknown>,
  validName: string | undefined,
): string[] {
  return getSearchFields(tags, validName).flatMap(([, values]) => values);
}

function getSearchFields(
  tags: Record<string, unknown>,
  validName: string | undefined,
): Array<[SearchField, string[]]> {
  return [
    ["name", getOptionalSearchValues(validName)],
    ["ref", getOptionalSearchValues(getStringTag(tags.ref))],
    ["amenity", getTagSearchValues("amenity", tags.amenity)],
    ["room", getTagSearchValues("room", tags.room)],
  ];
}

function getOptionalSearchValues(value: string | undefined): string[] {
  return value === undefined ? [] : [value];
}

function getTagSearchValues(tagName: string, value: unknown): string[] {
  const tagValue = getStringTag(value);

  if (tagValue === undefined) {
    return [];
  }

  return [tagValue, ...getTagValueAliases(tagName, tagValue)];
}

function getTagValueAliases(tagName: string, value: string): string[] {
  return searchTagAliases[tagName]?.[value.toLowerCase()] ?? [];
}

/**
 * Scores a feature's relevance to a search query across its searchable tag
 * fields, then combines them so a better match on a lower-priority
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
  const fieldValues = getSearchFields(p, validName);

  const scores = fieldValues
    .map(([field, values]) => {
      const quality = bestMatchQuality(values, query);
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

function isWheelchairAccessible(elementRef: IndoorElementRef): boolean {
  const wheelchair = getStringTag(elementRef.tags.wheelchair);
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

  const suggestions: SearchSuggestion[] = getSearchableElementRefs()
    .filter(({ elementRef }) => filterForSuggestions(elementRef, searchString))
    .map(({ elementRef }) => {
      const p = elementRef.tags;
      const validName = getValidName(p);

      return {
        id: elementRef.id,
        displayName: (validName ?? p.ref ?? p.amenity ?? p.room ?? p.indoor ?? "?") as string,
        levels: elementRef.levels,
        type: (p.amenity ?? p.room ?? p.indoor) as string | undefined,
        elementRef,
      };
    });
  const scores = new Map<string, number>();

  suggestions.forEach((suggestion) =>
    scores.set(
      suggestion.id,
      matchScore(
        suggestion.elementRef.tags,
        getValidName(suggestion.elementRef.tags),
        searchString,
      ),
    ),
  );

  const centroids = new Map<string, [number, number] | undefined>(
    suggestions.map((s) => [s.id, getElementRefCentroid(s.elementRef)]),
  );
  const selectedCoords = getElementRefCentroid(context.selectedElementRef);
  const infoCoords = getElementRefCentroid(context.infoPointElementRef);

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
    return (
      Number(isWheelchairAccessible(b.elementRef)) - Number(isWheelchairAccessible(a.elementRef))
    );
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

function getSearchElementRefById(featureId: string | undefined): IndoorElementRef | undefined {
  if (featureId === undefined) {
    return undefined;
  }

  return getSearchableElementRefs().find(({ elementRef }) => elementRef.id == featureId)
    ?.elementRef;
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
    const wheelchairAccessible = isWheelchairAccessible(suggestion.elementRef);
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

function getSearchableElementRefs(): Array<{ elementRef: IndoorElementRef }> {
  const model = BackendService.getIndoorModel();

  return [
    ...model.elements.rooms.map((room) => {
      return {
        elementRef: createIndoorElementRef({
          id: room.id,
          tags: room.tags,
          levels: room.levels,
          geometry: room.geometry,
        }),
      };
    }),
    ...model.elements.pointFeatures.map((pointFeature) => {
      return {
        elementRef: createIndoorElementRef({
          id: pointFeature.id,
          tags: pointFeature.tags,
          levels: pointFeature.levels,
          geometry: pointFeature.geometry,
        }),
      };
    }),
  ];
}

export default {
  searchSuggestions,
  getSearchElementRefById,
};
