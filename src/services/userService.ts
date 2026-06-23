import { UserGroupEnum } from "../models/userGroupEnum";

const profileKey = "userProfile";
const featureKey = "currentlySelectedFeatures";

function getCurrentProfile(): UserGroupEnum {
  const storedProfile = localStorage.getItem(profileKey);
  const profile = storedProfile
    ? <UserGroupEnum>parseInt(storedProfile)
    : UserGroupEnum.noImpairments;

  return profile;
}

function setProfile(profile: UserGroupEnum): void {
  localStorage.setItem(profileKey, profile.toString());
  localStorage.removeItem(featureKey);
}

export default {
  getCurrentProfile,
  setProfile,
};
