import {
  OverpassElement,
  OverpassNode,
  OverpassRelation,
  OverpassWay,
} from "./models/overpassJson";
import { hasPotentialAccessibilityMarkerTags } from "./indoorTagFilters";

const INDOOR_LEVEL_CONTRIBUTOR_TAGS = new Set(["room", "corridor", "area"]);

/** Return whether a raw element is a relation with `type=multipolygon`. */
export function isRawMultipolygonRelation(element: OverpassElement): element is OverpassRelation {
  return element.type == "relation" && element.tags?.type == "multipolygon";
}

/** Return whether a raw element can provide supported area geometry. */
export function isRawIndoorAreaGeometryElement(
  element: OverpassElement,
): element is OverpassWay | OverpassRelation {
  return element.type == "way" || isRawMultipolygonRelation(element);
}

/** Return whether a raw element is an explicit `indoor=level` outline. */
export function isRawIndoorLevelElement(
  element: OverpassElement,
): element is OverpassWay | OverpassRelation {
  return isRawIndoorAreaGeometryElement(element) && element.tags?.indoor == "level";
}

/**
 * Return whether a raw element is a tag-level room candidate.
 *
 * This includes `indoor=room`, `indoor=corridor`, and `indoor=area`, excluding
 * explicit `landing=yes` stair landings. `IndoorRoom.collectFromGraph` applies
 * the graph-aware landing classifier as an additional exclusion.
 */
export function isRawIndoorRoomElement(
  element: OverpassElement,
): element is OverpassWay | OverpassRelation {
  if (!isRawIndoorAreaGeometryElement(element)) {
    return false;
  }

  const tags = element.tags;

  if (tags === undefined) {
    return false;
  }

  return (
    // rooms, areas and corridors, excluding stair landings, which are also areas
    (INDOOR_LEVEL_CONTRIBUTOR_TAGS.has(tags.indoor) && tags.landing === undefined) ||
    (tags.indoor === "yes" && tags.tourism === "artwork") // TODO: might be replaced by different tagging, currently only for apb bubbles artwork
  );
}

/** Return whether a raw element is an explicit door node. */
export function isRawIndoorDoorElement(element: OverpassElement): element is OverpassNode {
  return element.type == "node" && element.tags?.door !== undefined;
}

/** Return whether a raw element is tagged as an indoor column. */
export function isRawIndoorColumnElement(element: OverpassElement): element is OverpassElement {
  return (
    (element.type == "node" || isRawIndoorAreaGeometryElement(element)) &&
    element.tags?.indoor == "column"
  );
}

/** Return whether a raw node is collected as an `IndoorPointFeature`. */
export function isRawIndoorPointFeatureElement(element: OverpassElement): element is OverpassNode {
  return (
    element.type == "node" &&
    element.tags !== undefined &&
    hasPotentialAccessibilityMarkerTags(element.tags)
  );
}

/** Return whether a raw way is an indoor wall line or area wall. */
export function isRawIndoorWallElement(element: OverpassElement): element is OverpassWay {
  return element.type == "way" && element.tags?.indoor == "wall";
}

/** Return whether a raw way is a standalone handrail. */
export function isRawIndoorHandrailElement(element: OverpassElement): element is OverpassWay {
  return element.type == "way" && element.tags?.barrier == "handrail";
}

/** Return whether a raw way is a stair pathway/middle line. */
export function isRawIndoorStairPathwayElement(element: OverpassElement): element is OverpassWay {
  return element.type == "way" && element.tags?.indoor == "pathway";
}

/** Return whether a raw way or relation is explicitly tagged as a stair landing area. */
export function isRawIndoorLandingElement(
  element: OverpassElement,
): element is OverpassWay | OverpassRelation {
  return (
    isRawIndoorAreaGeometryElement(element) &&
    element.tags?.indoor == "area" &&
    element.tags?.landing == "yes"
  );
}

/** Return whether a raw way or relation is an `area:highway=steps` step area. */
export function isRawIndoorStepAreaElement(
  element: OverpassElement,
): element is OverpassWay | OverpassRelation {
  return isRawIndoorAreaGeometryElement(element) && element.tags?.["area:highway"] == "steps";
}

/** Return whether a raw way is tactile paving supported by the parser. */
export function isRawIndoorTactilePavingElement(element: OverpassElement): element is OverpassWay {
  return (
    element.type == "way" && element.tags?.tactile_paving == "yes" && element.tags?.indoor == "yes"
  );
}

/** Return whether a raw element contributes to `model.levels`. */
export function contributesToIndoorLevels(element: OverpassElement): boolean {
  return isRawIndoorRoomElement(element) || isRawIndoorLevelElement(element);
}
