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

  it("clears both clamp custom properties when shortMode is not active", () => {
    const uiWrapper = document.getElementById("uiWrapper") as HTMLElement;
    uiWrapper.style.setProperty("--popover-clamp-height", "100px");
    uiWrapper.style.setProperty("--legend-clamp-height", "100px");

    update();

    expect(uiWrapper.style.getPropertyValue("--popover-clamp-height")).toBe("");
    expect(uiWrapper.style.getPropertyValue("--legend-clamp-height")).toBe("");
  });

  it("clamps between the search bar and description card on mobile, net of #legendWrapper's padding/border", () => {
    const uiWrapper = document.getElementById("uiWrapper") as HTMLElement;
    uiWrapper.classList.add("shortMode", "mobileMode");
    mockRect("indoorSearchWrapper", { bottom: 80 });
    mockRect("mobileDescriptionCard", { top: 500 });

    update();

    // 500 - 80 - 2*10 (gap) - 27 (chrome) = 373
    expect(uiWrapper.style.getPropertyValue("--popover-clamp-height")).toBe("373px");
  });

  it("clamps between the centered description and the search bar at desktop width", () => {
    const uiWrapper = document.getElementById("uiWrapper") as HTMLElement;
    uiWrapper.classList.add("shortMode");
    mockRect("descriptionArea", { bottom: 60 });
    mockRect("indoorSearchWrapper", { top: 640 });

    update();

    // 640 - 60 - 20 - 27 = 533
    expect(uiWrapper.style.getPropertyValue("--popover-clamp-height")).toBe("533px");
  });

  it("clamps between the top-left description card and the search bar once lowHeightMode also applies at desktop width", () => {
    const uiWrapper = document.getElementById("uiWrapper") as HTMLElement;
    uiWrapper.classList.add("shortMode", "lowHeightMode");
    mockRect("mobileDescriptionCard", { bottom: 120 });
    mockRect("indoorSearchWrapper", { top: 540 });

    update();

    // 540 - 120 - 20 - 27 = 373
    expect(uiWrapper.style.getPropertyValue("--popover-clamp-height")).toBe("373px");
  });

  it("never sets a negative clamp height", () => {
    const uiWrapper = document.getElementById("uiWrapper") as HTMLElement;
    uiWrapper.classList.add("shortMode", "mobileMode");
    mockRect("indoorSearchWrapper", { bottom: 300 });
    mockRect("mobileDescriptionCard", { top: 305 });

    update();

    expect(uiWrapper.style.getPropertyValue("--popover-clamp-height")).toBe("0px");
  });

  it("clears --legend-clamp-height on mobile, where #mobileLegendTrigger keeps its own separate corner", () => {
    const uiWrapper = document.getElementById("uiWrapper") as HTMLElement;
    uiWrapper.classList.add("shortMode", "mobileMode");
    mockRect("indoorSearchWrapper", { bottom: 80, top: 0 });
    mockRect("mobileDescriptionCard", { top: 500 });

    update();

    expect(uiWrapper.style.getPropertyValue("--legend-clamp-height")).toBe("");
  });

  it("clamps #legendWrapper against #shortSettingsTrigger's bottom edge at desktop width, not just the shared search-bar/description ceiling", () => {
    const uiWrapper = document.getElementById("uiWrapper") as HTMLElement;
    uiWrapper.classList.add("shortMode");
    mockRect("descriptionArea", { bottom: 20 });
    mockRect("indoorSearchWrapper", { top: 640 });
    // #shortLegendTrigger sits at bottom: uiPadding (15px fallback), so its
    // top edge is 15px below where #legendWrapper's own "bottom" CSS offset
    // (uiPadding + button-size + uiPadding) would place the panel's bottom
    // edge — see the getUiPadding() subtraction in updateLegendClamp().
    mockRect("shortLegendTrigger", { top: 435 });
    mockRect("shortSettingsTrigger", { bottom: 305 });

    update();

    // panelBottom = 435 - 15 (uiPadding fallback) = 420
    // 420 - 305 - 10 (gap) - 27 (chrome) = 78
    expect(uiWrapper.style.getPropertyValue("--legend-clamp-height")).toBe("78px");
  });

  describe("applyPositionFallback", () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="uiWrapper" class="shortMode">
          <div id="indoorSearchWrapper"></div>
          <div id="mobileDescriptionCard"></div>
          <aside id="descriptionArea"></aside>
          <div id="legendWrapper" class="open"></div>
        </div>
      `;
    });

    it("adds the centered class and sets --popover-clamp-top when the default position collides with an obstacle", () => {
      const uiWrapper = document.getElementById("uiWrapper") as HTMLElement;
      mockRect("descriptionArea", { bottom: 60 });
      mockRect("indoorSearchWrapper", { top: 640, left: 0, right: 200, bottom: 700 });
      mockRect("legendWrapper", { top: 600, left: 0, right: 100, bottom: 680 });

      applyPositionFallback("legendWrapper");

      expect(document.getElementById("legendWrapper")?.classList.contains("centered")).toBe(true);
      // centered between ceiling (60) and floor (640): 60 + (640-60)/2 = 350
      expect(uiWrapper.style.getPropertyValue("--popover-clamp-top")).toBe("350px");
    });

    it("does not add the centered class when the default position doesn't collide with anything", () => {
      mockRect("descriptionArea", { bottom: 60 });
      mockRect("indoorSearchWrapper", { top: 640, left: 0, right: 200, bottom: 700 });
      mockRect("legendWrapper", { top: 100, left: 300, right: 400, bottom: 180 });

      applyPositionFallback("legendWrapper");

      expect(document.getElementById("legendWrapper")?.classList.contains("centered")).toBe(false);
    });

    it("removes a stale centered class before re-measuring", () => {
      document.getElementById("legendWrapper")?.classList.add("centered");
      mockRect("descriptionArea", { bottom: 60 });
      mockRect("indoorSearchWrapper", { top: 640, left: 0, right: 200, bottom: 700 });
      mockRect("legendWrapper", { top: 100, left: 300, right: 400, bottom: 180 });

      applyPositionFallback("legendWrapper");

      expect(document.getElementById("legendWrapper")?.classList.contains("centered")).toBe(false);
    });
  });
});
