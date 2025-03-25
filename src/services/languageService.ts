import { LanguageSettingsEnum } from "../models/languageSettingsEnum";
import { LanguageSettings } from "../data/languageSettings";
//sprachdateien:
import * as string from "../../public/strings/lang.en.json";
import * as stringDe from "../../public/strings/lang.de.json";

const defaultLanguage = LanguageSettingsEnum.english;
const languageKey = "language";

function getCurrentLanguage(): LanguageSettingsEnum {
  const language = localStorage.getItem(languageKey)
    ? <LanguageSettingsEnum>parseInt(localStorage.getItem(languageKey))
    : defaultLanguage;

  return language;
}

function getCurrentLanguageAcronym(): string {
  const language = getCurrentLanguage();
  return LanguageSettings.get(language).acronym;
}

function setLanguage(language: LanguageSettingsEnum): void {
  localStorage.setItem(languageKey, language.toString());
  /*
   * Hack: reload window location to properly update all profile-specific information.
   * Relevant data is stored in localStorage and remains persistent after reload.
   */
  setTimeout(window.location.reload.bind(window.location), 200);
}

export default {
  getCurrentLanguage,
  getCurrentLanguageAcronym,
  setLanguage,
};

/*exported language json for the use in all components*/
export const lang =
  getCurrentLanguage() == LanguageSettingsEnum.english ? string : stringDe;
