import { OverpassElement } from "../../src/models/overpassJson";
import {
  contributesToIndoorLevels,
  isRawIndoorHandrailElement,
} from "../../src/indoor/rawIndoorElementFilters";

describe("contributesToIndoorLevels", () => {
  it.each(["room", "corridor", "area"])("returns true for indoor=%s ways", (indoor) => {
    expect(
      contributesToIndoorLevels({
        type: "way",
        id: 1,
        nodes: [],
        tags: { indoor },
      }),
    ).toBe(true);
  });

  it("returns true for indoor room relations", () => {
    expect(
      contributesToIndoorLevels({
        type: "relation",
        id: 1,
        members: [],
        tags: { indoor: "room" },
      }),
    ).toBe(true);
  });

  it("ignores nodes even when they carry indoor and level tags", () => {
    expect(
      contributesToIndoorLevels({
        type: "node",
        id: 1,
        lat: 0,
        lon: 0,
        tags: { indoor: "room", level: "0.5" },
      }),
    ).toBe(false);
  });

  it("ignores landing elements", () => {
    expect(
      contributesToIndoorLevels({
        type: "way",
        id: 1,
        nodes: [],
        tags: { indoor: "area", landing: "yes" },
      }),
    ).toBe(false);
  });

  it("ignores other indoor element types", () => {
    const elements: OverpassElement[] = [
      { type: "way", id: 1, nodes: [], tags: { indoor: "wall" } },
      { type: "way", id: 2, nodes: [], tags: { indoor: "door" } },
      { type: "way", id: 3, nodes: [] },
    ];

    elements.forEach((element) => expect(contributesToIndoorLevels(element)).toBe(false));
  });
});

describe("isRawIndoorHandrailElement", () => {
  it("returns true for barrier=handrail ways", () => {
    expect(
      isRawIndoorHandrailElement({
        type: "way",
        id: 1,
        nodes: [],
        tags: { barrier: "handrail" },
      }),
    ).toBe(true);
  });

  it("ignores non-way handrail elements", () => {
    expect(
      isRawIndoorHandrailElement({
        type: "node",
        id: 1,
        lat: 0,
        lon: 0,
        tags: { barrier: "handrail" },
      }),
    ).toBe(false);
  });
});
