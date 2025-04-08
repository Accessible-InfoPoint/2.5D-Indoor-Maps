import { UserGroupEnum } from "../models/userGroupEnum";
import { lang } from "../services/languageService";

const UserGroups = new Map<UserGroupEnum, any>();
UserGroups.set(UserGroupEnum.blindPeople, {
  name: lang.userProfileVisImpairments,
  icon: "\\images\\eye.svg",
});
UserGroups.set(UserGroupEnum.noImpairments, {
  name: lang.userProfileNoSpecialNeeds,
  icon: "\\images\\nothing.svg",
});
UserGroups.set(UserGroupEnum.wheelchairUsers, {
  name: lang.userProfileWheelchair,
  icon: "accessible",
});

export { UserGroups };
