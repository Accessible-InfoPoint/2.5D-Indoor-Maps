export type IndoorTags = Record<string, unknown>;

export function isToiletTags(tags: IndoorTags): boolean {
  return tags.amenity === "toilets";
}

export function isAccessibleToiletTags(tags: IndoorTags): boolean {
  return isToiletTags(tags) && isPositiveWheelchairTags(tags);
}

export function isGeneralToiletTags(tags: IndoorTags): boolean {
  return isToiletTags(tags) && !isPositiveWheelchairTags(tags);
}

export function isStaircaseTags(tags: IndoorTags): boolean {
  return tags.stairs === "yes" || tags.highway === "elevator" || tags.highway === "escalator";
}

export function isElevatorTags(tags: IndoorTags): boolean {
  return tags.highway === "elevator";
}

export function isWheelchairAccessibleElevatorTags(tags: IndoorTags): boolean {
  return isElevatorTags(tags) && isPositiveWheelchairTags(tags);
}

export function isStepsTags(tags: IndoorTags): boolean {
  return tags.highway === "steps" || tags.stairs === "yes";
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

export function isTactileInformationTags(tags: IndoorTags): boolean {
  return ["tactile_map", "tactile_model", "braille", "tactile_letters"].includes(
    tags.information as string,
  );
}

export function isInfoPointTags(tags: IndoorTags): boolean {
  return tags.information === "tactile_map";
}

export function isEntranceTags(tags: IndoorTags): boolean {
  return ["yes", "main", "secondary"].includes(tags.entrance as string);
}

export function isEmergencyExitTags(tags: IndoorTags): boolean {
  return (
    ["yes", "emergency"].includes(tags.exit as string) ||
    ["exit", "emergency"].includes(tags.entrance as string)
  );
}

export function isInformationBoardTags(tags: IndoorTags): boolean {
  return ["board", "map"].includes(tags.information as string);
}

export function hasPotentialAccessibilityMarkerTags(tags: IndoorTags): boolean {
  return (
    (!isInfoPointTags(tags) && isTactileInformationTags(tags)) ||
    isAccessibleToiletTags(tags) ||
    isWheelchairAccessibleElevatorTags(tags) ||
    isGeneralToiletTags(tags) ||
    isEntranceTags(tags) ||
    isEmergencyExitTags(tags) ||
    isInformationBoardTags(tags) ||
    isStepsTags(tags)
  );
}

function isPositiveWheelchairTags(tags: IndoorTags): boolean {
  return ["yes", "designated"].includes(tags.wheelchair as string);
}
