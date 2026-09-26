describe("overlayExclusivityService", () => {
  let OverlayExclusivityService: typeof import("../../src/services/overlayExclusivityService").default;

  beforeEach(() => {
    jest.resetModules();
    OverlayExclusivityService = jest.requireActual(
      "../../src/services/overlayExclusivityService",
    ).default;
  });

  it("closes every other registered overlay when one opens", () => {
    const closeA = jest.fn();
    const closeB = jest.fn();
    OverlayExclusivityService.registerOverlay("a", closeA);
    OverlayExclusivityService.registerOverlay("b", closeB);

    OverlayExclusivityService.notifyOpened("a");

    expect(closeA).not.toHaveBeenCalled();
    expect(closeB).toHaveBeenCalledTimes(1);
  });

  it("stops calling close after unregistering", () => {
    const closeA = jest.fn();
    const unregister = OverlayExclusivityService.registerOverlay("a", closeA);
    unregister();

    OverlayExclusivityService.notifyOpened("b");

    expect(closeA).not.toHaveBeenCalled();
  });

  it("unregistering one overlay leaves other registrations intact", () => {
    const closeA = jest.fn();
    const closeB = jest.fn();
    const unregisterA = OverlayExclusivityService.registerOverlay("a", closeA);
    OverlayExclusivityService.registerOverlay("b", closeB);

    unregisterA();

    OverlayExclusivityService.notifyOpened("c");

    expect(closeA).not.toHaveBeenCalled();
    expect(closeB).toHaveBeenCalledTimes(1);
  });

  it("closeAll closes every registered overlay", () => {
    const closeA = jest.fn();
    const closeB = jest.fn();
    OverlayExclusivityService.registerOverlay("a", closeA);
    OverlayExclusivityService.registerOverlay("b", closeB);

    OverlayExclusivityService.closeAll();

    expect(closeA).toHaveBeenCalledTimes(1);
    expect(closeB).toHaveBeenCalledTimes(1);
  });

  it("notifyOpened with an id nothing is registered under still closes all current registrations", () => {
    const closeA = jest.fn();
    OverlayExclusivityService.registerOverlay("a", closeA);

    OverlayExclusivityService.notifyOpened("unregistered-id");

    expect(closeA).toHaveBeenCalledTimes(1);
  });
});
