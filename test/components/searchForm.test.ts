/**
 * @jest-environment jsdom
 */
jest.mock("../../src/services/languageService", () => ({
  lang: {
    indoorSearchSubmit: "Search",
    indoorSearchPlaceholder: "Search indoor",
    searchEmpty: "Please enter a search term!",
    searchNotFound: "Not found!",
  },
}));
jest.mock("../../src/services/buildingService", () => ({
  __esModule: true,
  default: {
    getBuildingGeoJSON: jest.fn(() => ({ type: "FeatureCollection", features: [] as GeoJSON.Feature[] })),
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
jest.mock("../../src/components/ui/loadingIndicator", () => ({
  __esModule: true,
  default: { error: jest.fn(), start: jest.fn(), end: jest.fn() },
}));
jest.mock("../../src/services/userService", () => ({
  __esModule: true,
  default: { getCurrentProfile: jest.fn(() => 2) }, // UserGroupEnum.noImpairments
}));

import type { GeoMap } from "../../src/components/geoMap";
import type BuildingServiceType from "../../src/services/buildingService";
import type LoadingIndicatorType from "../../src/components/ui/loadingIndicator";

describe("searchForm", () => {
  let SearchForm: typeof import("../../src/components/ui/searchForm").default;
  let BuildingService: typeof BuildingServiceType;
  let LoadingIndicator: typeof LoadingIndicatorType;
  let input: HTMLInputElement;
  let submitButton: HTMLButtonElement;
  let geoMap: GeoMap;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    document.body.innerHTML = `
      <input id="indoorSearchInput" />
      <button id="indoorSearchSubmit"></button>
    `;
    BuildingService = require("../../src/services/buildingService").default;
    LoadingIndicator = require("../../src/components/ui/loadingIndicator").default;
    SearchForm = require("../../src/components/ui/searchForm").default;
    input = document.getElementById("indoorSearchInput") as HTMLInputElement;
    submitButton = document.getElementById("indoorSearchSubmit") as HTMLButtonElement;
    geoMap = {
      currentLevel: 0,
      selectedFeatures: [],
      infoPoint: { type: "Feature", properties: {}, geometry: { type: "GeometryCollection", geometries: [] } },
      selectIndoorFeature: jest.fn(),
    } as unknown as GeoMap;
  });

  function pressEnter(): void {
    input.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter" }));
  }

  it("shows an error and does not search when the input is empty", () => {
    SearchForm.render(geoMap);
    input.value = "";
    pressEnter();
    expect(LoadingIndicator.error).toHaveBeenCalledWith("Please enter a search term!");
    expect(BuildingService.searchSuggestions).not.toHaveBeenCalled();
  });

  it("selects the first search result when Enter is pressed", () => {
    const feature: GeoJSON.Feature = { id: "way/1", type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [] } };
    const suggestion = { id: "way/1", displayName: "Room A", levels: [0], type: "room", feature };
    (BuildingService.searchSuggestions as jest.Mock).mockReturnValue([suggestion]);

    SearchForm.render(geoMap);
    input.value = "room";
    pressEnter();

    expect(geoMap.selectIndoorFeature).toHaveBeenCalledWith(feature);
    expect(input.value).toBe("Room A");
  });

  it("shows a not-found error when Enter is pressed with no matches", () => {
    (BuildingService.searchSuggestions as jest.Mock).mockReturnValue([]);

    SearchForm.render(geoMap);
    input.value = "xyzzy";
    pressEnter();

    expect(LoadingIndicator.error).toHaveBeenCalledWith("Not found!");
    expect(geoMap.selectIndoorFeature).not.toHaveBeenCalled();
  });

  it("selects the first result when the Search button is clicked", () => {
    const feature: GeoJSON.Feature = { id: "way/2", type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [] } };
    const suggestion = { id: "way/2", displayName: "Room B", levels: [0], type: "room", feature };
    (BuildingService.searchSuggestions as jest.Mock).mockReturnValue([suggestion]);

    SearchForm.render(geoMap);
    input.value = "room b";
    submitButton.click();

    expect(geoMap.selectIndoorFeature).toHaveBeenCalledWith(feature);
  });
});
