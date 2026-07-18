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

  return (
    (INDOOR_LEVEL_CONTRIBUTOR_TAGS.has(tags.indoor) && tags.landing === undefined) || // roms, areas and corridors, excluding stair landings, which are also areas
    (tags.indoor === "yes" && tags.tourism === "artwork") // TODO: might be replaced by different tagging, currently only for apb bubbles artwork
  );
}

export function contributesToIndoorLevels(element: OverpassElement): boolean {
  return isRawIndoorRoomElement(element);
}
