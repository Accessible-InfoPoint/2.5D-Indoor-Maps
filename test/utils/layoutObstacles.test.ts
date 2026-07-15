/**
 * @jest-environment jsdom
 */
import LayoutObstacles from "../../src/utils/layoutObstacles";

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

describe("layoutObstacles", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="indoorSearchWrapper"></div>
      <div id="legendWrapper" style="display: none;"></div>
      <div id="mobileDescriptionCard"></div>
    `;
    mockRect("indoorSearchWrapper", { top: 0, left: 0, right: 100, bottom: 40 });
    mockRect("mobileDescriptionCard", { top: 200, left: 0, right: 100, bottom: 300 });
  });

  describe("getObstacleRects", () => {
    it("returns rects only for elements that exist and are visible", () => {
      const obstacles = LayoutObstacles.getObstacleRects();
      const ids = obstacles.map((o) => o.id);

      expect(ids).toContain("indoorSearchWrapper");
      expect(ids).toContain("mobileDescriptionCard");
      expect(ids).not.toContain("legendWrapper");
      expect(ids).not.toContain("switchWheelchairModeWrapper");
    });

    it("excludes ids passed in excludeIds", () => {
      const obstacles = LayoutObstacles.getObstacleRects(["indoorSearchWrapper"]);
      expect(obstacles.map((o) => o.id)).not.toContain("indoorSearchWrapper");
      expect(obstacles.map((o) => o.id)).toContain("mobileDescriptionCard");
    });
  });

  describe("rectsOverlap", () => {
    it("returns true for overlapping rects", () => {
      const a = { top: 0, left: 0, right: 100, bottom: 100 } as DOMRect;
      const b = { top: 50, left: 50, right: 150, bottom: 150 } as DOMRect;
      expect(LayoutObstacles.rectsOverlap(a, b)).toBe(true);
    });

    it("returns false for disjoint rects", () => {
      const a = { top: 0, left: 0, right: 100, bottom: 100 } as DOMRect;
      const b = { top: 200, left: 200, right: 300, bottom: 300 } as DOMRect;
      expect(LayoutObstacles.rectsOverlap(a, b)).toBe(false);
    });

    it("returns false for rects that only touch at an edge", () => {
      const a = { top: 0, left: 0, right: 100, bottom: 100 } as DOMRect;
      const b = { top: 0, left: 100, right: 200, bottom: 100 } as DOMRect;
      expect(LayoutObstacles.rectsOverlap(a, b)).toBe(false);
    });
  });

  describe("isWithinViewport", () => {
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;

    beforeEach(() => {
      Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });
      Object.defineProperty(window, "innerHeight", { value: 600, configurable: true });
    });

    afterEach(() => {
      Object.defineProperty(window, "innerWidth", {
        value: originalInnerWidth,
        configurable: true,
      });
      Object.defineProperty(window, "innerHeight", {
        value: originalInnerHeight,
        configurable: true,
      });
    });

    it("returns true when the rect is fully inside the viewport", () => {
      const rect = { top: 10, left: 10, right: 100, bottom: 100 } as DOMRect;
      expect(LayoutObstacles.isWithinViewport(rect)).toBe(true);
    });

    it("returns false when the rect extends past the right edge", () => {
      const rect = { top: 10, left: 10, right: 900, bottom: 100 } as DOMRect;
      expect(LayoutObstacles.isWithinViewport(rect)).toBe(false);
    });

    it("returns false when the rect starts above the top edge", () => {
      const rect = { top: -10, left: 10, right: 100, bottom: 100 } as DOMRect;
      expect(LayoutObstacles.isWithinViewport(rect)).toBe(false);
    });
  });
});
