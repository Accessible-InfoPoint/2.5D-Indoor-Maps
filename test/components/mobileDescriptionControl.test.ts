/**
 * @jest-environment jsdom
 */
jest.mock("../../src/services/languageService", () => ({
  lang: {
    noDescriptionAvailable: "No description available.",
  },
}));
jest.mock("../../src/services/featureService", () => ({
  __esModule: true,
  default: {
    getFeatureTitle: jest.fn(() => "101 (Meeting Room)"),
  },
}));
jest.mock("../../src/services/levelService", () => ({
  __esModule: true,
  default: {
    getCurrentLevelAccessibilityBody: jest.fn(() => "[Rollstuhlzugang unbekannt]"),
  },
}));
jest.mock("../../src/utils/featureDescriptionHelper", () => ({
  featureDescriptionHelper: jest.fn(() => "[Rollstuhlzugang möglich]"),
}));

import MobileDescriptionControl from "../../src/components/ui/mobileDescriptionControl";

describe("mobileDescriptionControl", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <span id="mobileDescriptionTitle"></span>
      <div id="mobileDescriptionBody"></div>
    `;
  });

  it("shows the building title with the level's accessibility body by default", () => {
    MobileDescriptionControl.setBuildingTitle("Andreas-Pfitzmann-Bau (APB)");
    MobileDescriptionControl.setLevelDefault(0);

    expect(document.getElementById("mobileDescriptionTitle")?.textContent).toBe(
      "Andreas-Pfitzmann-Bau (APB)",
    );
    expect(document.getElementById("mobileDescriptionBody")?.textContent).toBe(
      "[Rollstuhlzugang unbekannt]",
    );
  });

  it("shows the feature's title and accessibility body when a feature is selected", () => {
    MobileDescriptionControl.setBuildingTitle("Andreas-Pfitzmann-Bau (APB)");
    MobileDescriptionControl.setFeatureSelected({
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [0, 0] },
    });

    expect(document.getElementById("mobileDescriptionTitle")?.textContent).toBe(
      "101 (Meeting Room)",
    );
    expect(document.getElementById("mobileDescriptionBody")?.textContent).toBe(
      "[Rollstuhlzugang möglich]",
    );
  });

  it("falls back to a placeholder when the body would be empty", () => {
    const levelService = jest.requireMock("../../src/services/levelService").default;
    levelService.getCurrentLevelAccessibilityBody.mockReturnValueOnce("");

    MobileDescriptionControl.setBuildingTitle("Andreas-Pfitzmann-Bau (APB)");
    MobileDescriptionControl.setLevelDefault(0);

    expect(document.getElementById("mobileDescriptionBody")?.textContent).toBe(
      "No description available.",
    );
  });
});
