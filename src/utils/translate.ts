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

  for (const element of document.getElementsByClassName("saveButton")) {
    element.textContent = lang.saveButton
  }
  for (const element of document.getElementsByClassName("closeButton")) {
    element.textContent = lang.closeButton
  }
}
