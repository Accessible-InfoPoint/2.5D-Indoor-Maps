import { geoMap } from "../../main";
import { lang } from "../../services/languageService";

const indoorSearchSubmit = <HTMLButtonElement>(
  document.getElementById("indoorSearchSubmit")
);
const indoorSearchInput = <HTMLInputElement>(
  document.getElementById("indoorSearchInput")
);

const state: { indoorSearchQuery: string } = { indoorSearchQuery: "" };

function render(): void {
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

  document.getElementById("indoorSearchSubmit").innerText = lang.indoorSearchSubmit;
  document
    .getElementById("indoorSearchInput")
    .setAttribute("placeholder", lang.indoorSearchPlaceholder);
  document
    .getElementById("indoorSearchInput")
    .setAttribute("aria-label", lang.indoorSearchPlaceholder);
}

export default {
  render,
};
