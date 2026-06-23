import { LanguageSettingsEnum } from "../models/languageSettingsEnum";
import { LanguageSettings } from "../data/languageSettings";
import { getRequiredMapValue } from "../utils/requiredHelpers";
//sprachdateien:
import * as string from "../../public/strings/lang.en.json";
import * as stringDe from "../../public/strings/lang.de.json";

const defaultLanguage = LanguageSettingsEnum.english;
const languageKey = "language";
type LanguageStrings = typeof string;

function getCurrentLanguage(): LanguageSettingsEnum {
  const storedLanguage = localStorage.getItem(languageKey);
  const language = storedLanguage
    ? <LanguageSettingsEnum>parseInt(storedLanguage)
    : defaultLanguage;

  return language;
}

function getCurrentLanguageAcronym(): string {
  const language = getCurrentLanguage();
  return getRequiredMapValue(LanguageSettings, language, "Language settings").acronym;
}

function setLanguage(language: LanguageSettingsEnum): void {
  localStorage.setItem(languageKey, language.toString());
  lang = getLanguageStrings(language);
}

function getLanguageStrings(language: LanguageSettingsEnum): LanguageStrings {
  return language == LanguageSettingsEnum.english ? string : stringDe;
}

export default {
  getCurrentLanguage,
  getCurrentLanguageAcronym,
  setLanguage,
};

/*exported language json for the use in all components*/
export let lang = getLanguageStrings(getCurrentLanguage());
