/**
 * @jest-environment jsdom
 */
import {
  createIndoorElementRef,
  createIndoorModel,
  formatIndoorDiagnostic,
  OverpassJson,
} from "../../src";

describe("IndoorModel public API", () => {
  it("exposes parsed elements through a registry", () => {
    const model = createIndoorModel(connectionData);
    const room = model.elements.rooms[0];

    expect(model.elements.rooms.map((element) => element.id)).toEqual(["way/10", "way/20"]);
    expect(model.elements.doors.map((element) => element.id)).toEqual(["node/2"]);
    expect(model.elements.openings.map((element) => element.id)).toEqual(["node/2"]);
    expect(model.elements.pointFeatures.map((element) => element.id)).toEqual(["node/5"]);
    expect(model.elements.getById("way/10")).toBe(room);
    expect(model.elements.getByRef(createIndoorElementRef({ id: "way/10" }))).toBe(room);
    expect(model.elements.getByLevel(0).map((element) => element.id)).toEqual([
      "way/10",
      "way/20",
      "node/2",
      "node/2",
      "node/5",
    ]);
  });

  it("exposes room and opening topology", () => {
    const model = createIndoorModel(connectionData);

    expect(model.topology.getOpeningsForRoom("way/10").map((opening) => opening.id)).toEqual([
      "node/2",
    ]);
    expect(model.topology.getRoomsForOpening("node/2").map((room) => room.id)).toEqual([
      "way/10",
      "way/20",
    ]);
    expect(model.topology.getConnectedRooms("way/10").map((room) => room.id)).toEqual(["way/20"]);
    expect(
      model.topology.getConnectedRoomPairs().map((connection) => ({
        opening: connection.opening.id,
        rooms: connection.rooms.map((room) => room.id),
      })),
    ).toEqual([{ opening: "node/2", rooms: ["way/10", "way/20"] }]);
    expect(model.topology.getRoomsAtNode(2, 0).map((room) => room.id)).toEqual([
      "way/10",
      "way/20",
    ]);
  });

  it("exposes vertical connection topology", () => {
    const model = createIndoorModel(verticalConnectionData);

    expect(
      model.topology.getVerticalConnectionsForLevel(0).map((connection) => connection.id),
    ).toEqual(["vertical-connection/way/10"]);
    expect(
      model.topology.getVerticalConnectionsBetweenLevels(0, 1).map((connection) => connection.id),
    ).toEqual(["vertical-connection/way/10"]);
  });

  it("collects diagnostics and can forward them to callers", () => {
    const handledDiagnostics: string[] = [];
    const model = createIndoorModel(invalidGeometryData, {
      onDiagnostic: (diagnostic) => handledDiagnostics.push(diagnostic.code),
    });

    expect(model.diagnostics).toEqual([]);

    expect(model.elements.rooms[0].geometry).toBeUndefined();

    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "IndoorRoom.missing-way-nodes",
    ]);
    expect(handledDiagnostics).toEqual(["IndoorRoom.missing-way-nodes"]);
    expect(formatIndoorDiagnostic(model.diagnostics[0])).toContain(
      "Cannot render room way/10: missing node(s) 3.",
    );
  });

  it("can forward diagnostics to console.warn", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const model = createIndoorModel(invalidGeometryData, { logDiagnostics: true });

    expect(model.elements.rooms[0].geometry).toBeUndefined();

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("[IndoorToolkit:warning:IndoorRoom.missing-way-nodes] way/10"),
    );

    warn.mockRestore();
  });

  it("collects level parsing diagnostics while building the model", () => {
    const model = createIndoorModel(levelDiagnosticData);

    expect(model.levels).toEqual([3, 2, 1]);
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "ExtractLevels.inverted-level-range",
      "ExtractLevels.duplicate-level-values",
      "ExtractLevels.comma-separated-levels",
    ]);
    expect(model.diagnostics.map((diagnostic) => diagnostic.elementRef?.id)).toEqual([
      "way/10",
      "way/10",
      "way/20",
    ]);
  });

  it("omits non-existent building levels from element levels and model levels", () => {
    const model = createIndoorModel(nonExistentLevelsData, { nonExistentLevels: [2] });

    expect(model.levels).toEqual([3, 1]);
    expect(model.elements.rooms[0].levels).toEqual([1, 3]);
    expect(model.elements.levelOutlines[0].levels).toEqual([1, 3]);
    expect(model.levelLabels).toEqual(
      new Map([
        [1, "shared"],
        [3, "shared"],
      ]),
    );
    expect(model.elements.getByLevel(2)).toEqual([]);
  });

  it("does not repeat level outlines or labels with repeat_on", () => {
    const model = createIndoorModel(repeatedLevelOutlineData);

    expect(model.levels).toEqual([1, 0]);
    expect(model.elements.rooms[0].levels).toEqual([0, 1]);
    expect(model.elements.levelOutlines[0].levels).toEqual([0]);
    expect(model.elements.levelOutlines[0].hasLevel(1)).toBe(false);
    expect(model.levelLabels).toEqual(new Map([[0, "E"]]));
  });

  it("collects inferred stair landings as landings only", () => {
    const model = createIndoorModel(inferredLandingData);

    expect(model.elements.rooms.map((room) => room.id)).toEqual(["way/30"]);
    expect(model.elements.stairLandings.map((landing) => landing.id)).toEqual(["way/20"]);
    expect(model.elements.getById("way/20")).toBe(model.elements.stairLandings[0]);
    expect(model.diagnostics).toEqual([]);
  });

  it("can infer relation stair landings", () => {
    const model = createIndoorModel(inferredRelationLandingData);

    expect(model.elements.rooms).toEqual([]);
    expect(model.elements.stairLandings.map((landing) => landing.id)).toEqual(["relation/20"]);
    expect(model.diagnostics).toEqual([]);
  });

  it("reports inferred landing areas that only connect one stair pathway", () => {
    const model = createIndoorModel(singlePathLandingData);

    expect(model.elements.rooms).toEqual([]);
    expect(model.elements.stairLandings.map((landing) => landing.id)).toEqual(["way/20"]);
    expect(model.diagnostics).toMatchObject([
      {
        severity: "error",
        code: "IndoorLanding.single-connected-stair-path",
        elementRef: { id: "way/20" },
      },
    ]);
  });
});

const connectionData: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 1, tags: { door: "yes", level: "0" } },
    { type: "node", id: 3, lat: 1, lon: 1 },
    { type: "node", id: 4, lat: 1, lon: 0 },
    { type: "node", id: 5, lat: 0.5, lon: 0.5, tags: { information: "tactile_map", level: "0" } },
    {
      type: "way",
      id: 10,
      nodes: [1, 2, 3, 1],
      tags: { indoor: "room", level: "0", name: "Room A" },
    },
    {
      type: "way",
      id: 20,
      nodes: [2, 4, 3, 2],
      tags: { indoor: "room", level: "0", name: "Room B" },
    },
  ],
};

const verticalConnectionData: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 1 },
    { type: "node", id: 3, lat: 1, lon: 1 },
    {
      type: "way",
      id: 10,
      nodes: [1, 2, 3, 1],
      tags: { indoor: "room", stairs: "yes", level: "0;1" },
    },
    {
      type: "way",
      id: 100,
      nodes: [1, 2],
      tags: { indoor: "pathway", level: "0-1" },
    },
  ],
};

const invalidGeometryData: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 1 },
    {
      type: "way",
      id: 10,
      nodes: [1, 2, 3, 1],
      tags: { indoor: "room", level: "0" },
    },
  ],
};

const levelDiagnosticData: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 1 },
    { type: "node", id: 3, lat: 1, lon: 1 },
    {
      type: "way",
      id: 10,
      nodes: [1, 2, 3, 1],
      tags: { indoor: "room", level: "3-1", repeat_on: "2;2" },
    },
    {
      type: "way",
      id: 20,
      nodes: [1, 2, 3, 1],
      tags: { indoor: "room", level: "1,5" },
    },
  ],
};

const nonExistentLevelsData: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 1 },
    { type: "node", id: 3, lat: 1, lon: 1 },
    {
      type: "way",
      id: 10,
      nodes: [1, 2, 3, 1],
      tags: { indoor: "room", level: "1-3" },
    },
    {
      type: "way",
      id: 20,
      nodes: [1, 2, 3, 1],
      tags: { indoor: "level", level: "1-3", "level:ref": "shared" },
    },
  ],
};

const repeatedLevelOutlineData: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 1 },
    { type: "node", id: 3, lat: 1, lon: 1 },
    {
      type: "way",
      id: 10,
      nodes: [1, 2, 3, 1],
      tags: { indoor: "room", level: "0", repeat_on: "1" },
    },
    {
      type: "way",
      id: 20,
      nodes: [1, 2, 3, 1],
      tags: { indoor: "level", level: "0", repeat_on: "1", "level:ref": "E" },
    },
  ],
};

const inferredLandingData: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 1 },
    { type: "node", id: 3, lat: 1, lon: 1 },
    { type: "node", id: 4, lat: 1, lon: 0 },
    { type: "node", id: 5, lat: 2, lon: 0 },
    { type: "node", id: 6, lat: 2, lon: 1 },
    { type: "node", id: 7, lat: 3, lon: 0 },
    { type: "way", id: 10, nodes: [1, 2], tags: { indoor: "pathway", level: "0-1" } },
    { type: "way", id: 11, nodes: [3, 4], tags: { indoor: "pathway", level: "0-1" } },
    {
      type: "way",
      id: 20,
      nodes: [2, 3, 4, 1, 2],
      tags: { indoor: "area", level: "1" },
    },
    {
      type: "way",
      id: 30,
      nodes: [5, 6, 7, 5],
      tags: { indoor: "area", level: "1" },
    },
  ],
};

const inferredRelationLandingData: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 1 },
    { type: "node", id: 3, lat: 1, lon: 1 },
    { type: "node", id: 4, lat: 1, lon: 0 },
    { type: "way", id: 10, nodes: [1, 2], tags: { indoor: "pathway", level: "0-1" } },
    { type: "way", id: 11, nodes: [3, 4], tags: { indoor: "pathway", level: "0-1" } },
    { type: "way", id: 21, nodes: [2, 3, 4, 1, 2] },
    {
      type: "relation",
      id: 20,
      members: [{ type: "way", ref: 21, role: "outer" }],
      tags: { type: "multipolygon", indoor: "area", level: "1" },
    },
  ],
};

const singlePathLandingData: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 1 },
    { type: "node", id: 3, lat: 1, lon: 1 },
    { type: "node", id: 4, lat: 1, lon: 0 },
    { type: "way", id: 10, nodes: [1, 2], tags: { indoor: "pathway", level: "0-1" } },
    {
      type: "way",
      id: 20,
      nodes: [2, 3, 4, 1, 2],
      tags: { indoor: "area", level: "1" },
    },
  ],
};
