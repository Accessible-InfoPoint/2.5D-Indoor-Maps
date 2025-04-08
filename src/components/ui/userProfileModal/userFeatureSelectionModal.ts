import { Modal } from "bootstrap";
import FeatureService from "../../../services/featureService";
import { UserFeatureSelection } from "../../../data/userFeatureSelection";
import UserProfileModal from "./userProfileModal";
import UserService from "../../../services/userService";
import { lang } from "../../../services/languageService";

const userFeatureSelectionModal = new Modal(
  document.getElementById("userFeatureSelectionModal"),
  { backdrop: "static", keyboard: false }
);

const checkboxState = FeatureService.getCurrentFeatures();

function render(): void {
  //create checkboxes and headings
  const currentProfile = UserService.getCurrentProfile();
  UserFeatureSelection.forEach((v) => {
    if (v.userGroups.some((g: any) => g === currentProfile)) {
      if (v.accessibleFeature) {
        document
          .getElementById("userAccessibleFeatureList")
          .append(renderCheckbox(v));
      } else {
        document.getElementById("userFeatureList").append(renderCheckbox(v));
      }
    }
  });

  document.getElementById("userFeatureModalLabel").innerText = lang.userFeatureModalLabel;
  document.getElementById("featureSelectionHeader").innerText = lang.featureSelectionHeader;
  document.getElementById("accessibleFeatureSelectionHeader").innerText = lang.accessibleFeatureSelectionHeader;

  const saveFeaturesButton = document.getElementById("saveFeatureSelection");
  saveFeaturesButton.onclick = () => onSave();

  removeEmpty();
}

function removeEmpty() {
  [
    document.getElementById("userFeatureList"),
    document.getElementById("userAccessibleFeatureList"),
  ].forEach((l) => {
    if (!l.hasChildNodes()) {
      l.style.display = "none";
      // @ts-ignore
      l.previousElementSibling.style.display = "none";
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

  checkbox.checked = checkboxState.get(v.id);

  checkbox.onchange = () => {
    checkboxState.set(v.id, checkbox.checked);
  };

  label.className = "form-check-label";
  label.htmlFor = v.id;
  label.innerText = v.name;

  checkbox_div.appendChild(checkbox);
  checkbox_div.appendChild(label);

  return checkbox_div;
}

function hide(): void {
  userFeatureSelectionModal.hide();
}

function onSave(): void {
  FeatureService.setCurrentFeatures(checkboxState);
  UserProfileModal.hideAll();

  /*
   * Hack: reload window location to properly update all profile-specific information.
   * Relevant data is stored in localStorage and remains persistent after reload.
   */
  setTimeout(window.location.reload.bind(window.location), 200);
}

export default {
  hide,
  render,
  checkboxState,
};
