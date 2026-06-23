import type { GeoMap } from "../geoMap";
import { lang } from "../../services/languageService";
import { getRequiredElement } from "../../utils/domHelpers";

const indoorSearchSubmit = getRequiredElement<HTMLButtonElement>("indoorSearchSubmit");
const indoorSearchInput = getRequiredElement<HTMLInputElement>("indoorSearchInput");

const state: { indoorSearchQuery: string } = { indoorSearchQuery: "" };

function render(geoMap: GeoMap): void {
  indoorSearchSubmit.addEventListener("click", () => {
    state.indoorSearchQuery = indoorSearchInput.value;

    geoMap.handleIndoorSearch(indoorSearchInput.value);
  });

  indoorSearchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

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
