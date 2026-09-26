import { Modal } from "bootstrap";
import { COLOR_PROFS } from "../../../../public/strings/colorProfiles.json";
import UserProfileModal from "./userProfileModal";
import ColorService from "../../../services/colorService";
import MobileLayoutService, { MobileHandedness } from "../../../services/mobileLayoutService";
import { lang } from "../../../services/languageService";
import { getRequiredElement } from "../../../utils/domHelpers";

type SettingsChangeHandler = () => void;

const userVisualSettingsModal = new Modal(getRequiredElement("userVisualSettingsModal"), {
  backdrop: "static",
});

const colorBlindnessList = getRequiredElement("colorBlindnessList");
const contrastSettingsList = getRequiredElement("contrastSettingsList");
const mobileHandednessList = getRequiredElement("mobileHandednessList");
const mobileZoomButtonsList = getRequiredElement("mobileZoomButtonsList");

const state: {
  selectedColorProfile: string;
  colorProfiles: string[];
  contrastSettings: {
    environmentOpacity: [opacity: number, name: string];
    colorStrength: [opacity: number, name: string];
    lineThickness: [opacity: number, name: string];
  };
  mobileHandedness: MobileHandedness;
  mobileShowZoomButtons: boolean;
} = {
  selectedColorProfile: ColorService.getCurrentProfile(),
  colorProfiles: COLOR_PROFS,
  contrastSettings: {
    environmentOpacity: [ColorService.getEnvOpacity(), lang.environmentOpacity],
    colorStrength: [ColorService.getColorStrength(), lang.colorStrength],
    lineThickness: [ColorService.getLineThickness(), lang.lineThickness],
  },
  mobileHandedness: MobileLayoutService.getHandedness(),
  mobileShowZoomButtons: MobileLayoutService.getShowZoomButtons(),
};

function render(onSettingsChanged: SettingsChangeHandler): void {
  syncStateFromStorage();
  colorBlindnessList.innerHTML = "";
  contrastSettingsList.innerHTML = "";
  mobileHandednessList.innerHTML = "";
  mobileZoomButtonsList.innerHTML = "";
  renderColorBlindnessList();
  renderContrastSettingsList();
  renderMobileHandednessList();
  renderMobileZoomButtonsList();

  getRequiredElement("visualSettingsLabel").innerText = lang.visualSettingsLabel;
  getRequiredElement("colorBlindnessHeader").innerText = lang.colorBlindnessHeader;
  getRequiredElement("contrastSettingsHeader").innerText = lang.contrastSettingsHeader;
  getRequiredElement("mobileLayoutHeader").innerText = lang.mobileLayoutSectionHeader;

  const saveFeaturesButton = getRequiredElement("saveVisualSettings");
  saveFeaturesButton.onclick = () => onSave(onSettingsChanged);
}

function syncStateFromStorage(): void {
  state.selectedColorProfile = ColorService.getCurrentProfile();
  state.contrastSettings.environmentOpacity[0] = ColorService.getEnvOpacity();
  state.contrastSettings.colorStrength[0] = ColorService.getColorStrength();
  state.contrastSettings.lineThickness[0] = ColorService.getLineThickness();
  state.mobileHandedness = MobileLayoutService.getHandedness();
  state.mobileShowZoomButtons = MobileLayoutService.getShowZoomButtons();
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

function renderMobileHandednessList(): void {
  mobileHandednessList.append(renderHandednessOption("right", lang.mobileHandednessRight));
  mobileHandednessList.append(renderHandednessOption("left", lang.mobileHandednessLeft));
}

function renderHandednessOption(value: MobileHandedness, label: string): HTMLDivElement {
  const radio_div = document.createElement("div");
  const radio = document.createElement("input");
  const radioLabel = document.createElement("label");

  radio_div.className = "form-check";
  radio.className = "form-check-input";
  radio.type = "radio";
  radio.name = "mobileHandedness";
  radio.id = `mobileHandedness_${value}`;
  radio.checked = state.mobileHandedness === value;
  radio.onchange = () => {
    state.mobileHandedness = value;
  };

  radioLabel.className = "form-check-label";
  radioLabel.htmlFor = radio.id;
  radioLabel.innerText = label;

  radio_div.appendChild(radio);
  radio_div.appendChild(radioLabel);

  return radio_div;
}

function renderMobileZoomButtonsList(): void {
  const checkbox_div = document.createElement("div");
  const checkbox = document.createElement("input");
  const label = document.createElement("label");

  checkbox_div.className = "form-check";
  checkbox.className = "form-check-input";
  checkbox.type = "checkbox";
  checkbox.id = "mobileShowZoomButtons";
  checkbox.checked = state.mobileShowZoomButtons;
  checkbox.onchange = (e: Event) => {
    state.mobileShowZoomButtons = (<HTMLInputElement>e.target).checked;
  };

  label.className = "form-check-label";
  label.htmlFor = checkbox.id;
  label.innerText = lang.mobileShowZoomButtonsLabel;

  checkbox_div.appendChild(checkbox);
  checkbox_div.appendChild(label);

  mobileZoomButtonsList.appendChild(checkbox_div);
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
  MobileLayoutService.setHandedness(state.mobileHandedness);
  MobileLayoutService.setShowZoomButtons(state.mobileShowZoomButtons);
  onSettingsChanged();
}

function hide(): void {
  userVisualSettingsModal.hide();
}

export default {
  hide,
  render,
};
