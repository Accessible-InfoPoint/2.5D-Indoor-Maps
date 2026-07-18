/**
 * @jest-environment jsdom
 */
import { IndoorDoor } from "../../src/indoor/elements/IndoorDoor";
import { IndoorRoom } from "../../src/indoor/elements/IndoorRoom";
import { IndoorWall } from "../../src/indoor/elements/IndoorWall";
import { OverpassJson } from "../../src/models/overpassJson";
import { OsmGraph } from "../../src/overpass/OsmGraph";

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

  it("builds standalone render data without using DoorService", () => {
    const graph = new OsmGraph(doorFixture);
    const door = IndoorDoor.collectFromGraph(graph)[0];
    const rooms = IndoorRoom.collectFromGraph(graph);
    const walls = IndoorWall.collectFromGraph(graph);

    const renderItems = door.buildRenderItems(rooms, walls, []);

    expect(renderItems).toHaveLength(1);
    expect(renderItems[0].coordinates).toHaveLength(2);
    expect(renderItems[0].symbol.lineWidth).toBe(1 + 50 / 20);
    expect(renderItems[0].debug?.door).toEqual([1, 0]);
  });

  it("uses the selected room color when a connected room is selected", () => {
    const graph = new OsmGraph(doorFixture);
    const door = IndoorDoor.collectFromGraph(graph)[0];
    const rooms = IndoorRoom.collectFromGraph(graph);
    const walls = IndoorWall.collectFromGraph(graph);

    const renderItems = door.buildRenderItems(rooms, walls, ["way/10"]);

    expect(renderItems[0].symbol.lineColor).toBe("#662b09");
  });

  it("uses connected walls for line width before falling back to rooms", () => {
    const graph = new OsmGraph(doorFixture);
    const door = IndoorDoor.collectFromGraph(graph)[0];
    const rooms = IndoorRoom.collectFromGraph(graph);
    const walls = IndoorWall.collectFromGraph(graph);

    const renderItems = door.buildRenderItems(rooms, walls, []);

    expect(renderItems[0].symbol.lineWidth).toBe(1 + 50 / 20);
    expect(renderItems[0].debug?.previous).toEqual([1, -1]);
    expect(renderItems[0].debug?.after).toEqual([1, 1]);
  });

  it("can render a wall-backed door without connected rooms using white fallback color", () => {
    const graph = new OsmGraph(wallOnlyDoorFixture);
    const door = IndoorDoor.collectFromGraph(graph)[0];

    const renderItems = door.buildRenderItems([], IndoorWall.collectFromGraph(graph), []);

    expect(renderItems).toHaveLength(1);
    expect(renderItems[0].symbol.lineColor).toBe("#ffffff");
    expect(renderItems[0].symbol.lineWidth).toBe(1 + 50 / 20);
  });

  it("warns and ignores area walls when connecting doors", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const graph = new OsmGraph(areaWallDoorFixture);
    const door = IndoorDoor.collectFromGraph(graph)[0];
    const walls = IndoorWall.collectFromGraph(graph);

    expect(door.getConnectedWalls(walls)).toEqual([]);
    expect(door.buildRenderItems([], walls, [])).toEqual([]);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "[IndoorDoor] Cannot connect door node/20 to area wall way/20: area walls are renderable areas, not pass-through wall lines.",
    );

    warnSpy.mockRestore();
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
