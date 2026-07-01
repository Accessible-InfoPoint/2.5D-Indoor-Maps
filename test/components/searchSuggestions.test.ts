/**
 * @jest-environment jsdom
 */
jest.mock("../../src/services/languageService", () => ({
  lang: { searchSuggestionLevel: "Level " },
}));

jest.mock("../../src/services/featureService", () => ({
  getCategoryIcon: jest.fn(() => "/images/additional.svg"),
}));

import type { SearchSuggestion } from "../../src/services/buildingService";

function suggestion(overrides: Partial<SearchSuggestion> = {}): SearchSuggestion {
  return {
    id: "way/1",
    displayName: "Room A",
    levels: [0],
    type: "room",
    feature: {
      id: "way/1",
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [] },
      properties: {},
    },
    ...overrides,
  };
}

describe("SearchSuggestions", () => {
  let SearchSuggestions: typeof import("../../src/components/ui/searchSuggestions").default;

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = `<ul id="searchSuggestionsList" aria-label="Search suggestions"></ul>`;
    SearchSuggestions = require("../../src/components/ui/searchSuggestions").default;
  });

  it("renders each suggestion as a focusable, labeled button", () => {
    SearchSuggestions.update([suggestion()]);
    const button = document.querySelector<HTMLButtonElement>("#searchSuggestionsList button");
    expect(button).not.toBeNull();
    expect(button?.getAttribute("type")).toBe("button");
    expect(button?.getAttribute("aria-label")).toContain("Room A");
  });

  it("renders a decorative category icon for each suggestion", () => {
    SearchSuggestions.update([suggestion()]);
    const icon = document.querySelector<HTMLImageElement>("#searchSuggestionsList img.suggestion-icon");
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute("src")).toBe("/images/additional.svg");
    expect(icon?.getAttribute("alt")).toBe("");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });

  it("calls onSelect and clears the list when a card is activated", () => {
    const onSelect = jest.fn();
    SearchSuggestions.render(onSelect);
    const s = suggestion();
    SearchSuggestions.update([s]);

    const button = document.querySelector<HTMLButtonElement>("#searchSuggestionsList button")!;
    button.click();

    expect(onSelect).toHaveBeenCalledWith(s);
    expect(document.getElementById("searchSuggestionsList")?.classList.contains("visible")).toBe(false);
    expect(document.querySelectorAll("#searchSuggestionsList button")).toHaveLength(0);
  });

  it("clears the rendered list", () => {
    SearchSuggestions.update([suggestion()]);
    SearchSuggestions.clear();
    expect(document.querySelectorAll("#searchSuggestionsList button")).toHaveLength(0);
  });
});
