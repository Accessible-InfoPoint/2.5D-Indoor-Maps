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
    // Non-zero offset from "0" so the populated margin property is distinguishable.
    (LevelService.getLevelNames as jest.Mock).mockReturnValueOnce(["5", "4", "3", "2", "1", "0"]);
    document.body.innerHTML = `
      <div id="uiWrapper" class="wheelchairMode">
        <div id="levelControlWrapper">
          <button id="levelControlToggle"><span id="levelControlToggleLabel"></span></button>
          <button id="levelShiftUp"><span id="levelShiftUpLabel"></span></button>
          <button id="levelShiftDown"><span id="levelShiftDownLabel"></span></button>
          <div id="levelControlWindow"><ul id="levelControl" style="--button-size: 40px; --level-control-gap: 8px;"></ul></div>
        </div>
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
    expect(document.getElementById("levelShiftUpLabel")?.textContent).toBe("chevron_left");
    expect(document.getElementById("levelShiftDownLabel")?.textContent).toBe("navigate_next");
  });

  it("uses the vertical (mobile) layout when wheelchairMode and mobileMode are both present", () => {
    // Same non-zero-offset ordering as the wheelchair-only case, so the margin comparison is meaningful.
    (LevelService.getLevelNames as jest.Mock).mockReturnValueOnce(["5", "4", "3", "2", "1", "0"]);
    document.body.innerHTML = `
      <div id="uiWrapper" class="wheelchairMode mobileMode">
        <div id="levelControlWrapper">
          <button id="levelControlToggle"><span id="levelControlToggleLabel"></span></button>
          <button id="levelShiftUp"><span id="levelShiftUpLabel"></span></button>
          <button id="levelShiftDown"><span id="levelShiftDownLabel"></span></button>
          <div id="levelControlWindow"><ul id="levelControl" style="--button-size: 40px; --level-control-gap: 8px;"></ul></div>
        </div>
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

describe("levelControl expand/collapse exclusivity and dynamic count", () => {
  let geoMap: GeoMap;

  beforeEach(() => {
    geoMap = { handleLevelChange: jest.fn(() => true) } as unknown as GeoMap;
  });

  function mockRect(id: string, rect: Partial<DOMRect>): void {
    const element = document.getElementById(id) as HTMLElement;
    element.getBoundingClientRect = () =>
      ({
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => "",
        ...rect,
      }) as DOMRect;
  }

  function buildDom(): void {
    document.body.innerHTML = `
      <div id="uiWrapper" class="shortMode lowHeightMode">
        <div id="indoorSearchWrapper"></div>
        <div id="levelControlWrapper">
          <button id="levelControlToggle"><span id="levelControlToggleLabel"></span></button>
          <button id="levelShiftUp"><span id="levelShiftUpLabel"></span></button>
          <button id="levelShiftDown"><span id="levelShiftDownLabel"></span></button>
          <div id="levelControlWindow"><ul id="levelControl" style="--button-size: 40px; --level-control-gap: 8px;"></ul></div>
        </div>
      </div>
    `;
  }

  it("registers with overlayExclusivityService and collapses when another overlay opens", () => {
    const OverlayExclusivityService = jest.requireActual(
      "../../src/services/overlayExclusivityService",
    ).default as typeof import("../../src/services/overlayExclusivityService").default;
    (LevelService.getLevelNames as jest.Mock).mockReturnValueOnce(["3", "2", "1", "0"]);
    buildDom();

    LevelControl.handleChange(geoMap);
    LevelControl.setupCollapseToggle();
    document.getElementById("levelControlToggle")?.dispatchEvent(new MouseEvent("click"));

    expect(document.getElementById("levelControlWrapper")?.classList.contains("expanded")).toBe(
      true,
    );

    OverlayExclusivityService.notifyOpened("someOtherOverlay");

    expect(document.getElementById("levelControlWrapper")?.classList.contains("expanded")).toBe(
      false,
    );
  });

  it("notifies overlayExclusivityService when expanding", () => {
    const OverlayExclusivityService = jest.requireActual(
      "../../src/services/overlayExclusivityService",
    ).default as typeof import("../../src/services/overlayExclusivityService").default;
    const closeFakeOverlay = jest.fn();
    OverlayExclusivityService.registerOverlay("fakeOverlay", closeFakeOverlay);
    (LevelService.getLevelNames as jest.Mock).mockReturnValueOnce(["3", "2", "1", "0"]);
    buildDom();

    LevelControl.handleChange(geoMap);
    LevelControl.setupCollapseToggle();
    document.getElementById("levelControlToggle")?.dispatchEvent(new MouseEvent("click"));

    expect(closeFakeOverlay).toHaveBeenCalledTimes(1);
  });

  it("shrinks the shown level count when the full count would overlap another UI element", () => {
    (LevelService.getLevelNames as jest.Mock).mockReturnValueOnce(["3", "2", "1", "0"]);
    buildDom();
    document.getElementById("levelControlWrapper")?.classList.add("expanded");
    // indoorSearchWrapper sits at left:150-400 — 4 levels (4*40 + 3*8 = 184px
    // wide) reaches into it; 3 levels (3*40 + 2*8 = 136px) doesn't.
    mockRect("indoorSearchWrapper", { left: 150, right: 400, top: 0, bottom: 100 });
    const levelControlWrapper = document.getElementById("levelControlWrapper") as HTMLElement;
    const levelControlWindow = document.getElementById("levelControlWindow") as HTMLElement;
    // Wrapper's rect grows with setWindow()'s applied width, mimicking layout without jsdom actually computing CSS.
    levelControlWrapper.getBoundingClientRect = () => {
      const width = parseFloat(levelControlWindow.style.width) || 0;
      return {
        top: 0,
        left: 0,
        bottom: 40,
        right: width,
        width,
        height: 40,
        x: 0,
        y: 0,
        toJSON: () => "",
      } as DOMRect;
    };

    LevelControl.handleChange(geoMap);

    expect(levelControlWindow.style.width).toBe("136px");
  });

  it("never shrinks below one shown level", () => {
    (LevelService.getLevelNames as jest.Mock).mockReturnValueOnce(["3", "2", "1", "0"]);
    buildDom();
    document.getElementById("levelControlWrapper")?.classList.add("expanded");
    // Obstacle spans the whole viewport width — no count fits without overlap.
    mockRect("indoorSearchWrapper", { left: 0, right: 2000, top: 0, bottom: 100 });
    const levelControlWrapper = document.getElementById("levelControlWrapper") as HTMLElement;
    const levelControlWindow = document.getElementById("levelControlWindow") as HTMLElement;
    levelControlWrapper.getBoundingClientRect = () => {
      const width = parseFloat(levelControlWindow.style.width) || 0;
      return {
        top: 0,
        left: 0,
        bottom: 40,
        right: width,
        width,
        height: 40,
        x: 0,
        y: 0,
        toJSON: () => "",
      } as DOMRect;
    };

    LevelControl.handleChange(geoMap);

    expect(levelControlWindow.style.width).toBe("40px");
  });

  it("keeps the full configured count when nothing collides", () => {
    (LevelService.getLevelNames as jest.Mock).mockReturnValueOnce(["3", "2", "1", "0"]);
    buildDom();
    document.getElementById("levelControlWrapper")?.classList.add("expanded");
    mockRect("indoorSearchWrapper", { left: 1000, right: 1200, top: 0, bottom: 100 });
    const levelControlWrapper = document.getElementById("levelControlWrapper") as HTMLElement;
    const levelControlWindow = document.getElementById("levelControlWindow") as HTMLElement;
    levelControlWrapper.getBoundingClientRect = () => {
      const width = parseFloat(levelControlWindow.style.width) || 0;
      return {
        top: 0,
        left: 0,
        bottom: 40,
        right: width,
        width,
        height: 40,
        x: 0,
        y: 0,
        toJSON: () => "",
      } as DOMRect;
    };

    LevelControl.handleChange(geoMap);

    expect(levelControlWindow.style.width).toBe("184px");
  });
});
