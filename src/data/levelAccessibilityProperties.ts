import { UserGroupEnum } from "../models/userGroupEnum";
import { AccessibilityPropertiesInterface } from "../models/accessibilityPropertiesInterface";
import { lang } from "../services/languageService";

export const levelAccessibilityProperties: AccessibilityPropertiesInterface[] =
  [
    {
      hasCorrectProperties: (f) =>
        f.properties.amenity !== undefined &&
        f.properties.amenity === "toilets" &&
        f.properties.wheelchair !== undefined &&
        f.properties.wheelchair !== "no",
      msgTrue: lang.buildingAccessibilityToiletsTrue,
      msgFalse: lang.buildingAccessibilityToiletsFalse,
      userGroups: [UserGroupEnum.wheelchairUsers],
    },
    {
      hasCorrectProperties: (f) =>
        f.properties.tactile_paving !== undefined &&
        f.properties.tactile_paving === "yes",
      msgTrue: lang.buildingAccessibilityTactilePavingTrue,
      msgFalse: lang.buildingAccessibilityTactilePavingFalse,
      userGroups: [UserGroupEnum.blindPeople],
    },
    {
      hasCorrectProperties: (f) =>
        f.properties.highway !== undefined &&
        f.properties.highway === "elevator" &&
        f.properties.wheelchair !== undefined &&
        f.properties.wheelchair !== "no",
      msgTrue: lang.buildingAccessibilityElevatorTrue,
      msgFalse: lang.buildingAccessibilityElevatorFalse,
      userGroups: [UserGroupEnum.wheelchairUsers],
    },
    {
      hasCorrectProperties: (f) =>
        ["de", "en"].some(
          (lng) =>
            (f.properties.tactile_writing !== undefined &&
              f.properties.tactile_writing === "yes") ||
            (f.properties["tactile_writing:embossed_printed_letters:" + lng] !==
              undefined &&
              f.properties[
                "tactile_writing:embossed_printed_letters:" + lng
              ] === "yes") ||
            (f.properties["tactile_writing:engraved_printed_letters:" + lng] !==
              undefined &&
              f.properties[
                "tactile_writing:engraved_printed_letters:" + lng
              ] === "yes") ||
            (f.properties["tactile_writing:braille:" + lng] !== undefined &&
              f.properties["tactile_writing:braille:" + lng] === "yes") ||
            (f.properties["tactile_writing:computer_braille:" + lng] !==
              undefined &&
              f.properties["tactile_writing:computer_braille:" + lng] ===
                "yes") ||
            (f.properties["tactile_writing:fakoo:" + lng] !== undefined &&
              f.properties["tactile_writing:fakoo:" + lng] === "yes") ||
            (f.properties["tactile_writing:moon:" + lng] !== undefined &&
              f.properties["tactile_writing:moon:" + lng] === "yes")
        ),
      msgTrue: lang.buildingAccessibilityTactileWritingTrue,
      msgFalse: lang.buildingAccessibilityTactileWritingFalse,
      userGroups: [UserGroupEnum.blindPeople],
    },
    {
      hasCorrectProperties: (f) =>
        f.properties.highway !== undefined &&
        f.properties.highway === "elevator" &&
        ((f.properties["speech_output:en"] !== undefined &&
          f.properties["speech_output:en"] === "yes") ||
          (f.properties["speech_output:de"] !== undefined &&
            f.properties["speech_output:de"] === "yes")),
      msgTrue: lang.buildingAccessibilityElevatorSpeechTrue,
      msgFalse: lang.buildingAccessibilityElevatorSpeechFalse,
      userGroups: [UserGroupEnum.blindPeople],
    },
  ];
