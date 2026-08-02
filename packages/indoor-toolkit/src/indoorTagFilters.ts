export type IndoorTags = Record<string, unknown>;

/** Return whether tags describe a toilet feature or room. */
export function isToiletTags(tags: IndoorTags): boolean {
  return tags.amenity === "toilets";
}

/** Return whether tags describe a toilet with positive wheelchair access. */
export function isAccessibleToiletTags(tags: IndoorTags): boolean {
  return isToiletTags(tags) && isPositiveWheelchairTags(tags);
}

/** Return whether tags describe a toilet without positive wheelchair access. */
export function isGeneralToiletTags(tags: IndoorTags): boolean {
  return isToiletTags(tags) && !isPositiveWheelchairTags(tags);
}

/** Return whether tags describe a staircase, elevator, or escalator vertical connection. */
export function isStaircaseTags(tags: IndoorTags): boolean {
  return tags.stairs === "yes" || tags.highway === "elevator" || tags.highway === "escalator";
}

/** Return whether tags describe an elevator. */
export function isElevatorTags(tags: IndoorTags): boolean {
  return tags.highway === "elevator";
}

/** Return whether tags describe a wheelchair-accessible elevator. */
export function isWheelchairAccessibleElevatorTags(tags: IndoorTags): boolean {
  return isElevatorTags(tags) && isPositiveWheelchairTags(tags);
}

/** Return whether tags describe steps or a stair feature. */
export function isStepsTags(tags: IndoorTags): boolean {
  return tags.highway === "steps" || tags.stairs === "yes";
}

/** Return whether tags describe an enclosed indoor room. */
export function isRoomTags(tags: IndoorTags): boolean {
  return tags.indoor === "room";
}

/** Return whether tags describe an indoor corridor or open indoor area. */
export function isCorridorOrAreaTags(tags: IndoorTags): boolean {
  return ["corridor", "area"].includes(tags.indoor as string);
}

/** Return whether an area should be treated as a neutral room for door coloring. */
export function isNeutralDoorColorRoomTags(tags: IndoorTags): boolean {
  return (
    (isCorridorOrAreaTags(tags) || ["entrance", "corridor"].includes(tags.room as string)) &&
    tags.stairs !== "yes"
  );
}

/** Return whether a room is eligible for ordinary room labels. */
export function isRoomLabelEligibleTags(tags: IndoorTags): boolean {
  return (
    isRoomTags(tags) &&
    !isToiletTags(tags) &&
    tags.handrail === undefined &&
    tags.stairs === undefined
  );
}

/** Return whether tags describe tactile information. */
export function isTactileInformationTags(tags: IndoorTags): boolean {
  return ["tactile_map", "tactile_model", "braille", "tactile_letters"].includes(
    tags.information as string,
  );
}

/** Return whether tags describe the tactile-map information point convention. */
export function isInfoPointTags(tags: IndoorTags): boolean {
  return tags.information === "tactile_map";
}

/** Return whether tags describe a normal building entrance. */
export function isEntranceTags(tags: IndoorTags): boolean {
  return ["yes", "main", "secondary"].includes(tags.entrance as string);
}

/** Return whether tags describe an emergency exit. */
export function isEmergencyExitTags(tags: IndoorTags): boolean {
  return (
    ["yes", "emergency"].includes(tags.exit as string) ||
    ["exit", "emergency"].includes(tags.entrance as string)
  );
}

/** Return whether tags describe an information board or map. */
export function isInformationBoardTags(tags: IndoorTags): boolean {
  return ["board", "map"].includes(tags.information as string);
}

/** Return whether tags include speech output metadata. */
export function hasSpeechOutputTags(tags: IndoorTags): boolean {
  return (
    tags["speech_output:de"] !== undefined ||
    tags["speech_output:en"] !== undefined ||
    tags.speech_output !== undefined
  );
}

/** Return whether `wheelchair=*` is a positive access value used by the parser helpers. */
export function isPositiveWheelchairTags(tags: IndoorTags): boolean {
  return ["yes", "designated"].includes(tags.wheelchair as string);
}

/** Return whether tags include a wheelchair description in the requested language. */
export function hasWheelchairDescriptionTags(tags: IndoorTags, language: "de" | "en"): boolean {
  return tags[`wheelchair:description:${language}`] !== undefined;
}

/** Return whether tags match any point-feature predicate used by the parser. */
export function hasPotentialAccessibilityMarkerTags(tags: IndoorTags): boolean {
  return (
    isTactileInformationTags(tags) ||
    isAccessibleToiletTags(tags) ||
    isWheelchairAccessibleElevatorTags(tags) ||
    isGeneralToiletTags(tags) ||
    isEntranceTags(tags) ||
    isEmergencyExitTags(tags) ||
    isInformationBoardTags(tags) ||
    isStepsTags(tags)
  );
}
