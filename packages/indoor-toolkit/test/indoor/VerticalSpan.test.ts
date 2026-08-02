import { IndoorDiagnostics, parseVerticalSpan } from "../../src";

describe("parseVerticalSpan", () => {
  it("parses hyphen ranges", () => {
    expect(parseVerticalSpan("1-3")).toEqual({ from: 1, to: 3 });
    expect(parseVerticalSpan("3-1")).toEqual({ from: 1, to: 3 });
  });

  it("converts contiguous semicolon-separated levels into a span", () => {
    expect(parseVerticalSpan("1;2;3")).toEqual({ from: 1, to: 3 });
  });

  it("allows semicolon-separated spans across non-existent levels", () => {
    expect(parseVerticalSpan("1;3", { nonExistentLevels: [2] })).toEqual({ from: 1, to: 3 });
  });

  it("reports an error for discontinuous semicolon-separated spans", () => {
    const diagnostics = new IndoorDiagnostics();

    expect(parseVerticalSpan("1;3", { diagnostics, tagName: "level" })).toBeUndefined();
    expect(diagnostics.diagnostics).toMatchObject([
      {
        severity: "error",
        code: "VerticalSpan.discontinuous-level-list",
      },
    ]);
  });
});
