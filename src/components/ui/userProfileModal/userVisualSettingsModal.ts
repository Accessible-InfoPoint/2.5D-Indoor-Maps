import { Modal } from "bootstrap";
import { COLOR_PROFS } from "../../../../public/strings/colorProfiles.json";
import UserProfileModal from "./userProfileModal";
import ColorService from "../../../services/colorService";
import { lang } from "../../../services/languageService";

const userVisualSettingsModal = new Modal(
  document.getElementById("userVisualSettingsModal"),
  { backdrop: "static", keyboard: false }
);

const colorBlindnessList = document.getElementById("colorBlindnessList");
const contrastSettingsList = document.getElementById("contrastSettingsList");

const state: {
  selectedColorProfile: string;
  colorProfiles: string[];
  contrastSettings: {
    environmentOpacity: [opacity: number, name: string];
    colorStrength: [opacity: number, name: string];
    lineThickness: [opacity: number, name: string];
  };
} = {
  selectedColorProfile: ColorService.getCurrentProfile(),
  colorProfiles: COLOR_PROFS,
  contrastSettings: {
    environmentOpacity: [ColorService.getEnvOpacity(), lang.environmentOpacity],
    colorStrength: [ColorService.getColorStrength(), lang.colorStrength],
    lineThickness: [ColorService.getLineThickness(), lang.lineThickness],
  },
};

function render(): void {
  renderColorBlindnessList();
  renderContrastSettingsList();

  document.getElementById("visualSettingsLabel").innerText =
    lang.visualSettingsLabel;
  document.getElementById("colorBlindnessHeader").innerText =
    lang.colorBlindnessHeader;
  document.getElementById("contrastSettingsHeader").innerText =
    lang.contrastSettingsHeader;

  const saveFeaturesButton = document.getElementById("saveVisualSettings");
  saveFeaturesButton.onclick = () => onSave();
}
function renderColorBlindnessList(): void {
  const { colorProfiles: profiles } = state;

  profiles.forEach((p) => {
    document.getElementById("colorBlindnessList").append(renderCheckbox(p));
  });
}

function renderCheckbox(profile: string): HTMLDivElement {
  const checkbox_div = document.createElement("div");
  const checkbox = document.createElement("input");
  const label = document.createElement("label");

  const { selectedColorProfile } = state;

  checkbox_div.className = "form-check";
  checkbox.className = "form-check-input";
  checkbox.type = "checkbox";
  checkbox.id = profile;

  checkbox.checked = profile === selectedColorProfile;

  checkbox.onchange = (e: Event) => {
    state.selectedColorProfile = (<HTMLElement>e.currentTarget).id;

    handleChange();
  };

  label.className = "form-check-label";
  label.htmlFor = profile;
  label.innerText = ColorService.getCurrentColorTranslation(profile);

  checkbox_div.appendChild(checkbox);
  checkbox_div.appendChild(label);

  return checkbox_div;
}

function renderContrastSettingsList(): void {
  const { contrastSettings } = state;

  Object.keys(contrastSettings).forEach((s) => {
    contrastSettingsList.append(renderRangeInput(s));
  });
}

function renderRangeInput(name: string): HTMLDivElement {
  type prop = keyof typeof state.contrastSettings;
  const range_div = document.createElement("div");
  range_div.innerHTML = `<label for="${name}" class="form-label">${
    state.contrastSettings[name as prop][1]
  }</label>
    <input type="range" class="form-range" id="${name}" step="10" min="0" max="100" value="${
    state.contrastSettings[name as prop][0]
  }">`;

  range_div.onchange = (e: Event) => {
    type prop = keyof typeof state.contrastSettings;
    const prop = (<HTMLElement>e.target).id;

    state.contrastSettings[prop as prop][0] = +(<HTMLInputElement>e.target)
      .value;
  };
  return range_div;
}

function handleChange() {
  colorBlindnessList.innerHTML = "";
  renderColorBlindnessList();
}

function onSave() {
  //featureService.setCurrentFeatures(checkboxState);
  UserProfileModal.hideAll();

  ColorService.setCurrentProfile(state.selectedColorProfile);
  ColorService.setEnvOpacity(state.contrastSettings.environmentOpacity[0]);
  ColorService.setColorStrength(state.contrastSettings.colorStrength[0]);
  ColorService.setLineThickness(state.contrastSettings.lineThickness[0]);

  /*
   * Hack: reload window location to properly update all profile-specific information.
   * Relevant data is stored in localStorage and remains persistent after reload.
   */
  setTimeout(window.location.reload.bind(window.location), 200);
}

function hide(): void {
  userVisualSettingsModal.hide();
}

export default {
  hide,
  render,
};
