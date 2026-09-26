import { getRequiredElement } from "../../utils/domHelpers";
import { lang } from "../../services/languageService";
import { featureDescriptionHelper } from "../../utils/featureDescriptionHelper";
import { featureAccessibilityProperties } from "../../data/featureAccessibilityProperties";
import FeatureService from "../../services/featureService";
import LevelService from "../../services/levelService";

let buildingTitle = "";

function setBuildingTitle(title: string): void {
  buildingTitle = title;
}

function setLevelDefault(currentLevel: number): void {
  render(buildingTitle, LevelService.getCurrentLevelAccessibilityBody(currentLevel));
}

function setFeatureSelected(feature: GeoJSON.Feature): void {
  render(
    FeatureService.getFeatureTitle(feature),
    featureDescriptionHelper(feature, featureAccessibilityProperties),
  );
}

function render(title: string, body: string): void {
  getRequiredElement("mobileDescriptionTitle").textContent = title;
  getRequiredElement("mobileDescriptionBody").textContent = body || lang.noDescriptionAvailable;
}

export default {
  setBuildingTitle,
  setLevelDefault,
  setFeatureSelected,
};
