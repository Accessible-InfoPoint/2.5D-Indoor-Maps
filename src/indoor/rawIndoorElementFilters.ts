import { OverpassElement } from "../models/overpassJson";

const INDOOR_LEVEL_CONTRIBUTOR_TAGS = new Set(["room", "corridor", "area"]);

export function isRawIndoorRoomElement(element: OverpassElement): boolean {
  if (element.type != "way" && element.type != "relation") {
    return false;
  }

  const tags = element.tags;

  if (tags === undefined) {
    return false;
  }

  return INDOOR_LEVEL_CONTRIBUTOR_TAGS.has(tags.indoor) && tags.landing === undefined;
}

export function contributesToIndoorLevels(element: OverpassElement): boolean {
  return isRawIndoorRoomElement(element);
}
