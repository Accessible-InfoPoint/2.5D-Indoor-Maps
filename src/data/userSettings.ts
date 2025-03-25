import { UserSettingsEnum } from "../models/userSettingsEnum";
import { lang } from "../services/languageService";

const UserSettings: Map<UserSettingsEnum, any> = new Map<UserSettingsEnum, any>();
UserSettings.set(UserSettingsEnum.visualSettings, {
  name: lang.userProfileVisualSettings,
  linkedModal: "#userVisualSettingsModal",
  icon: "visibility"
});
UserSettings.set(UserSettingsEnum.featureSelection, {
  name: lang.userProfileFeatureSelection,
  linkedModal: "#userFeatureSelectionModal",
  icon: "ballot"
});

export { UserSettings };
