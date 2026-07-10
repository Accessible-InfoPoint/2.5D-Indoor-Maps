import { isMobileWidth, MOBILE_BREAKPOINT_PX } from "../../src/utils/breakpoints";

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
