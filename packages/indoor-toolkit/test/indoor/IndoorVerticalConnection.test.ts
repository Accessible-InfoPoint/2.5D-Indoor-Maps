/**
 * @jest-environment jsdom
 */
import { createIndoorModel, OverpassJson } from "../../src";

describe("IndoorVerticalConnection", () => {
  it("classifies simple, open, and free-floating raw vertical connections", () => {
    const model = createIndoorModel(rawOverpassData);

    expect(model.elements.verticalConnections.map((connection) => connection.kind)).toEqual([
      "simple",
      "open",
      "freeFloating",
    ]);
    expect(
      model.elements.verticalConnections.map((connection) => connection.footprint?.id),
    ).toEqual(["way/10", "way/20", undefined]);
    expect(
      model.elements.verticalConnections.map((connection) =>
        connection.pathComponents.flatMap((component) =>
          component.pathways.map((pathway) => pathway.id),
        ),
      ),
    ).toEqual([["way/100"], ["way/101"], ["way/102"]]);
    expect(
      model.elements.openings.map((opening) => ({
        kind: opening.kind,
        nodeId: opening.nodeId,
        levels: opening.levels,
        connectedRooms: opening.connectedRooms.map((room) => room.id),
        sources: opening.sources.map((source) => source.role),
      })),
    ).toEqual([
      {
        kind: "opening",
        nodeId: 5,
        levels: [0],
        connectedRooms: ["way/20"],
        sources: ["pathway-node", "pathway", "footprint"],
      },
      {
        kind: "opening",
        nodeId: 6,
        levels: [1],
        connectedRooms: ["way/20"],
        sources: ["pathway-node", "pathway", "footprint"],
      },
    ]);
  });

  it("groups repeated free-floating stair spans by shared landing instances", () => {
    const model = createIndoorModel(repeatedFreeFloatingOverpassData);

    expect(model.elements.verticalConnections.map((connection) => connection.kind)).toEqual([
      "freeFloating",
      "freeFloating",
    ]);
    expect(
      model.elements.verticalConnections.map((connection) =>
        connection.pathComponents.map((component) => ({
          span: component.span,
          pathways: component.pathwayInstances.map((instance) => instance.source.id),
          landings: component.landingInstances.map((instance) => instance.id),
        })),
      ),
    ).toEqual([
      [
        { span: { from: 0, to: 0.5 }, pathways: ["way/100"], landings: ["way/200@0.5"] },
        { span: { from: 0.5, to: 1 }, pathways: ["way/101"], landings: ["way/200@0.5"] },
      ],
      [
        { span: { from: 1, to: 1.5 }, pathways: ["way/100"], landings: ["way/200@1.5"] },
        { span: { from: 1.5, to: 2 }, pathways: ["way/101"], landings: ["way/200@1.5"] },
      ],
    ]);
    expect(
      model.elements.openings.map((opening) => ({
        id: opening.id,
        kind: opening.kind,
        nodeId: opening.nodeId,
        levels: opening.levels,
        pathwayInstances: opening.connectedPathwayInstances.map((instance) => instance.id),
        landingInstances: opening.connectedLandingInstances.map((instance) => instance.id),
        hasOrientationGeometry: opening.orientationGeometry !== undefined,
        sources: opening.sources.map((source) => source.role),
      })),
    ).toEqual([
      {
        id: "pathway-landing-opening/way/100@0-0.5/way/200@0.5/node/2",
        kind: "pathway-landing",
        nodeId: 2,
        levels: [0.5],
        pathwayInstances: ["way/100@0-0.5"],
        landingInstances: ["way/200@0.5"],
        hasOrientationGeometry: false,
        sources: ["pathway-node", "pathway", "landing"],
      },
      {
        id: "pathway-landing-opening/way/101@0.5-1/way/200@0.5/node/3",
        kind: "pathway-landing",
        nodeId: 3,
        levels: [0.5],
        pathwayInstances: ["way/101@0.5-1"],
        landingInstances: ["way/200@0.5"],
        hasOrientationGeometry: false,
        sources: ["pathway-node", "pathway", "landing"],
      },
      {
        id: "pathway-landing-opening/way/100@1-1.5/way/200@1.5/node/2",
        kind: "pathway-landing",
        nodeId: 2,
        levels: [1.5],
        pathwayInstances: ["way/100@1-1.5"],
        landingInstances: ["way/200@1.5"],
        hasOrientationGeometry: false,
        sources: ["pathway-node", "pathway", "landing"],
      },
      {
        id: "pathway-landing-opening/way/101@1.5-2/way/200@1.5/node/3",
        kind: "pathway-landing",
        nodeId: 3,
        levels: [1.5],
        pathwayInstances: ["way/101@1.5-2"],
        landingInstances: ["way/200@1.5"],
        hasOrientationGeometry: false,
        sources: ["pathway-node", "pathway", "landing"],
      },
    ]);
    expect(
      model.topology.getOpeningsForStairPathway("way/100").map((opening) => opening.id),
    ).toEqual([
      "pathway-landing-opening/way/100@0-0.5/way/200@0.5/node/2",
      "pathway-landing-opening/way/100@1-1.5/way/200@1.5/node/2",
    ]);
    expect(
      model.topology.getOpeningsForStairLanding("way/200@0.5").map((opening) => opening.id),
    ).toEqual([
      "pathway-landing-opening/way/100@0-0.5/way/200@0.5/node/2",
      "pathway-landing-opening/way/101@0.5-1/way/200@0.5/node/3",
    ]);
  });

  it("uses configured non-existent levels when parsing semicolon pathway spans", () => {
    const model = createIndoorModel(nonExistentLevelSpanData, { nonExistentLevels: [2] });

    expect(model.elements.verticalConnections).toHaveLength(1);
    expect(
      model.elements.verticalConnections[0].pathComponents.map((component) => component.span),
    ).toEqual([{ from: 1, to: 3 }]);
    expect(model.diagnostics).toEqual([]);
  });

  it("reports discontinuous semicolon pathway spans", () => {
    const model = createIndoorModel(nonExistentLevelSpanData);

    expect(model.elements.verticalConnections).toEqual([]);
    expect(model.diagnostics).toMatchObject([
      {
        severity: "error",
        code: "VerticalSpan.discontinuous-level-list",
        elementRef: { id: "way/100" },
      },
    ]);
  });
});

const rawOverpassData: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 1 },
    { type: "node", id: 3, lat: 1, lon: 1 },
    { type: "node", id: 4, lat: 1, lon: 0 },
    { type: "node", id: 5, lat: 2, lon: 0 },
    { type: "node", id: 6, lat: 2, lon: 1 },
    { type: "node", id: 7, lat: 3, lon: 0 },
    { type: "node", id: 8, lat: 3, lon: 1 },
    {
      type: "way",
      id: 10,
      nodes: [1, 2, 3, 1],
      tags: { indoor: "room", stairs: "yes", level: "0;1" },
    },
    {
      type: "way",
      id: 20,
      nodes: [4, 5, 6, 4],
      tags: { indoor: "area", stairs: "yes", level: "0;1" },
    },
    { type: "way", id: 100, nodes: [1, 2], tags: { indoor: "pathway", level: "0-1" } },
    { type: "way", id: 101, nodes: [5, 6], tags: { indoor: "pathway", level: "0-1" } },
    { type: "way", id: 102, nodes: [7, 8], tags: { indoor: "pathway", level: "0-1" } },
  ],
};

const repeatedFreeFloatingOverpassData: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 1 },
    { type: "node", id: 3, lat: 1, lon: 1 },
    { type: "node", id: 4, lat: 1, lon: 0 },
    {
      type: "way",
      id: 100,
      nodes: [1, 2],
      tags: { indoor: "pathway", level: "0-0.5", repeat_on: "1" },
    },
    {
      type: "way",
      id: 101,
      nodes: [3, 4],
      tags: { indoor: "pathway", level: "0.5-1", repeat_on: "1.5" },
    },
    {
      type: "way",
      id: 200,
      nodes: [2, 3, 4, 1, 2],
      tags: { indoor: "area", landing: "yes", level: "0.5", repeat_on: "1.5" },
    },
  ],
};

const nonExistentLevelSpanData: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 1 },
    {
      type: "way",
      id: 100,
      nodes: [1, 2],
      tags: { indoor: "pathway", level: "1;3" },
    },
  ],
};
