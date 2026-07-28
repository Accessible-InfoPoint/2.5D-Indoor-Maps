import AccessibilityService from "./accessibilityService";
import { lang } from "./languageService";
import BackendService from "./backendService";
import { IndoorElement, IndoorTags } from "../indoor";

export interface LevelOption {
  level: number;
  label: string;
}

function clearData(): void {
  AccessibilityService.reset();
}

function getLevelOptions(): LevelOption[] {
  return BackendService.getAllLevels().map((level) => ({
    level,
    label: BackendService.getLevelLabel(level),
  }));
}

function getCurrentLevelDescription(currentLevel: number): string {
  const levelAccessibilityInformation = AccessibilityService.getForLevelTags(
    currentLevel,
    getRawLevelTags(currentLevel),
  );

  return lang.currentLevel + currentLevel + " " + levelAccessibilityInformation;
}

function getRawLevelTags(level: number): IndoorTags[] {
  const model = BackendService.getIndoorModel();
  const elements: IndoorElement[] = [
    ...model.rooms,
    ...model.pointFeatures,
    ...model.infoPoints,
    ...model.tactilePaving,
    ...model.stairPathways,
  ];

  return elements.filter((element) => element.hasLevel(level)).map((element) => element.tags);
}

export default {
  getLevelOptions,
  getCurrentLevelDescription,
  clearData,
};
