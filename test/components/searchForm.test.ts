/**
 * @jest-environment jsdom
 */
jest.mock("../../src/services/languageService", () => ({
  lang: {
    indoorSearchSubmit: "Search",
    indoorSearchPlaceholder: "Search indoor",
    searchEmpty: "Please enter a search term!",
    searchNotFound: "Not found!",
    clearIndoorSearch: "Clear indoor search field",
    clearSearchError: "Dismiss search error",
  },
}));
jest.mock("../../src/services/buildingService", () => ({
  __esModule: true,
  default: {
    getBuildingGeoJSON: jest.fn(() => ({
      type: "FeatureCollection",
      features: [] as GeoJSON.Feature[],
    })),
    getSearchElementRefById: jest.fn(),
    searchSuggestions: jest.fn(),
  },
}));
jest.mock("../../src/components/ui/searchSuggestions", () => ({
  __esModule: true,
  default: {
    render: jest.fn(),
    update: jest.fn(),
    clear: jest.fn(),
  },
}));
jest.mock("../../src/services/userService", () => ({
  __esModule: true,
  default: { getCurrentProfile: jest.fn(() => 2) }, // UserGroupEnum.noImpairments
}));

import type { GeoMap } from "../../src/components/geoMap";
import type BuildingServiceType from "../../src/services/buildingService";
import type SearchSuggestionsType from "../../src/components/ui/searchSuggestions";

describe("searchForm", () => {
  let SearchForm: typeof import("../../src/components/ui/searchForm").default;
  let BuildingService: typeof BuildingServiceType;
  let SearchSuggestions: typeof SearchSuggestionsType;
  let input: HTMLInputElement;
  let submitButton: HTMLButtonElement;
  let clearButton: HTMLButtonElement;
  let errorMessage: HTMLDivElement;
  let errorText: HTMLSpanElement;
  let errorClearButton: HTMLButtonElement;
  let geoMap: GeoMap;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    document.body.innerHTML = `
      <input id="indoorSearchInput" />
      <button id="indoorSearchClear"></button>
      <button id="indoorSearchSubmit"></button>
      <div id="searchErrorMessage">
        <span id="searchErrorText"></span>
        <button id="searchErrorClear"></button>
      </div>
    `;
    BuildingService = jest.requireMock("../../src/services/buildingService")
      .default as typeof BuildingServiceType;
    SearchSuggestions = jest.requireMock("../../src/components/ui/searchSuggestions")
      .default as typeof SearchSuggestionsType;
    SearchForm = jest.requireActual("../../src/components/ui/searchForm")
      .default as typeof SearchForm;
    input = document.getElementById("indoorSearchInput") as HTMLInputElement;
    submitButton = document.getElementById("indoorSearchSubmit") as HTMLButtonElement;
    clearButton = document.getElementById("indoorSearchClear") as HTMLButtonElement;
    errorMessage = document.getElementById("searchErrorMessage") as HTMLDivElement;
    errorText = document.getElementById("searchErrorText") as HTMLSpanElement;
    errorClearButton = document.getElementById("searchErrorClear") as HTMLButtonElement;
    geoMap = {
      currentLevel: 0,
      selectedElementIds: [],
      selectedElementRef: undefined,
      infoPointElementRef: { id: "info", tags: {}, levels: [] },
      selectIndoorElementRef: jest.fn(),
    } as unknown as GeoMap;
  });

  function pressEnter(): void {
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  }

  it("shows an error and does not search when the input is empty", () => {
    SearchForm.render(geoMap);
    input.value = "";
    pressEnter();
    expect(errorText.textContent).toBe("Please enter a search term!");
    expect(errorMessage.classList.contains("visible")).toBe(true);
    expect(BuildingService.searchSuggestions).not.toHaveBeenCalled();
  });

  it("selects the first search result when Enter is pressed", () => {
    const feature: GeoJSON.Feature = {
      id: "way/1",
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [] },
    };
    const elementRef = { id: "way/1", tags: {}, levels: [0], geometry: feature.geometry };
    const suggestion = {
      id: "way/1",
      displayName: "Room A",
      levels: [0],
      type: "room",
      elementRef,
      feature,
    };
    (BuildingService.searchSuggestions as jest.Mock).mockReturnValue([suggestion]);

    SearchForm.render(geoMap);
    input.value = "room";
    pressEnter();

    expect(geoMap.selectIndoorElementRef).toHaveBeenCalledWith(elementRef, { switchLevel: true });
    expect(input.value).toBe("Room A");
  });

  it("reruns suggestions on submit and selects the current first result", () => {
    const staleFeature: GeoJSON.Feature = {
      id: "way/1",
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [] },
    };
    const currentFeature: GeoJSON.Feature = {
      id: "way/2",
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [] },
    };
    const staleSuggestion = {
      id: "way/1",
      displayName: "Room A",
      levels: [0],
      type: "room",
      elementRef: { id: "way/1", tags: {}, levels: [0], geometry: staleFeature.geometry },
      feature: staleFeature,
    };
    const currentElementRef = {
      id: "way/2",
      tags: {},
      levels: [0],
      geometry: currentFeature.geometry,
    };
    const currentSuggestion = {
      id: "way/2",
      displayName: "Room B",
      levels: [0],
      type: "room",
      elementRef: currentElementRef,
      feature: currentFeature,
    };
    (BuildingService.searchSuggestions as jest.Mock)
      .mockReturnValueOnce([staleSuggestion])
      .mockReturnValueOnce([currentSuggestion]);

    SearchForm.render(geoMap);
    input.value = "room";
    input.dispatchEvent(new Event("input"));
    pressEnter();

    expect(SearchSuggestions.update).toHaveBeenCalledWith([staleSuggestion]);
    expect(BuildingService.searchSuggestions).toHaveBeenCalledTimes(2);
    expect(geoMap.selectIndoorElementRef).toHaveBeenCalledWith(currentElementRef, {
      switchLevel: true,
    });
    expect(input.value).toBe("Room B");
  });

  it("shows a not-found error when Enter is pressed with no matches", () => {
    (BuildingService.searchSuggestions as jest.Mock).mockReturnValue([]);

    SearchForm.render(geoMap);
    input.value = "xyzzy";
    pressEnter();

    expect(errorText.textContent).toBe("Not found!");
    expect(errorMessage.classList.contains("visible")).toBe(true);
    expect(geoMap.selectIndoorElementRef).not.toHaveBeenCalled();
  });

  it("clears a shown error as soon as the user types again", () => {
    (BuildingService.searchSuggestions as jest.Mock).mockReturnValue([]);
    SearchForm.render(geoMap);
    input.value = "xyzzy";
    pressEnter();
    expect(errorMessage.classList.contains("visible")).toBe(true);

    input.value = "xyzzy2";
    input.dispatchEvent(new Event("input"));

    expect(errorMessage.classList.contains("visible")).toBe(false);
    expect(errorText.textContent).toBe("");
  });

  it("selects the first result when the Search button is clicked", () => {
    const feature: GeoJSON.Feature = {
      id: "way/2",
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [] },
    };
    const elementRef = { id: "way/2", tags: {}, levels: [0], geometry: feature.geometry };
    const suggestion = {
      id: "way/2",
      displayName: "Room B",
      levels: [0],
      type: "room",
      elementRef,
      feature,
    };
    (BuildingService.searchSuggestions as jest.Mock).mockReturnValue([suggestion]);

    SearchForm.render(geoMap);
    input.value = "room b";
    submitButton.click();

    expect(geoMap.selectIndoorElementRef).toHaveBeenCalledWith(elementRef, { switchLevel: true });
  });

  it("clears the input, suggestions, and visible error when the clear search button is clicked", () => {
    (BuildingService.searchSuggestions as jest.Mock).mockReturnValue([]);
    SearchForm.render(geoMap);
    input.value = "xyzzy";
    pressEnter();
    expect(errorMessage.classList.contains("visible")).toBe(true);

    clearButton.click();

    expect(input.value).toBe("");
    expect(errorText.textContent).toBe("");
    expect(errorMessage.classList.contains("visible")).toBe(false);
    expect(SearchSuggestions.clear).toHaveBeenCalled();
  });

  it("clears a visible search error when the error dismiss button is clicked", () => {
    (BuildingService.searchSuggestions as jest.Mock).mockReturnValue([]);
    SearchForm.render(geoMap);
    input.value = "xyzzy";
    pressEnter();

    errorClearButton.click();

    expect(input.value).toBe("xyzzy");
    expect(errorText.textContent).toBe("");
    expect(errorMessage.classList.contains("visible")).toBe(false);
  });
});
