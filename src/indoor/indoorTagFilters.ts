export type IndoorTags = Record<string, unknown>;

export function isToiletTags(tags: IndoorTags): boolean {
  return tags.amenity === "toilets";
}

export function isStaircaseTags(tags: IndoorTags): boolean {
  return tags.stairs === "yes" || tags.highway === "elevator" || tags.highway === "escalator";
}

export function isRoomTags(tags: IndoorTags): boolean {
  return tags.indoor === "room";
}

export function isCorridorOrAreaTags(tags: IndoorTags): boolean {
  return ["corridor", "area"].includes(tags.indoor as string);
}

export function isNeutralDoorColorRoomTags(tags: IndoorTags): boolean {
  return isCorridorOrAreaTags(tags) && tags.stairs !== "yes";
}

export function isRoomLabelEligibleTags(tags: IndoorTags): boolean {
  return (
    isRoomTags(tags) &&
    !isToiletTags(tags) &&
    tags.handrail === undefined &&
    tags.stairs === undefined
  );
}
