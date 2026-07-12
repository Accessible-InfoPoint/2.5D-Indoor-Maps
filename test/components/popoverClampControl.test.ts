/**
 * @jest-environment jsdom
 */

describe("popoverClampControl", () => {
  let update: () => void;

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = `
      <div id="uiWrapper">
        <div id="indoorSearchWrapper"></div>
        <div id="mobileDescriptionCard"></div>
        <aside id="descriptionArea"></aside>
      </div>
    `;

    ({
      default: { update },
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

  it("clears the clamp custom property when shortMode is not active", () => {
    const uiWrapper = document.getElementById("uiWrapper") as HTMLElement;
    uiWrapper.style.setProperty("--popover-clamp-height", "100px");

    update();

    expect(uiWrapper.style.getPropertyValue("--popover-clamp-height")).toBe("");
  });

  it("clamps between the search bar and description card on mobile", () => {
    const uiWrapper = document.getElementById("uiWrapper") as HTMLElement;
    uiWrapper.classList.add("shortMode", "mobileMode");
    mockRect("indoorSearchWrapper", { bottom: 80 });
    mockRect("mobileDescriptionCard", { top: 500 });

    update();

    expect(uiWrapper.style.getPropertyValue("--popover-clamp-height")).toBe("400px");
  });

  it("clamps between the centered description and the search bar at desktop width", () => {
    const uiWrapper = document.getElementById("uiWrapper") as HTMLElement;
    uiWrapper.classList.add("shortMode");
    mockRect("descriptionArea", { bottom: 60 });
    mockRect("indoorSearchWrapper", { top: 640 });

    update();

    expect(uiWrapper.style.getPropertyValue("--popover-clamp-height")).toBe("560px");
  });

  it("clamps between the top-left description card and the search bar once lowHeightMode also applies at desktop width", () => {
    const uiWrapper = document.getElementById("uiWrapper") as HTMLElement;
    uiWrapper.classList.add("shortMode", "lowHeightMode");
    mockRect("mobileDescriptionCard", { bottom: 120 });
    mockRect("indoorSearchWrapper", { top: 540 });

    update();

    expect(uiWrapper.style.getPropertyValue("--popover-clamp-height")).toBe("400px");
  });

  it("never sets a negative clamp height", () => {
    const uiWrapper = document.getElementById("uiWrapper") as HTMLElement;
    uiWrapper.classList.add("shortMode", "mobileMode");
    mockRect("indoorSearchWrapper", { bottom: 300 });
    mockRect("mobileDescriptionCard", { top: 305 });

    update();

    expect(uiWrapper.style.getPropertyValue("--popover-clamp-height")).toBe("0px");
  });
});
