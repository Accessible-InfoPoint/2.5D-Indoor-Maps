import { Modal } from "bootstrap";
import FeatureService from "../../../services/featureService";
import { UserFeatureSelection } from "../../../data/userFeatureSelection";
import UserProfileModal from "./userProfileModal";
import UserService from "../../../services/userService";
import { lang } from "../../../services/languageService";
import { getRequiredElement } from "../../../utils/domHelpers";

type SettingsChangeHandler = () => void;

const userFeatureSelectionModal = new Modal(
  getRequiredElement("userFeatureSelectionModal"),
  { backdrop: "static", keyboard: false }
);

let checkboxState = FeatureService.getCurrentFeatures();

function render(onSettingsChanged: SettingsChangeHandler): void {
  //create checkboxes and headings
  checkboxState = FeatureService.getCurrentFeatures();
  const currentProfile = UserService.getCurrentProfile();
  const userAccessibleFeatureList = getRequiredElement(
    "userAccessibleFeatureList"
  );
  const userFeatureList = getRequiredElement("userFeatureList");
  userAccessibleFeatureList.innerHTML = "";
  userFeatureList.innerHTML = "";
  userAccessibleFeatureList.style.removeProperty("display");
  userFeatureList.style.removeProperty("display");
  if (userAccessibleFeatureList.previousElementSibling instanceof HTMLElement)
    userAccessibleFeatureList.previousElementSibling.style.removeProperty("display");
  if (userFeatureList.previousElementSibling instanceof HTMLElement)
    userFeatureList.previousElementSibling.style.removeProperty("display");

  UserFeatureSelection.forEach((v) => {
    if (v.userGroups.some((g: any) => g === currentProfile)) {
      if (v.accessibleFeature) {
        userAccessibleFeatureList.append(renderCheckbox(v));
      } else {
        userFeatureList.append(renderCheckbox(v));
      }
    }
  });

  getRequiredElement("userFeatureModalLabel").innerText =
    lang.userFeatureModalLabel;
  getRequiredElement("featureSelectionHeader").innerText =
    lang.featureSelectionHeader;
  getRequiredElement("accessibleFeatureSelectionHeader").innerText =
    lang.accessibleFeatureSelectionHeader;

  const saveFeaturesButton = getRequiredElement("saveFeatureSelection");
  saveFeaturesButton.onclick = () => onSave(onSettingsChanged);

  removeEmpty();
}

function removeEmpty() {
  [
    getRequiredElement("userFeatureList"),
    getRequiredElement("userAccessibleFeatureList"),
  ].forEach((l) => {
    if (!l.hasChildNodes()) {
      l.style.display = "none";

      if (l.previousElementSibling instanceof HTMLElement) {
        l.previousElementSibling.style.display = "none";
      }
    }
  });
}

function renderCheckbox(v: any): HTMLDivElement {
  const checkbox_div = document.createElement("div");
  const checkbox = document.createElement("input");
  const label = document.createElement("label");

  checkbox_div.className = "form-check";

  checkbox.className = "form-check-input";
  checkbox.type = "checkbox";
  checkbox.id = v.id;

  checkbox.checked = checkboxState.get(v.id) ?? false;

  checkbox.onchange = () => {
    checkboxState.set(v.id, checkbox.checked);
  };

  label.className = "form-check-label";
  label.htmlFor = v.id;
  label.innerText = getFeatureName(v.id);

  checkbox_div.appendChild(checkbox);
  checkbox_div.appendChild(label);

  return checkbox_div;
}

function getFeatureName(id: string): string {
  switch (id) {
    case "entrancesExits":
      return lang.userProfileEntranceExit;
    case "toilets":
      return lang.userProfileToilets;
    case "elevators":
      return lang.userProfileElevators;
    case "stairs":
      return lang.userProfileStairs;
    case "emergencyExits":
      return lang.userProfileEmergencyExit;
    case "service":
      return lang.userProfileServices;
    case "ramps":
      return lang.userProfileRamps;
    case "tactileLines":
      return lang.userProfileTactileLines;
    case "disabledParking":
      return lang.userProfileDisabledParking;
    case "accessibleToilets":
      return lang.userProfileAccessibleToilets;
    default:
      return id;
  }
}

function hide(): void {
  userFeatureSelectionModal.hide();
}

function onSave(onSettingsChanged: SettingsChangeHandler): void {
  FeatureService.setCurrentFeatures(checkboxState);
  UserProfileModal.hideAll();
  onSettingsChanged();
}

export default {
  hide,
  render,
  checkboxState,
};
