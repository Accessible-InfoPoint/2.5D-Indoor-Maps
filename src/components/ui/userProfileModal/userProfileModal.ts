import UserService from "../../../services/userService";
import LanguageService, { lang } from "../../../services/languageService";
import FeatureSelectionModal from "./userFeatureSelectionModal";
import { UserGroups } from "../../../data/userGroups";
import { UserSettings } from "../../../data/userSettings";
import { UserGroupEnum } from "../../../models/userGroupEnum";
import { UserSettingsEnum } from "../../../models/userSettingsEnum";
import { LanguageSettings } from "../../../data/languageSettings";
import { LanguageSettingsEnum } from "../../../models/languageSettingsEnum";
import { getRequiredElement } from "../../../utils/domHelpers";
import VisualSettingsModal from "./userVisualSettingsModal";

type SettingsChangeHandler = () => void;

function render(onSettingsChanged: SettingsChangeHandler): void {
  renderProfiles(onSettingsChanged); //profile quick switch
  renderSettings(); //settings
  renderLanguages(onSettingsChanged); //language selection

  renderLinkedModals(onSettingsChanged);
}

function renderProfiles(onSettingsChanged: SettingsChangeHandler): void {
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
    const name = getUserProfileName(k);
    button.ariaLabel = name;
    button.title = name;
    button.appendChild(createProfileIcon(v.icon));
    button.onclick = () => setUserProfile(k, onSettingsChanged);

    if (UserService.getCurrentProfile() === k) {
      button.classList.add("active");
      button.setAttribute("aria-pressed", "true");
    } else {
      button.setAttribute("aria-pressed", "false");
    }

    li.appendChild(button);

    userProfileList.appendChild(li);
  });
}

function createProfileIcon(icon: string): HTMLElement {
  const iconElement = document.createElement("span");
  iconElement.ariaHidden = "true";

  if (icon.endsWith(".svg")) {
    iconElement.className = "profile-icon profile-svg-icon";
    iconElement.style.setProperty("--profile-icon-url", `url("${icon}")`);

    return iconElement;
  }

  const materialIcon = document.createElement("i");
  iconElement.className = "profile-icon";
  materialIcon.className = "material-icons";
  materialIcon.innerText = icon;
  iconElement.appendChild(materialIcon);

  return iconElement;
}

function renderSettings(): void {
  const userSettingsList = getRequiredElement("userSettingsList");
  userSettingsList.innerHTML = "";

  const label = document.createElement("li");
  label.innerHTML = lang.settingsHeader;
  label.ariaHidden = "true";
  label.className = "label";
  userSettingsList.appendChild(label);

  UserSettings.forEach((v, k) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    const name = getUserSettingName(k);
    button.className = "square";
    button.ariaLabel = name;
    button.title = name;
    button.innerHTML = '<span aria-label="' + name + '" title="' + name + '"><i class="material-icons">' + v.icon + "</i></span>";
    button.setAttribute("data-bs-target", v.linkedModal);
    button.setAttribute("data-bs-toggle", "modal");

    li.appendChild(button);
    userSettingsList.appendChild(li);
  });
}

function renderLanguages(onSettingsChanged: SettingsChangeHandler): void {
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
    button.onclick = () => setLanguage(k, onSettingsChanged);

    if (LanguageService.getCurrentLanguage() === k) {
      button.classList.add("active");
      button.setAttribute("aria-pressed", "true");
    } else {
      button.setAttribute("aria-pressed", "false");
    }

    li.appendChild(button);
    languageList.appendChild(li);
  });
}

function renderLinkedModals(onSettingsChanged: SettingsChangeHandler) {
  FeatureSelectionModal.render(onSettingsChanged);
  VisualSettingsModal.render(onSettingsChanged);
}

function show(): void {
  getRequiredElement("userProfileList").focus();
}
function hideAll(): void {
  FeatureSelectionModal.hide();
  VisualSettingsModal.hide();
}

function setUserProfile(userGroup: UserGroupEnum, onSettingsChanged: SettingsChangeHandler): void {
  UserService.setProfile(userGroup);
  hideAll();
  onSettingsChanged();
}

function setLanguage(language: LanguageSettingsEnum, onSettingsChanged: SettingsChangeHandler): void {
  LanguageService.setLanguage(language);
  hideAll();
  onSettingsChanged();
}

function getUserProfileName(userGroup: UserGroupEnum): string {
  switch (userGroup) {
    case UserGroupEnum.blindPeople:
      return lang.userProfileVisImpairments;
    case UserGroupEnum.wheelchairUsers:
      return lang.userProfileWheelchair;
    case UserGroupEnum.noImpairments:
    default:
      return lang.userProfileNoSpecialNeeds;
  }
}

function getUserSettingName(setting: UserSettingsEnum): string {
  switch (setting) {
    case UserSettingsEnum.visualSettings:
      return lang.userProfileVisualSettings;
    case UserSettingsEnum.featureSelection:
      return lang.userProfileFeatureSelection;
    default:
      return "";
  }
}

export default {
  render,
  show,
  hideAll,
  setUserProfile,
};
