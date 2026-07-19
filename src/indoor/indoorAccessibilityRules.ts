import { ICONS } from "../../public/strings/constants.json";
import { UserFeatureEnum } from "../models/userFeatureEnum";
import { UserGroupEnum } from "../models/userGroupEnum";
import { lang } from "../services/languageService";
import {
  IndoorTags,
  isAccessibleToiletTags,
  isEmergencyExitTags,
  isEntranceTags,
  isGeneralToiletTags,
  hasSpeechOutputTags,
  hasWheelchairDescriptionTags,
  isInfoPointTags,
  isInformationBoardTags,
  isPositiveWheelchairTags,
  isStepsTags,
  isTactileInformationTags,
  isWheelchairAccessibleElevatorTags,
} from "./indoorTagFilters";

export type IndoorAccessibilityRuleMessage =
  string | ((tags: IndoorTags) => string | null | undefined);

export interface IndoorAccessibilityRule {
  id: string;
  matchesTags: (tags: IndoorTags) => boolean;
  userGroups: UserGroupEnum[];
  featureToggles?: UserFeatureEnum[];
  markerIcon?: string;
  hasMarker?: (tags: IndoorTags) => boolean;
  msgTrue: IndoorAccessibilityRuleMessage;
  msgFalse?: IndoorAccessibilityRuleMessage | null;
}

export const allAccessibilityUserGroups = [
  UserGroupEnum.blindPeople,
  UserGroupEnum.noImpairments,
  UserGroupEnum.wheelchairUsers,
];

export const indoorAccessibilityRules: IndoorAccessibilityRule[] = [
  {
    id: "tactile-information",
    matchesTags: isTactileInformationTags,
    hasMarker: (tags) => !isInfoPointTags(tags),
    userGroups: [UserGroupEnum.blindPeople],
    markerIcon: ICONS.INFO,
    featureToggles: [UserFeatureEnum.tactileLines],
    msgTrue: lang.featureAccessibilityTactileBoard,
    msgFalse: null,
  },
  {
    id: "accessible-toilet",
    matchesTags: isAccessibleToiletTags,
    userGroups: [UserGroupEnum.wheelchairUsers],
    markerIcon: ICONS.TOILETS_WHEELCHAIR,
    featureToggles: [UserFeatureEnum.accessibleToilets],
    msgTrue: lang.featureAccessibilityAccessibleToilet,
    msgFalse: null,
  },
  {
    id: "wheelchair-accessible-elevator",
    matchesTags: isWheelchairAccessibleElevatorTags,
    userGroups: [UserGroupEnum.wheelchairUsers],
    markerIcon: ICONS.ELEVATOR,
    featureToggles: [UserFeatureEnum.elevators],
    msgTrue: lang.featureAccessibilityElevator,
    msgFalse: null,
  },
  {
    id: "wheelchair-positive",
    matchesTags: isPositiveWheelchairTags,
    userGroups: [UserGroupEnum.wheelchairUsers],
    featureToggles: [UserFeatureEnum.ramps, UserFeatureEnum.service],
    msgTrue: lang.buildingAccessibilityWheelchairTrue,
    msgFalse: (tags) =>
      tags.wheelchair === undefined
        ? lang.buildingAccessibilityWheelchairUnknown
        : lang.buildingAccessibilityWheelchairFalse,
  },
  {
    id: "wheelchair-description-en",
    matchesTags: (tags) => hasWheelchairDescriptionTags(tags, "en"),
    userGroups: [UserGroupEnum.wheelchairUsers],
    msgTrue: (tags) => tags["wheelchair:description:en"] as string,
    msgFalse: null,
  },
  {
    id: "wheelchair-description-de",
    matchesTags: (tags) => hasWheelchairDescriptionTags(tags, "de"),
    userGroups: [UserGroupEnum.wheelchairUsers],
    msgTrue: (tags) => tags["wheelchair:description:de"] as string,
    msgFalse: null,
  },
  {
    id: "general-toilet",
    matchesTags: isGeneralToiletTags,
    userGroups: [UserGroupEnum.noImpairments, UserGroupEnum.blindPeople],
    markerIcon: ICONS.TOILETS,
    featureToggles: [UserFeatureEnum.toilets],
    msgTrue: (tags) =>
      (tags.male !== undefined
        ? lang.featureAccessibilityMale
        : tags.female !== undefined
          ? lang.featureAccessibilityFemale
          : lang.featureAccessibilityUnisex) + lang.featureAccessibilityToilet,
    msgFalse: null,
  },
  {
    id: "entrance",
    matchesTags: isEntranceTags,
    userGroups: allAccessibilityUserGroups,
    markerIcon: ICONS.ENTRANCE,
    featureToggles: [UserFeatureEnum.entrancesExits],
    msgTrue: (tags) =>
      (tags.entrance === "main"
        ? lang.featureAccessibilityMain
        : tags.entrance === "secondary"
          ? lang.featureAccessibilitySecondary
          : "") + lang.featureAccessibilityEntrance,
    msgFalse: null,
  },
  {
    id: "emergency-exit",
    matchesTags: isEmergencyExitTags,
    userGroups: allAccessibilityUserGroups,
    markerIcon: ICONS.EMERGENCY_EXIT,
    featureToggles: [UserFeatureEnum.emergencyExits],
    msgTrue: lang.featureAccessibilityExit,
    msgFalse: null,
  },
  {
    id: "information-board",
    matchesTags: isInformationBoardTags,
    userGroups: [UserGroupEnum.noImpairments, UserGroupEnum.wheelchairUsers],
    markerIcon: ICONS.INFO,
    featureToggles: [UserFeatureEnum.service, UserFeatureEnum.tactileLines],
    msgTrue: lang.featureAccessibilityInformationBoard,
    msgFalse: null,
  },
  {
    id: "stairs",
    matchesTags: isStepsTags,
    userGroups: [UserGroupEnum.noImpairments, UserGroupEnum.blindPeople],
    markerIcon: ICONS.STAIRS,
    featureToggles: [UserFeatureEnum.stairs],
    msgTrue: lang.userProfileStairs,
    msgFalse: null,
  },
  {
    id: "speech-output",
    matchesTags: hasSpeechOutputTags,
    userGroups: [UserGroupEnum.blindPeople],
    msgTrue: lang.featureAccessibilitySpeech,
    msgFalse: null,
  },
];
