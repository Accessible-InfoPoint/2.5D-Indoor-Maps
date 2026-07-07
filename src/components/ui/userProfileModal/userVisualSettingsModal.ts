import { Modal } from "bootstrap";
import { COLOR_PROFS } from "../../../../public/strings/colorProfiles.json";
import UserProfileModal from "./userProfileModal";
import ColorService from "../../../services/colorService";
import { lang } from "../../../services/languageService";
import { getRequiredElement } from "../../../utils/domHelpers";

type SettingsChangeHandler = () => void;

const userVisualSettingsModal = new Modal(getRequiredElement("userVisualSettingsModal"), {
  backdrop: "static",
});

const colorBlindnessList = getRequiredElement("colorBlindnessList");
const contrastSettingsList = getRequiredElement("contrastSettingsList");

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

function render(onSettingsChanged: SettingsChangeHandler): void {
  syncStateFromStorage();
  colorBlindnessList.innerHTML = "";
  contrastSettingsList.innerHTML = "";
  renderColorBlindnessList();
  renderContrastSettingsList();

  getRequiredElement("visualSettingsLabel").innerText = lang.visualSettingsLabel;
  getRequiredElement("colorBlindnessHeader").innerText = lang.colorBlindnessHeader;
  getRequiredElement("contrastSettingsHeader").innerText = lang.contrastSettingsHeader;

  const saveFeaturesButton = getRequiredElement("saveVisualSettings");
  saveFeaturesButton.onclick = () => onSave(onSettingsChanged);
}

function syncStateFromStorage(): void {
  state.selectedColorProfile = ColorService.getCurrentProfile();
  state.contrastSettings.environmentOpacity[0] = ColorService.getEnvOpacity();
  state.contrastSettings.colorStrength[0] = ColorService.getColorStrength();
  state.contrastSettings.lineThickness[0] = ColorService.getLineThickness();
}
function renderColorBlindnessList(): void {
  const { colorProfiles: profiles } = state;

  profiles.forEach((p) => {
    colorBlindnessList.append(renderCheckbox(p));
  });
}

function renderCheckbox(profile: string): HTMLDivElement {
  const checkbox_div = document.createElement("div");
  const checkbox = document.createElement("input");
  const label = document.createElement("label");

  const { selectedColorProfile } = state;

  checkbox_div.className = "form-check";
  checkbox.className = "form-check-input";
  checkbox.type = "radio";
  checkbox.name = "colorProfile";
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

    state.contrastSettings[prop as prop][0] = +(<HTMLInputElement>e.target).value;
  };
  return range_div;
}

function handleChange() {
  colorBlindnessList.innerHTML = "";
  renderColorBlindnessList();
}

function onSave(onSettingsChanged: SettingsChangeHandler) {
  UserProfileModal.hideAll();

  ColorService.setCurrentProfile(state.selectedColorProfile);
  ColorService.setEnvOpacity(state.contrastSettings.environmentOpacity[0]);
  ColorService.setColorStrength(state.contrastSettings.colorStrength[0]);
  ColorService.setLineThickness(state.contrastSettings.lineThickness[0]);
  onSettingsChanged();
}

function hide(): void {
  userVisualSettingsModal.hide();
}

export default {
  hide,
  render,
};
