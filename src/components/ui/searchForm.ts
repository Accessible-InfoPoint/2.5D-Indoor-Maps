import { geoMap } from "../../main";
import { lang } from "../../services/languageService";

const buildingSearchInput = <HTMLInputElement>(
  document.getElementById("buildingSearchInput")
);
const buildingSearchSubmit = <HTMLButtonElement>(
  document.getElementById("buildingSearchSubmit")
);
const clearBuildingSearch = <HTMLButtonElement>(
  document.getElementById("clearBuildingSearch")
);
const indoorSearchSubmit = <HTMLButtonElement>(
  document.getElementById("indoorSearchSubmit")
);
const indoorSearchInput = <HTMLInputElement>(
  document.getElementById("indoorSearchInput")
);
const buildingSearchWrapper = <HTMLButtonElement>(
  document.getElementById("buildingSearchWrapper")
);
const indoorSearchWrapper = <HTMLButtonElement>(
  document.getElementById("indoorSearchWrapper")
);

const state: {
  currentSearchState: string;
  buildingSearchQuery: string;
  indoorSearchQuery: string;
} = {
  currentSearchState: "indoor",
  buildingSearchQuery: "",
  indoorSearchQuery: "",
};

function render(): void {
//   buildingSearchSubmit.addEventListener("click", () => {
//     state.buildingSearchQuery = buildingSearchInput.value;
//     if (buildingSearchInput.value) {
//       state.currentSearchState = "indoor";
//       handleChange();
//     }
//     geoMap.runBuildingSearch(buildingSearchInput.value);
//   });
//   buildingSearchInput.addEventListener("keyup", (e) => {
//     if (e.key === "Enter") {
//       e.preventDefault();

//       state.buildingSearchQuery = buildingSearchInput.value;
//       if (buildingSearchInput.value) {
//         state.currentSearchState = "indoor";
//         handleChange();
//       }
//       geoMap.runBuildingSearch(buildingSearchInput.value);
//     }
//   });
//   clearBuildingSearch.addEventListener("click", () => {
//     buildingSearchInput.value = "";
//     state.buildingSearchQuery = buildingSearchInput.value;

//     indoorSearchInput.value = "";
//     state.indoorSearchQuery = indoorSearchInput.value;

//     state.currentSearchState = "building";
//     buildingSearchInput.focus();
//     handleChange();
//   });

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

  document.getElementById("buildingSearchSubmit").innerText =
    lang.buildingSearchSubmit;
  document.getElementById("indoorSearchSubmit").innerText =
    lang.indoorSearchSubmit;
  document.getElementById("currentBuilding").innerText = lang.currentBuilding;
  // document.getElementById("currentRoom").innerText = lang.currentRoom;
  document
    .getElementById("buildingSearchInput")
    .setAttribute("placeholder", lang.buildingSearchPlaceholder);
  document
    .getElementById("buildingSearchInput")
    .setAttribute("aria-label", lang.buildingSearchPlaceholder);
  document
    .getElementById("indoorSearchInput")
    .setAttribute("placeholder", lang.indoorSearchPlaceholder);
  document
    .getElementById("indoorSearchInput")
    .setAttribute("aria-label", lang.indoorSearchPlaceholder);
  document
    .getElementById("clearBuildingSearch")
    .setAttribute("aria-label", lang.clearBuildingSearch);
}

function handleChange() {
  const indoor = state.currentSearchState === "indoor";
  const building = !indoor;

  //disabled if belonging state is false
  setDisabledAttribute(buildingSearchInput, !building);
  setDisabledAttribute(buildingSearchSubmit, !building);
  setDisabledAttribute(indoorSearchInput, !indoor);
  setDisabledAttribute(indoorSearchSubmit, !indoor);

  handleVisibility();
}

function handleVisibility() {
  const indoor = state.currentSearchState === "indoor";

  if (indoor) {
    indoorSearchWrapper.classList.remove("hidden");
    buildingSearchSubmit.classList.add("hidden");
    buildingSearchWrapper.classList.remove("w-100");
  } else {
    indoorSearchWrapper.classList.add("hidden");
    buildingSearchSubmit.classList.remove("hidden");
    buildingSearchWrapper.classList.add("w-100");
  }
}

function setDisabledAttribute(
  element: HTMLButtonElement | HTMLInputElement,
  newState: boolean
): void {
  element.disabled = newState;
}

function setBuildingSearchInput(query: string): void {
  buildingSearchInput.value = query;
  state.buildingSearchQuery = query;
}

export default {
  render,
  setBuildingSearchInput,
};
