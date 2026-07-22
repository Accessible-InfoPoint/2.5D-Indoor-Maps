import { UserGroupEnum } from "../models/userGroupEnum";

const profileKey = "userProfile";
const selectedElementsKey = "currentlySelectedElements";
const legacySelectedFeaturesKey = "currentlySelectedFeatures";

function getCurrentProfile(): UserGroupEnum {
  const storedProfile = localStorage.getItem(profileKey);
  const profile = storedProfile
    ? <UserGroupEnum>parseInt(storedProfile)
    : UserGroupEnum.noImpairments;

  return profile;
}

function setProfile(profile: UserGroupEnum): void {
  localStorage.setItem(profileKey, profile.toString());
  localStorage.removeItem(selectedElementsKey);
  localStorage.removeItem(legacySelectedFeaturesKey);
}

export default {
  getCurrentProfile,
  setProfile,
};
