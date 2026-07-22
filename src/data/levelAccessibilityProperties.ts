import { UserGroupEnum } from "../models/userGroupEnum";
import { lang } from "../services/languageService";
import { IndoorTags, hasSpeechOutputTags } from "../indoor/indoorTagFilters";

interface LevelAccessibilityProperty {
  hasCorrectTags: (tags: IndoorTags) => boolean;
  msgTrue: string;
  msgFalse: string | null;
  userGroups: UserGroupEnum[];
}

export const levelAccessibilityProperties: LevelAccessibilityProperty[] = [
  {
    hasCorrectTags: (tags) =>
      tags.amenity === "toilets" && tags.wheelchair !== undefined && tags.wheelchair !== "no",
    msgTrue: lang.buildingAccessibilityToiletsTrue,
    msgFalse: lang.buildingAccessibilityToiletsFalse,
    userGroups: [UserGroupEnum.wheelchairUsers],
  },
  {
    hasCorrectTags: (tags) => tags.tactile_paving === "yes",
    msgTrue: lang.buildingAccessibilityTactilePavingTrue,
    msgFalse: lang.buildingAccessibilityTactilePavingFalse,
    userGroups: [UserGroupEnum.blindPeople],
  },
  {
    hasCorrectTags: (tags) =>
      tags.highway === "elevator" && tags.wheelchair !== undefined && tags.wheelchair !== "no",
    msgTrue: lang.buildingAccessibilityElevatorTrue,
    msgFalse: lang.buildingAccessibilityElevatorFalse,
    userGroups: [UserGroupEnum.wheelchairUsers],
  },
  {
    hasCorrectTags: (tags) =>
      ["de", "en"].some(
        (lng) =>
          tags.tactile_writing === "yes" ||
          tags["tactile_writing:embossed_printed_letters:" + lng] === "yes" ||
          tags["tactile_writing:engraved_printed_letters:" + lng] === "yes" ||
          tags["tactile_writing:braille:" + lng] === "yes" ||
          tags["tactile_writing:computer_braille:" + lng] === "yes" ||
          tags["tactile_writing:fakoo:" + lng] === "yes" ||
          tags["tactile_writing:moon:" + lng] === "yes",
      ),
    msgTrue: lang.buildingAccessibilityTactileWritingTrue,
    msgFalse: lang.buildingAccessibilityTactileWritingFalse,
    userGroups: [UserGroupEnum.blindPeople],
  },
  {
    hasCorrectTags: (tags) => tags.highway === "elevator" && hasSpeechOutputTags(tags),
    msgTrue: lang.buildingAccessibilityElevatorSpeechTrue,
    msgFalse: lang.buildingAccessibilityElevatorSpeechFalse,
    userGroups: [UserGroupEnum.blindPeople],
  },
];
