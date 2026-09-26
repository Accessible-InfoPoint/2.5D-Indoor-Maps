import {
  isMobileWidth,
  MOBILE_BREAKPOINT_PX,
  isShortHeight,
  SHORT_BREAKPOINT_PX,
  isLowHeight,
  LOW_HEIGHT_BREAKPOINT_PX,
} from "../../src/utils/breakpoints";

describe("isMobileWidth", () => {
  it("returns true at the breakpoint boundary", () => {
    expect(isMobileWidth(MOBILE_BREAKPOINT_PX)).toBe(true);
  });

  it("returns true below the breakpoint", () => {
    expect(isMobileWidth(375)).toBe(true);
  });

  it("returns false above the breakpoint", () => {
    expect(isMobileWidth(1024)).toBe(false);
  });
});

describe("isShortHeight", () => {
  it("returns true at the breakpoint boundary", () => {
    expect(isShortHeight(SHORT_BREAKPOINT_PX)).toBe(true);
  });

  it("returns true below the breakpoint", () => {
    expect(isShortHeight(700)).toBe(true);
  });

  it("returns false above the breakpoint", () => {
    expect(isShortHeight(800)).toBe(false);
  });
});

describe("isLowHeight", () => {
  it("returns true at the breakpoint boundary", () => {
    expect(isLowHeight(LOW_HEIGHT_BREAKPOINT_PX)).toBe(true);
  });

  it("returns true below the breakpoint", () => {
    expect(isLowHeight(500)).toBe(true);
  });

  it("returns false above the breakpoint", () => {
    expect(isLowHeight(700)).toBe(false);
  });
});
