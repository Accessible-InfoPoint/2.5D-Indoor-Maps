import {
  OverpassElement,
  OverpassNode,
  OverpassRelation,
  OverpassWay,
} from "../models/overpassJson";
import { hasPotentialAccessibilityMarkerTags } from "./indoorTagFilters";

const INDOOR_LEVEL_CONTRIBUTOR_TAGS = new Set(["room", "corridor", "area"]);

export function isRawIndoorLevelElement(
  element: OverpassElement,
): element is OverpassWay | OverpassRelation {
  return (element.type == "way" || element.type == "relation") && element.tags?.indoor == "level";
}

export function isRawIndoorRoomElement(
  element: OverpassElement,
): element is OverpassWay | OverpassRelation {
  if (element.type != "way" && element.type != "relation") {
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

export function isRawIndoorDoorElement(element: OverpassElement): element is OverpassNode {
  return element.type == "node" && element.tags?.door !== undefined;
}

export function isRawIndoorColumnElement(element: OverpassElement): element is OverpassElement {
  return element.tags?.indoor == "column";
}

export function isRawIndoorInfoPointElement(element: OverpassElement): element is OverpassNode {
  return element.type == "node" && element.tags?.information == "tactile_map";
}

export function isRawIndoorPointFeatureElement(element: OverpassElement): element is OverpassNode {
  return (
    element.type == "node" &&
    element.tags !== undefined &&
    hasPotentialAccessibilityMarkerTags(element.tags)
  );
}

export function isRawIndoorWallElement(element: OverpassElement): element is OverpassWay {
  return element.type == "way" && element.tags?.indoor == "wall";
}

export function isRawIndoorHandrailElement(element: OverpassElement): element is OverpassWay {
  return element.type == "way" && element.tags?.barrier == "handrail";
}

export function isRawIndoorStairPathwayElement(element: OverpassElement): element is OverpassWay {
  return element.type == "way" && element.tags?.indoor == "pathway";
}

export function isRawIndoorLandingElement(
  element: OverpassElement,
): element is OverpassWay | OverpassRelation {
  return (
    (element.type == "way" || element.type == "relation") &&
    element.tags?.indoor == "area" &&
    element.tags?.landing == "yes"
  );
}

export function isRawIndoorTactilePavingElement(element: OverpassElement): element is OverpassWay {
  return (
    element.type == "way" && element.tags?.tactile_paving == "yes" && element.tags?.indoor == "yes"
  );
}

export function contributesToIndoorLevels(element: OverpassElement): boolean {
  return isRawIndoorRoomElement(element) || isRawIndoorLevelElement(element);
}
