import { AccessibilityPropertiesInterface } from "../models/accessibilityPropertiesInterface";
import { UserGroupEnum } from "../models/userGroupEnum";
import { lang } from "../services/languageService";

const allGroups = [
  UserGroupEnum.blindPeople,
  UserGroupEnum.noImpairments,
  UserGroupEnum.wheelchairUsers,
];

export const buildingAccessibilityProperties: AccessibilityPropertiesInterface[] =
  [
    {
      hasCorrectProperties: (f) =>
        f.properties.wheelchair !== undefined && f.properties.wheelchair === "yes",
      msgTrue: lang.buildingAccessibilityWheelchairTrue,
      msgFalse: (f) =>
        f.properties.wheelchair === undefined
          ? lang.buildingAccessibilityWheelchairUnknown
          : f.properties.wheelchair === "limited"
          ? lang.buildingAccessibilityWheelchairLimited
          : lang.buildingAccessibilityWheelchairFalse,
      userGroups: [UserGroupEnum.wheelchairUsers],
    },
    {
      hasCorrectProperties: (f) =>
        f.properties["wheelchair:description:de"] !== undefined,
      msgTrue: (f) => f.properties["wheelchair:description:de"],
      msgFalse: null,
      userGroups: [UserGroupEnum.wheelchairUsers],
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
        f.properties["toilets:wheelchair"] !== undefined &&
        f.properties["toilets:wheelchair"] === "yes",
      msgTrue: lang.buildingAccessibilityToiletsTrue,
      msgFalse: null,
      userGroups: [UserGroupEnum.wheelchairUsers],
    },
    {
      hasCorrectProperties: (f) => f.properties["opening_hours"] !== undefined,
      msgTrue: (f) => f.properties["opening_hours"],
      msgFalse: null,
      userGroups: allGroups,
    },
  ];
