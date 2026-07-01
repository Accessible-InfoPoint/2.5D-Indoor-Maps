import type { GeoMap } from "../geoMap";
import { lang } from "../../services/languageService";
import { getRequiredElement } from "../../utils/domHelpers";
import BuildingService, { type SearchSuggestion, type SuggestionSortContext } from "../../services/buildingService";
import SearchSuggestions from "./searchSuggestions";
import UserService from "../../services/userService";
import { UserGroupEnum } from "../../models/userGroupEnum";

const indoorSearchSubmit = getRequiredElement<HTMLButtonElement>("indoorSearchSubmit");
const indoorSearchInput = getRequiredElement<HTMLInputElement>("indoorSearchInput");
const searchErrorMessage = getRequiredElement<HTMLDivElement>("searchErrorMessage");

function showSearchError(message: string): void {
  searchErrorMessage.textContent = message;
  searchErrorMessage.classList.add("visible");
}

function clearSearchError(): void {
  searchErrorMessage.textContent = "";
  searchErrorMessage.classList.remove("visible");
}

function buildSortContext(geoMap: GeoMap): SuggestionSortContext {
  const selectedId = geoMap.selectedFeatures[0];
  const selectedFeature = selectedId
    ? BuildingService.getBuildingGeoJSON().features.find((f) => f.id?.toString() === selectedId)
    : undefined;

  return {
    currentLevel: geoMap.currentLevel,
    selectedFeature,
    infoPointFeature: geoMap.infoPoint.geometry.type !== "GeometryCollection"
      ? geoMap.infoPoint
      : undefined,
    wheelchairMode: UserService.getCurrentProfile() === UserGroupEnum.wheelchairUsers,
  };
}

function submitSearch(geoMap: GeoMap, selectSuggestion: (suggestion: SearchSuggestion) => void): void {
  clearSearchError();
  const query = indoorSearchInput.value;
  if (!query) {
    showSearchError(lang.searchEmpty);
    return;
  }

  const results = BuildingService.searchSuggestions(query, buildSortContext(geoMap));
  SearchSuggestions.clear();

  const best = results[0];
  if (!best) {
    showSearchError(lang.searchNotFound);
    return;
  }

  selectSuggestion(best);
}

function render(geoMap: GeoMap): void {
  const selectSuggestion = (suggestion: SearchSuggestion): void => {
    indoorSearchInput.value = suggestion.displayName;
    geoMap.selectIndoorFeature(suggestion.feature);
  };

  SearchSuggestions.render(selectSuggestion);

  indoorSearchInput.addEventListener("input", () => {
    clearSearchError();
    const query = indoorSearchInput.value;
    if (query.length >= 1) {
      SearchSuggestions.update(BuildingService.searchSuggestions(query, buildSortContext(geoMap)));
    } else {
      SearchSuggestions.clear();
    }
  });

  indoorSearchSubmit.addEventListener("click", () => {
    submitSearch(geoMap, selectSuggestion);
  });

  indoorSearchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitSearch(geoMap, selectSuggestion);
    }
  });

  updateLabels();
}

function updateLabels(): void {
  indoorSearchSubmit.innerText = lang.indoorSearchSubmit;
  indoorSearchInput.setAttribute("placeholder", lang.indoorSearchPlaceholder);
  indoorSearchInput.setAttribute("aria-label", lang.indoorSearchPlaceholder);
}

export default {
  render,
  updateLabels,
};
