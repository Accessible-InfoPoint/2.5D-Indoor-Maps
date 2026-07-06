/**
 * @jest-environment jsdom
 */
jest.mock("../../src/services/languageService", () => ({
  lang: {
    searchSuggestionLevel: "Level ",
    searchSuggestionsAvailable: "{count} search suggestions available.",
    searchSuggestionsNone: "No search suggestions available.",
  },
}));

jest.mock("../../src/services/featureService", () => ({
  getCategoryIcon: jest.fn(),
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
  let getCategoryIcon: jest.Mock;
  let input: HTMLInputElement;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
    document.body.innerHTML = `
      <input id="indoorSearchInput" aria-expanded="false" aria-activedescendant="" />
      <ul id="searchSuggestionsList" role="listbox" aria-label="Search suggestions"></ul>
      <div id="searchAnnouncement" aria-live="polite" aria-atomic="true"></div>
    `;
    input = document.getElementById("indoorSearchInput") as HTMLInputElement;
    getCategoryIcon = require("../../src/services/featureService").getCategoryIcon;
    SearchSuggestions = require("../../src/components/ui/searchSuggestions").default;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders each suggestion as a labeled listbox option", () => {
    SearchSuggestions.update([suggestion()]);
    const option = document.querySelector<HTMLElement>("#searchSuggestionsList [role='option']");
    expect(option).not.toBeNull();
    expect(option?.id).toBe("search-suggestion-0");
    expect(option?.tabIndex).toBe(-1);
    expect(option?.getAttribute("aria-selected")).toBe("false");
    expect(option?.getAttribute("aria-label")).toContain("Room A");
  });

  it("does not render a category icon when none is configured", () => {
    getCategoryIcon.mockReturnValue(undefined);
    SearchSuggestions.update([suggestion()]);
    const icon = document.querySelector<HTMLImageElement>("#searchSuggestionsList img.suggestion-icon");
    expect(icon).toBeNull();
  });

  it("renders a decorative category icon when one is configured", () => {
    getCategoryIcon.mockReturnValue("/images/toilets.svg");
    SearchSuggestions.update([suggestion()]);
    const icon = document.querySelector<HTMLImageElement>("#searchSuggestionsList img.suggestion-icon");
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute("src")).toBe("/images/toilets.svg");
    expect(icon?.getAttribute("alt")).toBe("");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });

  it("calls onSelect and clears the list when a card is activated", () => {
    const onSelect = jest.fn();
    SearchSuggestions.render(input, onSelect);
    const s = suggestion();
    SearchSuggestions.update([s]);

    const option = document.querySelector<HTMLElement>("#searchSuggestionsList [role='option']")!;
    option.click();

    expect(onSelect).toHaveBeenCalledWith(s);
    expect(document.getElementById("searchSuggestionsList")?.classList.contains("visible")).toBe(false);
    expect(document.querySelectorAll("#searchSuggestionsList [role='option']")).toHaveLength(0);
  });

  it("clears the rendered list", () => {
    SearchSuggestions.render(input, jest.fn());
    SearchSuggestions.update([suggestion()]);
    SearchSuggestions.clear();
    expect(document.querySelectorAll("#searchSuggestionsList [role='option']")).toHaveLength(0);
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.getAttribute("aria-activedescendant")).toBe("");
  });

  it("updates input combobox state when suggestions are shown", () => {
    SearchSuggestions.render(input, jest.fn());
    SearchSuggestions.update([suggestion()]);
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(input.getAttribute("aria-activedescendant")).toBe("");
  });

  it("moves the active option with arrow keys", () => {
    SearchSuggestions.render(input, jest.fn());
    SearchSuggestions.update([
      suggestion({ id: "way/1", displayName: "Room A" }),
      suggestion({ id: "way/2", displayName: "Room B" }),
    ]);

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    expect(input.getAttribute("aria-activedescendant")).toBe("search-suggestion-0");
    expect(document.getElementById("search-suggestion-0")?.getAttribute("aria-selected")).toBe("true");

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    expect(input.getAttribute("aria-activedescendant")).toBe("search-suggestion-1");
    expect(document.getElementById("search-suggestion-1")?.getAttribute("aria-selected")).toBe("true");
  });

  it("moves to the first option when either arrow key is pressed first", () => {
    SearchSuggestions.render(input, jest.fn());
    SearchSuggestions.update([
      suggestion({ id: "way/1", displayName: "Room A" }),
      suggestion({ id: "way/2", displayName: "Room B" }),
    ]);

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
    expect(input.getAttribute("aria-activedescendant")).toBe("search-suggestion-0");

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
    expect(input.getAttribute("aria-activedescendant")).toBe("search-suggestion-1");
  });

  it("selects the active option with Enter", () => {
    const onSelect = jest.fn();
    const s = suggestion();
    SearchSuggestions.render(input, onSelect);
    SearchSuggestions.update([s]);

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    expect(onSelect).toHaveBeenCalledWith(s);
    expect(input.getAttribute("aria-expanded")).toBe("false");
  });

  it("hides suggestions with Escape without clearing the list", () => {
    SearchSuggestions.render(input, jest.fn());
    SearchSuggestions.update([suggestion()]);

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(document.querySelectorAll("#searchSuggestionsList [role='option']")).toHaveLength(1);
    expect(document.getElementById("searchSuggestionsList")?.classList.contains("visible")).toBe(false);
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.getAttribute("aria-activedescendant")).toBe("");
    expect(document.getElementById("search-suggestion-0")?.getAttribute("aria-selected")).toBe("false");
  });

  it("reopens hidden suggestions and activates the first result with an arrow key", () => {
    SearchSuggestions.render(input, jest.fn());
    SearchSuggestions.update([
      suggestion({ id: "way/1", displayName: "Room A" }),
      suggestion({ id: "way/2", displayName: "Room B" }),
    ]);

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));

    expect(document.getElementById("searchSuggestionsList")?.classList.contains("visible")).toBe(true);
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(input.getAttribute("aria-activedescendant")).toBe("search-suggestion-0");
  });

  it("announces the number of available suggestions after a debounce", () => {
    SearchSuggestions.update([suggestion(), suggestion({ id: "way/2", displayName: "Room B" })]);
    expect(document.getElementById("searchAnnouncement")?.textContent).toBe("");

    jest.advanceTimersByTime(250);

    expect(document.getElementById("searchAnnouncement")?.textContent)
      .toBe("2 search suggestions available.");
  });
});
