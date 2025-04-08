import { LanguageSettingsEnum } from "../models/languageSettingsEnum";

const LanguageSettings = new Map<LanguageSettingsEnum, any>();
LanguageSettings.set(LanguageSettingsEnum.english, {
  name: "English",
  acronym: "en",
  display: "EN",
  resourceFile: "../../public/strings/lang.en.json"
});
LanguageSettings.set(LanguageSettingsEnum.german, {
  name: "Deutsch",
  acronym: "de",
  display: "DE",
  resourceFile: "../../public/strings/lang.de.json"
});

export { LanguageSettings };
