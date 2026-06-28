import type { GeoMap } from "../geoMap";
import { lang } from "../../services/languageService";
import { getRequiredElement } from "../../utils/domHelpers";
import BuildingService from "../../services/buildingService";
import SearchSuggestions from "./searchSuggestions";

const indoorSearchSubmit = getRequiredElement<HTMLButtonElement>("indoorSearchSubmit");
const indoorSearchInput = getRequiredElement<HTMLInputElement>("indoorSearchInput");

const state: { indoorSearchQuery: string } = { indoorSearchQuery: "" };

function render(geoMap: GeoMap): void {
  SearchSuggestions.render((suggestion) => {
    indoorSearchInput.value = suggestion.displayName;
    geoMap.selectIndoorFeature(suggestion.feature);
  });

  indoorSearchInput.addEventListener("input", () => {
    const query = indoorSearchInput.value;
    if (query.length >= 1) {
      SearchSuggestions.update(BuildingService.searchSuggestions(query, {
        currentLevel: geoMap.currentLevel,
        infoPointFeature: geoMap.infoPoint.geometry.type !== "GeometryCollection"
          ? geoMap.infoPoint
          : undefined,
      }));
    } else {
      SearchSuggestions.clear();
    }
  });

  indoorSearchSubmit.addEventListener("click", () => {
    SearchSuggestions.clear();
    state.indoorSearchQuery = indoorSearchInput.value;
    geoMap.handleIndoorSearch(indoorSearchInput.value);
  });

  indoorSearchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      SearchSuggestions.clear();
      state.indoorSearchQuery = indoorSearchInput.value;
      geoMap.handleIndoorSearch(indoorSearchInput.value);
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
