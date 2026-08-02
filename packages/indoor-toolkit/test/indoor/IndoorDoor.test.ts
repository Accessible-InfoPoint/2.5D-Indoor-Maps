import {
  IndoorDiagnostics,
  IndoorDoor,
  IndoorRoom,
  IndoorWall,
  OsmGraph,
  OverpassJson,
} from "../../src";

describe("IndoorDoor", () => {
  it("collects door nodes from the raw graph", () => {
    const graph = new OsmGraph(doorFixture);

    expect(IndoorDoor.collectFromGraph(graph).map((door) => door.id)).toEqual(["node/2"]);
  });

  it("connects to rooms through shared way node membership", () => {
    const graph = new OsmGraph(doorFixture);
    const door = IndoorDoor.collectFromGraph(graph)[0];
    const rooms = IndoorRoom.collectFromGraph(graph);

    expect(door.getConnectedRooms(rooms).map((room) => room.id)).toEqual(["way/10", "way/11"]);
  });

  it("builds semantic opening data from raw graph relationships", () => {
    const graph = new OsmGraph(doorFixture);
    const door = IndoorDoor.collectFromGraph(graph)[0];
    const rooms = IndoorRoom.collectFromGraph(graph);
    const walls = IndoorWall.collectFromGraph(graph);

    const opening = door.toOpening(rooms, walls);

    expect(opening?.kind).toBe("door");
    expect(opening?.orientationGeometry.orientation).toHaveLength(3);
    expect(opening?.widthMeters).toBe(2);
    expect(opening?.orientationGeometry.debug.opening).toEqual([1, 0]);
  });

  it("records connected rooms, connected walls and source elements", () => {
    const graph = new OsmGraph(doorFixture);
    const door = IndoorDoor.collectFromGraph(graph)[0];
    const rooms = IndoorRoom.collectFromGraph(graph);
    const walls = IndoorWall.collectFromGraph(graph);

    const opening = door.toOpening(rooms, walls);

    expect(opening?.connectedRooms.map((room) => room.id)).toEqual(["way/10", "way/11"]);
    expect(opening?.connectedWalls.map((wall) => wall.id)).toEqual(["way/12"]);
    expect(opening?.sources.map((source) => source.role)).toEqual(["door", "wall"]);
  });

  it("uses connected walls as the orientation context before falling back to rooms", () => {
    const graph = new OsmGraph(doorFixture);
    const door = IndoorDoor.collectFromGraph(graph)[0];
    const rooms = IndoorRoom.collectFromGraph(graph);
    const walls = IndoorWall.collectFromGraph(graph);

    const opening = door.toOpening(rooms, walls);

    expect(opening?.orientationGeometry.debug.previous).toEqual([1, -1]);
    expect(opening?.orientationGeometry.debug.after).toEqual([1, 1]);
  });

  it("can build a wall-backed opening without connected rooms", () => {
    const graph = new OsmGraph(wallOnlyDoorFixture);
    const door = IndoorDoor.collectFromGraph(graph)[0];

    const opening = door.toOpening([], IndoorWall.collectFromGraph(graph));

    expect(opening?.connectedRooms).toEqual([]);
    expect(opening?.connectedWalls.map((wall) => wall.id)).toEqual(["way/1"]);
    expect(opening?.widthMeters).toBe(1);
  });

  it("records diagnostics and ignores area walls when connecting doors", () => {
    const diagnostics = new IndoorDiagnostics();
    const graph = new OsmGraph(areaWallDoorFixture);
    const door = IndoorDoor.collectFromGraph(graph, diagnostics)[0];
    const walls = IndoorWall.collectFromGraph(graph, diagnostics);

    expect(door.getConnectedWalls(walls)).toEqual([]);
    expect(door.toOpening([], walls)).toBeUndefined();

    expect(diagnostics.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Cannot connect door node/20 to area wall way/20: area walls are renderable areas, not pass-through wall lines.",
      "Cannot build door node/20 at node/20: no connected room or wall was found.",
    ]);
  });
});

const doorFixture: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 1, tags: { door: "yes", level: "0", width: "2" } },
    { type: "node", id: 3, lat: 0, lon: 2 },
    { type: "node", id: 4, lat: 1, lon: 2 },
    { type: "node", id: 5, lat: 1, lon: 0 },
    { type: "node", id: 6, lat: -1, lon: 2 },
    { type: "node", id: 7, lat: -1, lon: 0 },
    { type: "node", id: 8, lat: -1, lon: 1 },
    { type: "node", id: 9, lat: 1, lon: 1 },
    {
      type: "way",
      id: 10,
      nodes: [1, 2, 3, 4, 5, 1],
      tags: { indoor: "room", level: "0", name: "Room A" },
    },
    {
      type: "way",
      id: 11,
      nodes: [1, 7, 6, 3, 2, 1],
      tags: { indoor: "corridor", level: "0" },
    },
    {
      type: "way",
      id: 12,
      nodes: [8, 2, 9],
      tags: { indoor: "wall", level: "0" },
    },
  ],
};

const wallOnlyDoorFixture: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: -1, lon: 1 },
    { type: "node", id: 2, lat: 0, lon: 1, tags: { door: "yes", level: "0" } },
    { type: "node", id: 3, lat: 1, lon: 1 },
    {
      type: "way",
      id: 1,
      nodes: [1, 2, 3],
      tags: { indoor: "wall", level: "0" },
    },
  ],
};

const areaWallDoorFixture: OverpassJson = {
  elements: [
    { type: "node", id: 20, lat: 0, lon: 0, tags: { door: "yes", level: "0" } },
    { type: "node", id: 21, lat: 0, lon: 1 },
    { type: "node", id: 22, lat: 1, lon: 1 },
    {
      type: "way",
      id: 20,
      nodes: [20, 21, 22, 20],
      tags: { indoor: "wall", area: "yes", level: "0" },
    },
  ],
};
