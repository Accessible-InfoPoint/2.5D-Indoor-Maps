import UserService from "../../../services/userService";
import LanguageService, { lang } from "../../../services/languageService";
import FeatureSelectionModal from "./userFeatureSelectionModal";
import { UserGroups } from "../../../data/userGroups";
import { UserSettings } from "../../../data/userSettings";
import { UserGroupEnum } from "../../../models/userGroupEnum";
import { LanguageSettings } from "../../../data/languageSettings";
import { LanguageSettingsEnum } from "../../../models/languageSettingsEnum";
import { getRequiredElement } from "../../../utils/domHelpers";
import VisualSettingsModal from "./userVisualSettingsModal";

function render(): void {
  renderProfiles(); //profile quick switch
  renderSettings(); //settings
  renderLanguages(); //language selection

  renderLinkedModals();
}

function renderProfiles(): void {
  const userProfileList = getRequiredElement("userProfileList");
  userProfileList.innerHTML = "";

  const label = document.createElement("li");
  label.innerHTML = lang.profiles;
  label.ariaHidden = "true";
  label.className = "label";
  userProfileList.appendChild(label);

  UserGroups.forEach((v, k) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.className = "square";
    if (v.icon.startsWith("\\")) {
      button.innerHTML = '<img aria-label="' + v.name + '" title="' + v.name + '" src="' + v.icon + '" width="35" height="35" ></span>';
    } else {
      button.innerHTML = '<span aria-label="' + v.name + '" title="' + v.name + '"><i class="material-icons">' + v.icon + "</i></span>";
    }
    button.onclick = () => setUserProfile(k);

    if (UserService.getCurrentProfile() === k) {
      button.classList.add("active");
    }

    li.appendChild(button);

    userProfileList.appendChild(li);
  });
}
function renderSettings(): void {
  const userSettingsList = getRequiredElement("userSettingsList");
  userSettingsList.innerHTML = "";

  const label = document.createElement("li");
  label.innerHTML = lang.settingsHeader;
  label.ariaHidden = "true";
  label.className = "label";
  userSettingsList.appendChild(label);

  UserSettings.forEach((v) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.className = "square";
    button.innerHTML = '<span aria-label="' + v.name + '" title="' + v.name + '"><i class="material-icons">' + v.icon + "</i></span>";
    button.setAttribute("data-bs-target", v.linkedModal);
    button.setAttribute("data-bs-toggle", "modal");

    li.appendChild(button);
    userSettingsList.appendChild(li);
  });
}

function renderLanguages(): void {
  const languageList = getRequiredElement("languageList");
  languageList.innerHTML = "";

  const label = document.createElement("li");
  label.innerHTML = lang.languageHeader;
  label.ariaHidden = "true";
  label.className = "label";
  languageList.appendChild(label);

  LanguageSettings.forEach((v, k) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.className = "square";
    button.innerHTML = '<span aria-label="' + v.name + '" title="' + v.name + '">' + v.display + "</span>";
    button.onclick = () => setLanguage(k);

    if (LanguageService.getCurrentLanguage() === k) {
      button.classList.add("active");
    }

    li.appendChild(button);
    languageList.appendChild(li);
  });
}

function renderLinkedModals() {
  FeatureSelectionModal.render();
  VisualSettingsModal.render();
}

function show(): void {
  getRequiredElement("userProfileList").focus();
}
function hideAll(): void {
  FeatureSelectionModal.hide();
  VisualSettingsModal.hide();
}

function setUserProfile(userGroup: UserGroupEnum): void {
  UserService.setProfile(userGroup);
  hideAll();
}

function setLanguage(language: LanguageSettingsEnum): void {
  LanguageService.setLanguage(language);
  hideAll();
}

export default {
  render,
  show,
  hideAll,
  setUserProfile,
};
