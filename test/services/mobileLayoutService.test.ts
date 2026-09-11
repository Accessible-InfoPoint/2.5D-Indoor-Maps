/**
 * @jest-environment jsdom
 */
import MobileLayoutService from "../../src/services/mobileLayoutService";

describe("mobileLayoutService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getHandedness", () => {
    it("defaults to right", () => {
      expect(MobileLayoutService.getHandedness()).toBe("right");
    });

    it("returns stored handedness", () => {
      MobileLayoutService.setHandedness("left");
      expect(MobileLayoutService.getHandedness()).toBe("left");
    });

    it("falls back to right for an unrecognized stored value", () => {
      localStorage.setItem("mobileHandedness", "sideways");
      expect(MobileLayoutService.getHandedness()).toBe("right");
    });
  });

  describe("getShowZoomButtons", () => {
    it("defaults to false", () => {
      expect(MobileLayoutService.getShowZoomButtons()).toBe(false);
    });

    it("returns stored value", () => {
      MobileLayoutService.setShowZoomButtons(true);
      expect(MobileLayoutService.getShowZoomButtons()).toBe(true);
    });
  });
});
