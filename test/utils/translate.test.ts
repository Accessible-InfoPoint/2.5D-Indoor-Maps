/**
 * @jest-environment jsdom
 */

import { translate } from "../../src/utils/translate";
import { getRequiredElement } from "../../src/utils/domHelpers";

// Optional: Mock LanguageService and lang if needed
jest.mock("../../src/services/languageService", () => ({
  __esModule: true,
  default: {
    getCurrentLanguageAcronym: jest.fn(() => "en"),
  },
  lang: {
    profileQuickSwitchHeader: "Profiles",
    settingsHeader: "Settings",
    languageHeader: "Languages",
    switch2DButton: "2D Mode",
    switchFlatButton: "Flat Mode",
    switchWheelchairModeButton: "Wheelchair Mode",
    zoomInButton: "Zoom in",
    zoomOutButton: "Zoom out",
    centeringButton: "Center map",
    changeLevel: "Change to level ",
    showPreviousLevels: "Show previous levels",
    showNextLevels: "Show next levels",
    saveButton: "Save",
    closeButton: "Close",
  },
}));

describe("translate()", () => {
  beforeEach(() => {
    // Set up DOM elements that translate() expects
    document.body.innerHTML = `
      <ul id="userProfileList"></ul>
      <ul id="userSettingsList"></ul>
      <ul id="languageList"></ul>
      <button id="switch2D"><span id="switch2DLabel"></span></button>
      <button id="switchWheelchairMode"></button>
      <button id="zoomControlIn"><span id="zoomControlInLabel"></span></button>
      <button id="zoomControlOut"><span id="zoomControlOutLabel"></span></button>
      <button id="centeringButton"><span aria-hidden="true"></span></button>
      <button id="levelShiftUp"></button>
      <button id="levelShiftDown"></button>
      <ul id="levelControl">
        <li><button>1</button></li>
      </ul>
      <button class="saveButton"></button>
      <button class="closeButton"></button>
    `;
  });

  it("sets the lang attribute on <html>", () => {
    translate();
    expect(document.documentElement.getAttribute("lang")).toBe("en");
  });

  it("updates aria-labels and titles", () => {
    translate();
    const userProfileList = getRequiredElement("userProfileList");
    const switch2D = getRequiredElement("switch2D");
    const zoomControlIn = getRequiredElement("zoomControlIn");
    const centeringButton = getRequiredElement("centeringButton");
    const levelShiftUp = getRequiredElement("levelShiftUp");
    const levelButton = getRequiredElement("levelControl").children[0]
      .firstElementChild as HTMLElement;

    expect(userProfileList.ariaLabel).toBe("Profiles");
    expect(switch2D.title).toBe("2D Mode");
    expect(switch2D.ariaLabel).toBe("2D Mode");
    expect(zoomControlIn.title).toBe("Zoom in");
    expect(zoomControlIn.ariaLabel).toBe("Zoom in");
    expect(centeringButton.title).toBe("Center map");
    expect(centeringButton.ariaLabel).toBe("Center map");
    expect(levelShiftUp.title).toBe("Show previous levels");
    expect(levelShiftUp.ariaLabel).toBe("Show previous levels");
    expect(levelButton.title).toBe("Change to level 1");
    expect(levelButton.ariaLabel).toBe("Change to level 1");
  });

  it("updates button text content by class", () => {
    translate();
    const save = document.querySelector(".saveButton") as HTMLElement;
    const close = document.querySelector(".closeButton") as HTMLElement;
    expect(save.textContent).toBe("Save");
    expect(close.textContent).toBe("Close");
  });
});
