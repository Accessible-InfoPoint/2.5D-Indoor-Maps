import { OverpassJson } from "../../src/models/overpassJson";
import { OsmGraph } from "../../src/overpass/OsmGraph";

describe("OsmGraph", () => {
  it("indexes nodes, ways, relations, and generic element keys", () => {
    const graph = new OsmGraph(fixtureOverpassJson);

    expect(graph.nodesById.get(1)?.tags?.door).toBe("yes");
    expect(graph.waysById.get(10)?.tags?.indoor).toBe("room");
    expect(graph.relationsById.get(100)?.tags?.type).toBe("multipolygon");
    expect(graph.getById("node/1")).toBe(graph.nodesById.get(1));
    expect(graph.getById("way", 10)).toBe(graph.waysById.get(10));
    expect(graph.getById("relation", "100")).toBe(graph.relationsById.get(100));
    expect(graph.getById("10")).toBeUndefined();
  });

  it("indexes reverse way and relation references", () => {
    const graph = new OsmGraph(fixtureOverpassJson);

    expect(graph.getWaysForNode(1).map((way) => way.id)).toEqual([10, 11]);
    expect(graph.waysByNodeId.get(2)?.map((way) => way.id)).toEqual([10]);
    expect(graph.getRelationsForMember("way/10").map((relation) => relation.id)).toEqual([100]);
    expect(
      graph
        .getRelationsForMember({ type: "way", ref: 11, role: "inner" })
        .map((relation) => relation.id),
    ).toEqual([100]);
    expect(
      graph.getRelationsForMember(graph.getRelation(100)!).map((relation) => relation.id),
    ).toEqual([200]);
  });

  it("resolves way nodes and reports missing way nodes", () => {
    const graph = new OsmGraph(fixtureOverpassJson);

    expect(graph.getWayNodes(10).map((node) => node.id)).toEqual([1, 2, 3, 1]);
    expect(graph.getMissingWayNodeIds(10)).toEqual([99]);
    expect(graph.getWayNodes("missing")).toEqual([]);
  });

  it("resolves relation members and reports missing relation members", () => {
    const graph = new OsmGraph(fixtureOverpassJson);

    expect(graph.getRelationMembers(100).map((element) => `${element.type}/${element.id}`)).toEqual(
      ["way/10", "way/11"],
    );
    expect(graph.getMissingRelationMembers(100)).toEqual([
      { type: "node", ref: 404, role: "label" },
    ]);
    expect(graph.getRelationMembers("missing")).toEqual([]);
  });
});

const fixtureOverpassJson: OverpassJson = {
  version: 0.6,
  generator: "test",
  elements: [
    {
      type: "node",
      id: 1,
      lat: 51,
      lon: 13,
      tags: { door: "yes" },
    },
    {
      type: "node",
      id: 2,
      lat: 51,
      lon: 13.1,
    },
    {
      type: "node",
      id: 3,
      lat: 51.1,
      lon: 13.1,
    },
    {
      type: "way",
      id: 10,
      nodes: [1, 2, 3, 99, 1],
      tags: { indoor: "room", level: "0" },
    },
    {
      type: "way",
      id: 11,
      nodes: [1, 3],
      tags: { indoor: "wall", level: "0" },
    },
    {
      type: "relation",
      id: 100,
      members: [
        { type: "way", ref: 10, role: "outer" },
        { type: "way", ref: 11, role: "inner" },
        { type: "node", ref: 404, role: "label" },
      ],
      tags: { type: "multipolygon", indoor: "room", level: "0" },
    },
    {
      type: "relation",
      id: 200,
      members: [{ type: "relation", ref: 100, role: "part" }],
      tags: { type: "site" },
    },
  ],
};
