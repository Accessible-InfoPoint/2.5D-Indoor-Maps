/**
 * @jest-environment jsdom
 */

describe("mobilePopover", () => {
  let setupPopover: typeof import("../../src/components/ui/mobilePopover").setupPopover;
  let closeAllPopovers: typeof import("../../src/components/ui/mobilePopover").closeAllPopovers;
  let triggerA: HTMLButtonElement;
  let panelA: HTMLDivElement;
  let triggerB: HTMLButtonElement;
  let panelB: HTMLDivElement;

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = `
      <button id="triggerA"></button>
      <div id="panelA"><button id="panelAButton">A</button></div>
      <button id="triggerB"></button>
      <div id="panelB"></div>
    `;
    triggerA = document.getElementById("triggerA") as HTMLButtonElement;
    panelA = document.getElementById("panelA") as HTMLDivElement;
    triggerB = document.getElementById("triggerB") as HTMLButtonElement;
    panelB = document.getElementById("panelB") as HTMLDivElement;

    ({ setupPopover, closeAllPopovers } = jest.requireActual(
      "../../src/components/ui/mobilePopover",
    ));
  });

  it("opens the panel and marks the trigger expanded on click", () => {
    setupPopover({ triggerId: "triggerA", panelId: "panelA" });

    triggerA.click();

    expect(triggerA.getAttribute("aria-expanded")).toBe("true");
    expect(panelA.classList.contains("open")).toBe(true);
  });

  it("closes an open panel on a second trigger click", () => {
    setupPopover({ triggerId: "triggerA", panelId: "panelA" });

    triggerA.click();
    triggerA.click();

    expect(triggerA.getAttribute("aria-expanded")).toBe("false");
    expect(panelA.classList.contains("open")).toBe(false);
  });

  it("closes the previously open popover when another one opens", () => {
    setupPopover({ triggerId: "triggerA", panelId: "panelA" });
    setupPopover({ triggerId: "triggerB", panelId: "panelB" });

    triggerA.click();
    triggerB.click();

    expect(triggerA.getAttribute("aria-expanded")).toBe("false");
    expect(panelA.classList.contains("open")).toBe(false);
    expect(triggerB.getAttribute("aria-expanded")).toBe("true");
    expect(panelB.classList.contains("open")).toBe(true);
  });

  it("supports multiple trigger ids sharing one panel", () => {
    document.body.insertAdjacentHTML("beforeend", `<button id="triggerC"></button>`);
    const triggerC = document.getElementById("triggerC") as HTMLButtonElement;

    setupPopover({ triggerId: ["triggerA", "triggerC"], panelId: "panelA" });

    triggerC.click();
    expect(panelA.classList.contains("open")).toBe(true);
    expect(triggerA.getAttribute("aria-expanded")).toBe("true");
    expect(triggerC.getAttribute("aria-expanded")).toBe("true");

    triggerA.click();
    expect(panelA.classList.contains("open")).toBe(false);
    expect(triggerC.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes on Escape and returns focus to the trigger", () => {
    setupPopover({ triggerId: "triggerA", panelId: "panelA" });

    triggerA.click();
    panelA.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(panelA.classList.contains("open")).toBe(false);
    expect(document.activeElement).toBe(triggerA);
  });

  it("closes when clicking outside the trigger and panel", () => {
    setupPopover({ triggerId: "triggerA", panelId: "panelA" });

    triggerA.click();
    document.body.click();

    expect(panelA.classList.contains("open")).toBe(false);
    expect(document.activeElement).not.toBe(triggerA);
  });

  it("stays open on an outside click when closeOnOutsideClick is false", () => {
    setupPopover({ triggerId: "triggerA", panelId: "panelA", closeOnOutsideClick: false });

    triggerA.click();
    document.body.click();

    expect(panelA.classList.contains("open")).toBe(true);
  });

  it("still closes via its own trigger when closeOnOutsideClick is false", () => {
    setupPopover({ triggerId: "triggerA", panelId: "panelA", closeOnOutsideClick: false });

    triggerA.click();
    triggerA.click();

    expect(panelA.classList.contains("open")).toBe(false);
  });

  it("is not force-closed by another overlay opening when closeOnOutsideClick is false", () => {
    const OverlayExclusivityService = jest.requireActual(
      "../../src/services/overlayExclusivityService",
    ).default as typeof import("../../src/services/overlayExclusivityService").default;

    setupPopover({ triggerId: "triggerA", panelId: "panelA", closeOnOutsideClick: false });
    triggerA.click();
    expect(panelA.classList.contains("open")).toBe(true);

    OverlayExclusivityService.notifyOpened("someOtherOverlay");

    expect(panelA.classList.contains("open")).toBe(true);
  });

  it("does not force-close a different open overlay when opened, when closeOnOutsideClick is false", () => {
    const OverlayExclusivityService = jest.requireActual(
      "../../src/services/overlayExclusivityService",
    ).default as typeof import("../../src/services/overlayExclusivityService").default;
    const closeFakeOverlay = jest.fn();
    OverlayExclusivityService.registerOverlay("fakeOverlay", closeFakeOverlay);

    setupPopover({ triggerId: "triggerA", panelId: "panelA", closeOnOutsideClick: false });
    triggerA.click();

    expect(panelA.classList.contains("open")).toBe(true);
    expect(closeFakeOverlay).not.toHaveBeenCalled();
  });

  it("makes a panel without focusable children still programmatically focusable", () => {
    setupPopover({ triggerId: "triggerB", panelId: "panelB" });

    triggerB.click();

    expect(panelB.getAttribute("tabindex")).toBe("-1");
  });

  it("closeAllPopovers closes every registered popover", () => {
    setupPopover({ triggerId: "triggerA", panelId: "panelA" });
    setupPopover({ triggerId: "triggerB", panelId: "panelB" });

    triggerA.click();
    closeAllPopovers();

    expect(panelA.classList.contains("open")).toBe(false);
  });

  it("closeAllPopovers also closes overlays registered directly with overlayExclusivityService", () => {
    const OverlayExclusivityService = jest.requireActual(
      "../../src/services/overlayExclusivityService",
    ).default as typeof import("../../src/services/overlayExclusivityService").default;
    const closeFakeOverlay = jest.fn();
    OverlayExclusivityService.registerOverlay("fakeOverlay", closeFakeOverlay);

    closeAllPopovers();

    expect(closeFakeOverlay).toHaveBeenCalledTimes(1);
  });

  it("opening a popover closes an overlay registered directly with overlayExclusivityService", () => {
    const OverlayExclusivityService = jest.requireActual(
      "../../src/services/overlayExclusivityService",
    ).default as typeof import("../../src/services/overlayExclusivityService").default;
    const closeFakeOverlay = jest.fn();
    OverlayExclusivityService.registerOverlay("fakeOverlay", closeFakeOverlay);

    setupPopover({ triggerId: "triggerA", panelId: "panelA" });
    triggerA.click();

    expect(closeFakeOverlay).toHaveBeenCalledTimes(1);
  });

  it("skips a display:none first child and focuses the next visible focusable child on open", () => {
    const hiddenFirst = document.createElement("button");
    hiddenFirst.id = "hiddenFirst";
    hiddenFirst.style.display = "none";
    panelA.insertBefore(hiddenFirst, panelA.firstChild);

    const visibleButton = document.getElementById("panelAButton") as HTMLButtonElement;

    setupPopover({ triggerId: "triggerA", panelId: "panelA" });

    triggerA.click();

    expect(document.activeElement).toBe(visibleButton);
  });

  it("wraps Tab focus between visible focusable children, skipping hidden first/last ones", () => {
    // Mimics the level-control popover: hidden buttons at both ends around visible/focusable controls.
    const hiddenFirst = document.createElement("button");
    hiddenFirst.id = "hiddenFirst";
    hiddenFirst.style.display = "none";
    panelA.insertBefore(hiddenFirst, panelA.firstChild);

    const firstVisible = document.getElementById("panelAButton") as HTMLButtonElement;

    const lastVisible = document.createElement("button");
    lastVisible.id = "lastVisible";
    panelA.appendChild(lastVisible);

    const hiddenLast = document.createElement("button");
    hiddenLast.id = "hiddenLast";
    hiddenLast.style.display = "none";
    panelA.appendChild(hiddenLast);

    setupPopover({ triggerId: "triggerA", panelId: "panelA" });

    triggerA.click();

    lastVisible.focus();
    const tabEvent = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    panelA.dispatchEvent(tabEvent);
    expect(document.activeElement).toBe(firstVisible);

    firstVisible.focus();
    const shiftTabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    panelA.dispatchEvent(shiftTabEvent);
    expect(document.activeElement).toBe(lastVisible);
  });
});
