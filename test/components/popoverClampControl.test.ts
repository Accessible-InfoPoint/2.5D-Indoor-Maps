/**
 * @jest-environment jsdom
 */

describe("popoverClampControl", () => {
  let update: () => void;
  let applyPositionFallback: (panelId: string) => void;

  // Matches #legendWrapper's real CSS (scss/main.scss): padding: 10px 15px 15px;
  // border: 1px solid gray. Vertical chrome = 10 + 15 + 1 + 1 = 27px.
  const LEGEND_CHROME = "padding: 10px 15px 15px; border: 1px solid gray;";

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = `
      <div id="uiWrapper">
        <div id="indoorSearchWrapper"></div>
        <div id="mobileDescriptionCard"></div>
        <aside id="descriptionArea"></aside>
        <div id="legendWrapper" style="${LEGEND_CHROME}"></div>
        <div id="mobileProfilePanel"></div>
        <div id="mobileSettingsPanel"></div>
        <button id="shortLegendTrigger"></button>
        <button id="shortProfileTrigger"></button>
        <button id="shortSettingsTrigger"></button>
      </div>
    `;

    ({
      default: { update, applyPositionFallback },
    } = jest.requireActual("../../src/components/ui/popoverClampControl"));
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

  it("clears the popover clamp height when shortMode is not active", () => {
    const uiWrapper = document.getElementById("uiWrapper") as HTMLElement;
    uiWrapper.style.setProperty("--popover-clamp-height", "100px");

    update();

    expect(uiWrapper.style.getPropertyValue("--popover-clamp-height")).toBe("");
  });

  describe("applyPositionFallback", () => {
    const originalInnerHeight = window.innerHeight;

    beforeEach(() => {
      document.getElementById("uiWrapper")?.classList.add("shortMode");
      document.getElementById("legendWrapper")?.classList.add("open");
      Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    });

    afterEach(() => {
      Object.defineProperty(window, "innerHeight", {
        value: originalInnerHeight,
        configurable: true,
      });
    });

    it("clamps against an obstacle above that shares the panel's horizontal column", () => {
      const uiWrapper = document.getElementById("uiWrapper") as HTMLElement;
      mockRect("legendWrapper", { top: 100, bottom: 200, height: 100, left: 300, right: 500 });
      mockRect("descriptionArea", { bottom: 60, left: 300, right: 500 });

      applyPositionFallback("legendWrapper");

      // floor defaults to innerHeight (800, no obstacle below) — 800 - 60 - 20 (gap) - 27 (chrome) = 693
      expect(uiWrapper.style.getPropertyValue("--popover-clamp-height")).toBe("693px");
    });

    it("clamps against an obstacle below that shares the panel's horizontal column", () => {
      const uiWrapper = document.getElementById("uiWrapper") as HTMLElement;
      mockRect("legendWrapper", { top: 100, bottom: 200, height: 100, left: 300, right: 500 });
      mockRect("indoorSearchWrapper", { top: 640, bottom: 700, left: 300, right: 500 });

      applyPositionFallback("legendWrapper");

      // ceiling defaults to 0 (no obstacle above) — 640 - 0 - 20 (gap) - 27 (chrome) = 593
      expect(uiWrapper.style.getPropertyValue("--popover-clamp-height")).toBe("593px");
    });

    it("ignores an obstacle that overlaps vertically but sits in a different horizontal column", () => {
      const uiWrapper = document.getElementById("uiWrapper") as HTMLElement;
      // Panel sits in the right-hand column (left: 900-1100); the search bar spans
      // the middle of the screen only (left: 100-700) and never reaches that column,
      // so it must not constrain the panel's available height at all.
      mockRect("legendWrapper", { top: 100, bottom: 200, height: 100, left: 900, right: 1100 });
      mockRect("indoorSearchWrapper", { top: 250, bottom: 300, left: 100, right: 700 });
      mockRect("descriptionArea", { top: 0, bottom: 60, left: 100, right: 700 });

      applyPositionFallback("legendWrapper");

      // Neither obstacle horizontally overlaps the panel's column, so both ceiling
      // and floor fall back to the viewport edges: 800 - 0 - 20 (gap) - 27 (chrome) = 753
      expect(uiWrapper.style.getPropertyValue("--popover-clamp-height")).toBe("753px");
    });

    it("falls back to the viewport edges when no obstacle shares the panel's column in either direction", () => {
      const uiWrapper = document.getElementById("uiWrapper") as HTMLElement;
      mockRect("legendWrapper", { top: 100, bottom: 200, height: 100, left: 300, right: 500 });
      mockRect("indoorSearchWrapper", { top: 640, left: 900, right: 1100 });
      mockRect("descriptionArea", { bottom: 60, left: 900, right: 1100 });

      applyPositionFallback("legendWrapper");

      // 800 - 0 - 20 (gap) - 27 (chrome) = 753
      expect(uiWrapper.style.getPropertyValue("--popover-clamp-height")).toBe("753px");
    });

    it("never sets a negative clamp height", () => {
      const uiWrapper = document.getElementById("uiWrapper") as HTMLElement;
      mockRect("legendWrapper", { top: 100, bottom: 200, height: 100, left: 300, right: 500 });
      mockRect("descriptionArea", { top: 0, bottom: 140, left: 300, right: 500 });
      mockRect("indoorSearchWrapper", { top: 155, bottom: 200, left: 300, right: 500 });

      applyPositionFallback("legendWrapper");

      expect(uiWrapper.style.getPropertyValue("--popover-clamp-height")).toBe("0px");
    });

    it("adds the centered class and sets --popover-clamp-top when the default position collides with an obstacle", () => {
      const uiWrapper = document.getElementById("uiWrapper") as HTMLElement;
      mockRect("descriptionArea", { bottom: 60, left: 0, right: 200 });
      mockRect("indoorSearchWrapper", { top: 640, left: 0, right: 200, bottom: 700 });
      mockRect("legendWrapper", { top: 600, left: 0, right: 100, bottom: 680 });

      applyPositionFallback("legendWrapper");

      expect(document.getElementById("legendWrapper")?.classList.contains("centered")).toBe(true);
      // centered between ceiling (60) and floor (640): 60 + (640-60)/2 = 350
      expect(uiWrapper.style.getPropertyValue("--popover-clamp-top")).toBe("350px");
    });

    it("does not add the centered class when the default position doesn't collide with anything", () => {
      mockRect("descriptionArea", { bottom: 60, left: 0, right: 200 });
      mockRect("indoorSearchWrapper", { top: 640, left: 0, right: 200, bottom: 700 });
      mockRect("legendWrapper", { top: 100, left: 300, right: 400, bottom: 180 });

      applyPositionFallback("legendWrapper");

      expect(document.getElementById("legendWrapper")?.classList.contains("centered")).toBe(false);
    });

    it("removes a stale centered class before re-measuring", () => {
      document.getElementById("legendWrapper")?.classList.add("centered");
      mockRect("descriptionArea", { bottom: 60, left: 0, right: 200 });
      mockRect("indoorSearchWrapper", { top: 640, left: 0, right: 200, bottom: 700 });
      mockRect("legendWrapper", { top: 100, left: 300, right: 400, bottom: 180 });

      applyPositionFallback("legendWrapper");

      expect(document.getElementById("legendWrapper")?.classList.contains("centered")).toBe(false);
    });
  });
});
