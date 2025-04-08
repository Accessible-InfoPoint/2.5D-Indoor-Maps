import { AccessibilityPropertiesInterface } from "../models/accessibilityPropertiesInterface";
import { UserGroupEnum } from "../models/userGroupEnum";
import { lang } from "../services/languageService";
import { ICONS } from "../../public/strings/constants.json";
import { UserFeatureEnum } from "../models/userFeatureEnum";

const allGroups = [
  UserGroupEnum.blindPeople,
  UserGroupEnum.noImpairments,
  UserGroupEnum.wheelchairUsers,
];

/**
 * List of all possible accessibility features, which can be shown on click or by indication icons.
 * Currently, only the very FIRST hit in this list is shown.
 * So the most specific properties should be listed first, afterwards the more general ones.
 */
export const featureAccessibilityProperties: AccessibilityPropertiesInterface[] =
  [
    /* ================ blind people ================ */
    /* tactile information board / tactile map */
    {
      hasCorrectProperties: (f) =>
        f.properties.information !== undefined &&
        ["tactile_map", "tactile_model", "braille", "tactile_letters"].includes(
          f.properties.information
        ),
      msgTrue: lang.featureAccessibilityTactileBoard,
      msgFalse: null,
      userGroups: [UserGroupEnum.blindPeople],
      iconFilename: ICONS.INFO,
      tags: [UserFeatureEnum.tactileLines],
    },
    {
      hasCorrectProperties: (f) =>
        f.properties["speech_output:de"] !== undefined ||
        f.properties["speech_output:en"] !== undefined ||
        f.properties["speech_output"] !== undefined,
      msgTrue: lang.featureAccessibilitySpeech,
      msgFalse: null,
      userGroups: [UserGroupEnum.blindPeople],
    },

    /* ================ wheelchair users ================ */
    {
      hasCorrectProperties: (f) =>
        f.properties.amenity !== undefined &&
        f.properties.amenity === "toilets" &&
        f.properties.wheelchair !== undefined &&
        ["yes", "designated"].includes(f.properties.wheelchair),
      msgTrue: lang.featureAccessibilityAccessibleToilet,
      msgFalse: null,
      userGroups: [UserGroupEnum.wheelchairUsers],
      iconFilename: ICONS.TOILETS_WHEELCHAIR,
      tags: [UserFeatureEnum.accessibleToilets],
    },
    {
      hasCorrectProperties: (f) =>
        f.properties.highway !== undefined &&
        f.properties.highway === "elevator" &&
        f.properties.wheelchair !== undefined &&
        ["yes", "designated"].includes(f.properties.wheelchair),
      msgTrue: lang.featureAccessibilityElevator,
      msgFalse: null,
      userGroups: [UserGroupEnum.wheelchairUsers],
      iconFilename: ICONS.ELEVATOR,
      tags: [UserFeatureEnum.elevators],
    },
    {
      hasCorrectProperties: (f) =>
        f.properties.wheelchair !== undefined &&
        ["yes", "designated"].includes(f.properties.wheelchair),
      msgTrue: lang.buildingAccessibilityWheelchairTrue,
      msgFalse: (f) => f.properties.wheelchair === undefined ? lang.buildingAccessibilityWheelchairUnknown : lang.buildingAccessibilityWheelchairFalse,
      userGroups: [UserGroupEnum.wheelchairUsers],
      // iconFilename: ICONS.WHEELCHAIR,
      tags: [UserFeatureEnum.ramps, UserFeatureEnum.service],
    },
    {
      hasCorrectProperties: (f) =>
        f.properties["wheelchair:description:en"] !== undefined,
      msgTrue: (f) => f.properties["wheelchair:description:en"],
      msgFalse: null,
      userGroups: [UserGroupEnum.wheelchairUsers],
    },
    {
      hasCorrectProperties: (f) =>
        f.properties["wheelchair:description:de"] !== undefined,
      msgTrue: (f) => f.properties["wheelchair:description:de"],
      msgFalse: null,
      userGroups: [UserGroupEnum.wheelchairUsers],
    },

    /* ================ general features ================ */
    /* toilets - general (no wheelchair) */
    {
      hasCorrectProperties: (f) =>
        f.properties.amenity !== undefined &&
        f.properties.amenity === "toilets" &&
        (f.properties.wheelchair === undefined ||
          !["yes", "designated"].includes(f.properties.wheelchair)),
      msgTrue: (f) =>
        (f.properties.male !== undefined
          ? lang.featureAccessibilityMale
          : (
            f.properties.female !== undefined
            ? lang.featureAccessibilityFemale
            : lang.featureAccessibilityUnisex
          )
        ) + lang.featureAccessibilityToilet,
      msgFalse: null,
      userGroups: [UserGroupEnum.noImpairments, UserGroupEnum.blindPeople],
      iconFilename: ICONS.TOILETS,
      tags: [UserFeatureEnum.toilets],
    },
    /* entrances (general) */
    {
      hasCorrectProperties: (f) =>
        f.properties.entrance !== undefined &&
        ["yes", "main", "secondary"].includes(f.properties.entrance),
      msgTrue: (f) =>
        (f.properties.entrance === "main"
          ? lang.featureAccessibilityMain
          : (
            f.properties.entrance === "secondary"
            ? lang.featureAccessibilitySecondary
            : ""
          )
        ) + lang.featureAccessibilityEntrance,
      msgFalse: null,
      userGroups: allGroups,
      iconFilename: ICONS.ENTRANCE,
      tags: [UserFeatureEnum.entrancesExits],
    },
    /* emergency exits (general) */
    {
      hasCorrectProperties: (f) =>
        (f.properties.exit !== undefined && ["yes", "emergency"].includes(f.properties.exit)) ||
        (f.properties.entrance !== undefined && ["exit", "emergency"].includes(f.properties.entrance)),
      msgTrue: lang.featureAccessibilityExit,
      msgFalse: null,
      userGroups: allGroups,
      iconFilename: ICONS.EMERGENCY_EXIT,
      tags: [UserFeatureEnum.emergencyExits],
    },
    /* information boards (general, except blind people) */
    {
      hasCorrectProperties: (f) =>
        f.properties.information !== undefined && ["board", "map"].includes(f.properties.information),
      msgTrue: lang.featureAccessibilityInformationBoard,
      msgFalse: null,
      userGroups: [UserGroupEnum.noImpairments, UserGroupEnum.wheelchairUsers],
      iconFilename: ICONS.INFO,
      tags: [UserFeatureEnum.service, UserFeatureEnum.tactileLines],
    },

    /* stairs (general, except wheelchair users) */
    {
      hasCorrectProperties: (f) =>
        (f.properties.highway !== undefined &&  f.properties.highway === "steps") ||
        (f.properties.stairs !== undefined && f.properties.stairs === "yes"),
      msgTrue: lang.userProfileStairs,
      msgFalse: null,
      userGroups: [UserGroupEnum.noImpairments, UserGroupEnum.blindPeople],
      iconFilename: ICONS.STAIRS,
      tags: [UserFeatureEnum.stairs],
    },
  ];
