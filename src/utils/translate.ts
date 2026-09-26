import LanguageService, { lang } from "../services/languageService";
import { getRequiredElement } from "./domHelpers";

/* used to translate strings in the index.html */
export function translate(): void {
  document.documentElement.setAttribute("lang", LanguageService.getCurrentLanguageAcronym());

  getRequiredElement("userProfileList").ariaLabel = lang.profileQuickSwitchHeader;
  getRequiredElement("userSettingsList").ariaLabel = lang.settingsHeader;
  getRequiredElement("languageList").ariaLabel = lang.languageHeader;

  const switch2D = getRequiredElement("switch2D");
  const switch2DLabel =
    switch2D.getAttribute("aria-pressed") === "true" ? lang.switchFlatButton : lang.switch2DButton;
  setButtonLabel(switch2D, switch2DLabel);
  setButtonLabel(getRequiredElement("switchWheelchairMode"), lang.switchWheelchairModeButton);
  setButtonLabel(getRequiredElement("zoomControlIn"), lang.zoomInButton);
  setButtonLabel(getRequiredElement("zoomControlOut"), lang.zoomOutButton);
  setButtonLabel(getRequiredElement("levelShiftUp"), lang.showPreviousLevels);
  setButtonLabel(getRequiredElement("levelShiftDown"), lang.showNextLevels);
  const toggleLevel = getRequiredElement("levelControlToggleLabel").textContent;
  if (toggleLevel) {
    setButtonLabel(getRequiredElement("levelControlToggle"), lang.changeLevel + toggleLevel);
  }
  setButtonLabel(getRequiredElement("centeringButton"), lang.centeringButton);
  setButtonLabel(getRequiredElement("mobileLegendTrigger"), lang.mobileLegendButton);
  setButtonLabel(getRequiredElement("mobileProfileTrigger"), lang.mobileProfileButton);
  setButtonLabel(getRequiredElement("mobileSettingsTrigger"), lang.mobileSettingsButton);
  setButtonLabel(getRequiredElement("shortLegendTrigger"), lang.mobileLegendButton);
  setButtonLabel(getRequiredElement("shortProfileTrigger"), lang.mobileProfileButton);
  setButtonLabel(getRequiredElement("shortSettingsTrigger"), lang.mobileSettingsButton);

  for (const element of getRequiredElement("levelControl").children) {
    const levelButton = element.firstElementChild;
    if (!(levelButton instanceof HTMLElement) || levelButton.textContent === null) continue;

    const changeToLevel = lang.changeLevel + levelButton.textContent;
    levelButton.title = changeToLevel;
    levelButton.ariaLabel = changeToLevel;
  }

  for (const element of document.getElementsByClassName("saveButton")) {
    element.textContent = lang.saveButton;
  }
  for (const element of document.getElementsByClassName("closeButton")) {
    element.textContent = lang.closeButton;
  }
  for (const element of document.getElementsByClassName("btn-close")) {
    if (element instanceof HTMLElement) {
      setButtonLabel(element, lang.closeButton);
    }
  }
}

function setButtonLabel(element: HTMLElement, label: string): void {
  element.title = label;
  element.ariaLabel = label;
}
