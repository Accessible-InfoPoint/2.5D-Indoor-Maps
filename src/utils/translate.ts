import LanguageService, { lang } from "../services/languageService";

/* used to translate strings in the index.html */
export function translate(): void {
  document.documentElement.setAttribute("lang", LanguageService.getCurrentLanguageAcronym());

  // document.getElementById("navbarBrandText").innerText = lang.navbarBrandText;
  // document.getElementById("changeUserProfileBtnLabel").innerText = lang.changeUserProfileBtn;
  // document.getElementById("userProfileModalLabel").innerText = lang.userProfileModalLabel;
  // document.getElementById("profileQuickSwitchHeader").innerText = lang.profileQuickSwitchHeader;
  document.getElementById("userProfileList").ariaLabel = lang.profileQuickSwitchHeader;
  document.getElementById("userSettingsList").ariaLabel = lang.settingsHeader;
  document.getElementById("languageList").ariaLabel = lang.languageHeader;
  document.getElementById("switch2DLabel").title = lang.switch2DButton;
  document.getElementById("switch2DLabel").ariaLabel = lang.switch2DButton;
  document.getElementById("switchWheelchairModeLabel").title = lang.switchWheelchairModeButton;
  document.getElementById("switchWheelchairModeLabel").ariaLabel = lang.switchWheelchairModeButton;
  // document.getElementById("indoorSearchInput").setAttribute("placeholder", lang.indoorSearchPlaceholder);
  // document.getElementById("indoorSearchInput").ariaLabel = lang.indoorSearchPlaceholder;
  // document.getElementById("indoorSearchSubmit").innerHTML = lang.indoorSearchSubmit;

  for (let i = 0; i < document.getElementsByClassName("saveButton").length; i++) {
    document.getElementsByClassName("saveButton")[i].textContent = lang.saveButton
  }
  for (let i = 0; i < document.getElementsByClassName("closeButton").length; i++) {
    document.getElementsByClassName("closeButton")[i].textContent = lang.closeButton
  }

  // document.getElementById("buildingSearchInput")
  //   .setAttribute("aria-label", lang.closeButtonLabel);
  // document.getElementById("centeringButton")
  //   .setAttribute("aria-label", lang.centeringButton);
}
