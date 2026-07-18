/**
 * @jest-environment jsdom
 */
import { IndoorDoor } from "../../src/indoor/elements/IndoorDoor";
import { IndoorRoom } from "../../src/indoor/elements/IndoorRoom";
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

    const renderItems = door.buildRenderItems(rooms, []);

    expect(renderItems).toHaveLength(1);
    expect(renderItems[0].coordinates).toHaveLength(2);
    expect(renderItems[0].symbol.lineWidth).toBe(1 + 50 / 20);
    expect(renderItems[0].debug?.door).toEqual([1, 0]);
  });

  it("uses the selected room color when a connected room is selected", () => {
    const graph = new OsmGraph(doorFixture);
    const door = IndoorDoor.collectFromGraph(graph)[0];
    const rooms = IndoorRoom.collectFromGraph(graph);

    const renderItems = door.buildRenderItems(rooms, ["way/10"]);

    expect(renderItems[0].symbol.lineColor).toBe("#662b09");
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
  ],
};
