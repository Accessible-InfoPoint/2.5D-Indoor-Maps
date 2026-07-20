import { OverpassElement } from "../../src/models/overpassJson";
import {
  contributesToIndoorLevels,
  isRawIndoorHandrailElement,
  isRawIndoorStepAreaElement,
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

  it("returns true for indoor=level outlines", () => {
    expect(
      contributesToIndoorLevels({
        type: "way",
        id: 1,
        nodes: [],
        tags: { indoor: "level", level: "0", "level:ref": "E" },
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

describe("isRawIndoorStepAreaElement", () => {
  it.each(["way", "relation"] as const)("returns true for %s area:highway=steps", (type) => {
    const element =
      type == "way"
        ? { type, id: 1, nodes: [] as number[], tags: { "area:highway": "steps" } }
        : { type, id: 1, members: [] as [], tags: { "area:highway": "steps" } };

    expect(isRawIndoorStepAreaElement(element)).toBe(true);
  });

  it("ignores node step areas", () => {
    expect(
      isRawIndoorStepAreaElement({
        type: "node",
        id: 1,
        lat: 0,
        lon: 0,
        tags: { "area:highway": "steps" },
      }),
    ).toBe(false);
  });
});
