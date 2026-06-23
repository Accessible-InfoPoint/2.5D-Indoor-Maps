import LanguageService, { lang } from "../services/languageService";
import { getRequiredElement } from "./domHelpers";

/* used to translate strings in the index.html */
export function translate(): void {
  document.documentElement.setAttribute("lang", LanguageService.getCurrentLanguageAcronym());

  getRequiredElement("userProfileList").ariaLabel = lang.profileQuickSwitchHeader;
  getRequiredElement("userSettingsList").ariaLabel = lang.settingsHeader;
  getRequiredElement("languageList").ariaLabel = lang.languageHeader;
  getRequiredElement("switch2DLabel").title = lang.switch2DButton;
  getRequiredElement("switch2DLabel").ariaLabel = lang.switch2DButton;
  getRequiredElement("switchWheelchairMode").title = lang.switchWheelchairModeButton;
  getRequiredElement("switchWheelchairMode").ariaLabel = lang.switchWheelchairModeButton;
  getRequiredElement("zoomControlInLabel").title = lang.zoomInButton;
  getRequiredElement("zoomControlInLabel").ariaLabel = lang.zoomInButton;
  getRequiredElement("zoomControlOutLabel").title = lang.zoomOutButton;
  getRequiredElement("zoomControlOutLabel").ariaLabel = lang.zoomOutButton;
  getRequiredElement("levelShiftUp").title = lang.showPreviousLevels;
  getRequiredElement("levelShiftUp").ariaLabel = lang.showPreviousLevels;
  getRequiredElement("levelShiftDown").title = lang.showNextLevels;
  getRequiredElement("levelShiftDown").ariaLabel = lang.showNextLevels;

  for (const element of getRequiredElement("levelControl").children) {
    const levelButton = element.firstElementChild;
    if (!(levelButton instanceof HTMLElement) || levelButton.textContent === null)
      continue;

    const changeToLevel = lang.changeLevel + levelButton.textContent;
    levelButton.title = changeToLevel;
    levelButton.ariaLabel = changeToLevel;
  }

  for (const element of document.getElementsByClassName("saveButton")) {
    element.textContent = lang.saveButton
  }
  for (const element of document.getElementsByClassName("closeButton")) {
    element.textContent = lang.closeButton
  }
}
