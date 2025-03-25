import { UserGroupEnum } from "../models/userGroupEnum";

const profileKey = "userProfile";
const featureKey = "currentlySelectedFeatures";

function getCurrentProfile(): UserGroupEnum {
  const profile = localStorage.getItem(profileKey)
    ? <UserGroupEnum>parseInt(localStorage.getItem(profileKey))
    : UserGroupEnum.noImpairments;

  return profile;
}

function setProfile(profile: UserGroupEnum): void {
  localStorage.setItem(profileKey, profile.toString());
  localStorage.removeItem(featureKey);
  /*
   * Hack: reload window location to properly update all profile-specific information.
   * Relevant data is stored in localStorage and remains persistent after reload.
   */
  setTimeout(window.location.reload.bind(window.location), 200);
}

export default {
  getCurrentProfile,
  setProfile,
};
