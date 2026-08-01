import { OverpassElement } from "../../src";
import {
  contributesToIndoorLevels,
  isRawIndoorAreaGeometryElement,
  isRawIndoorHandrailElement,
  isRawIndoorLandingElement,
  isRawIndoorLevelElement,
  isRawIndoorRoomElement,
  isRawIndoorPointFeatureElement,
  isRawIndoorStepAreaElement,
  isRawMultipolygonRelation,
} from "../../src";

describe("multipolygon relation filtering", () => {
  it("only accepts type=multipolygon relations as supported area geometry", () => {
    expect(
      isRawMultipolygonRelation({
        type: "relation",
        id: 1,
        members: [],
        tags: { type: "multipolygon" },
      }),
    ).toBe(true);
    expect(
      isRawIndoorAreaGeometryElement({
        type: "relation",
        id: 2,
        members: [],
        tags: { type: "multilevel_feature" },
      }),
    ).toBe(false);
  });

  it("ignores non-multipolygon relations for area-like element filters", () => {
    const relation = {
      type: "relation" as const,
      id: 1,
      members: [] as [],
      tags: { type: "multilevel_feature", indoor: "room", "area:highway": "steps" },
    };

    expect(isRawIndoorRoomElement(relation)).toBe(false);
    expect(
      isRawIndoorLevelElement({ ...relation, tags: { ...relation.tags, indoor: "level" } }),
    ).toBe(false);
    expect(
      isRawIndoorLandingElement({
        ...relation,
        tags: { ...relation.tags, indoor: "area", landing: "yes" },
      }),
    ).toBe(false);
    expect(isRawIndoorStepAreaElement(relation)).toBe(false);
  });
});

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

  it("returns true for indoor room multipolygon relations", () => {
    expect(
      contributesToIndoorLevels({
        type: "relation",
        id: 1,
        members: [],
        tags: { type: "multipolygon", indoor: "room" },
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

describe("isRawIndoorPointFeatureElement", () => {
  it("treats tactile maps as generic point features", () => {
    expect(
      isRawIndoorPointFeatureElement({
        type: "node",
        id: 1,
        lat: 0,
        lon: 0,
        tags: { information: "tactile_map", level: "0" },
      }),
    ).toBe(true);
  });
});

describe("isRawIndoorStepAreaElement", () => {
  it.each(["way", "relation"] as const)("returns true for %s area:highway=steps", (type) => {
    const element =
      type == "way"
        ? { type, id: 1, nodes: [] as number[], tags: { "area:highway": "steps" } }
        : {
            type,
            id: 1,
            members: [] as [],
            tags: { type: "multipolygon", "area:highway": "steps" },
          };

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
