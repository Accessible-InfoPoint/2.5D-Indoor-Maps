import LanguageService, { lang } from "../services/languageService";

/* used to translate strings in the index.html */
export function translate(): void {
  document.documentElement.setAttribute("lang", LanguageService.getCurrentLanguageAcronym());

  document.getElementById("userProfileList").ariaLabel = lang.profileQuickSwitchHeader;
  document.getElementById("userSettingsList").ariaLabel = lang.settingsHeader;
  document.getElementById("languageList").ariaLabel = lang.languageHeader;
  document.getElementById("switch2DLabel").title = lang.switch2DButton;
  document.getElementById("switch2DLabel").ariaLabel = lang.switch2DButton;
  document.getElementById("switchWheelchairMode").title = lang.switchWheelchairModeButton;
  document.getElementById("switchWheelchairMode").ariaLabel = lang.switchWheelchairModeButton;

  for (const element of document.getElementsByClassName("saveButton")) {
    element.textContent = lang.saveButton
  }
  for (const element of document.getElementsByClassName("closeButton")) {
    element.textContent = lang.closeButton
  }
}
