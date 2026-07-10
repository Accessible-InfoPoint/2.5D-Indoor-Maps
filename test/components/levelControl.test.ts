/**
 * @jest-environment jsdom
 */
jest.mock("../../src/services/levelService", () => ({
  __esModule: true,
  default: {
    getLevelNames: jest.fn(() => ["0", "1", "2"]),
  },
}));

import LevelControl from "../../src/components/ui/levelControl";
import LevelService from "../../src/services/levelService";
import type { GeoMap } from "../../src/components/geoMap";

describe("levelControl wheelchairMode/mobileMode layout branch", () => {
  let geoMap: GeoMap;

  beforeEach(() => {
    geoMap = { handleLevelChange: jest.fn(() => true) } as unknown as GeoMap;
  });

  it("uses the horizontal (wheelchair) layout when only wheelchairMode is present", () => {
    // Use a level order where the active INDOOR_LEVEL ("0") sits away from the start,
    // so the resulting offset (and therefore the margin) is non-zero — this lets us
    // tell apart which margin property setMargin() actually populated.
    (LevelService.getLevelNames as jest.Mock).mockReturnValueOnce([
      "5",
      "4",
      "3",
      "2",
      "1",
      "0",
    ]);
    document.body.innerHTML = `
      <div id="uiWrapper" class="wheelchairMode">
        <button id="levelShiftUp"></button>
        <button id="levelShiftDown"></button>
        <div id="levelControlWindow"><ul id="levelControl" style="--button-size: 40px; --level-control-gap: 8px;"></ul></div>
      </div>
    `;

    LevelControl.handleChange(geoMap);

    const levelControlWindow = document.getElementById("levelControlWindow") as HTMLElement;
    const levelControl = document.getElementById("levelControl") as HTMLElement;

    expect(levelControlWindow.style.height).toBe("auto");
    expect(levelControlWindow.style.width).not.toBe("auto");
    expect(levelControlWindow.style.width).not.toBe("");
    expect(levelControl.style.marginTop).toBe("0px");
    expect(levelControl.style.marginLeft).not.toBe("0px");
  });

  it("uses the vertical (mobile) layout when wheelchairMode and mobileMode are both present", () => {
    // Same non-zero-offset level ordering as the wheelchair-only case above, so the
    // margin comparison below is meaningful.
    (LevelService.getLevelNames as jest.Mock).mockReturnValueOnce([
      "5",
      "4",
      "3",
      "2",
      "1",
      "0",
    ]);
    document.body.innerHTML = `
      <div id="uiWrapper" class="wheelchairMode mobileMode">
        <button id="levelShiftUp"></button>
        <button id="levelShiftDown"></button>
        <div id="levelControlWindow"><ul id="levelControl" style="--button-size: 40px; --level-control-gap: 8px;"></ul></div>
      </div>
    `;

    LevelControl.handleChange(geoMap);

    const levelControlWindow = document.getElementById("levelControlWindow") as HTMLElement;
    const levelControl = document.getElementById("levelControl") as HTMLElement;

    expect(levelControlWindow.style.width).toBe("auto");
    expect(levelControlWindow.style.height).not.toBe("auto");
    expect(levelControlWindow.style.height).not.toBe("");
    expect(levelControl.style.marginLeft).toBe("0px");
    expect(levelControl.style.marginTop).not.toBe("0px");
  });
});
