import { IndoorLanding } from "../../src/indoor/elements/IndoorLanding";
import { IndoorStairPathway } from "../../src/indoor/elements/IndoorStairPathway";
import { IndoorStairPathNetwork } from "../../src/indoor/verticalConnections/IndoorStairPathNetwork";
import { OverpassJson } from "../../src/models/overpassJson";
import { OsmGraph } from "../../src/overpass/OsmGraph";

describe("IndoorStairPathNetwork", () => {
  it("groups pathways connected end to end by raw node ids", () => {
    const graph = new OsmGraph(pathNetworkFixture);
    const network = new IndoorStairPathNetwork(
      IndoorStairPathway.collectFromGraph(graph),
      IndoorLanding.collectFromGraph(graph),
    );

    expect(
      network.components.map((component) => component.pathways.map((path) => path.id)),
    ).toEqual([["way/10", "way/11"], ["way/12"]]);
  });

  it("uses landings as raw-node bridges between pathway ways", () => {
    const graph = new OsmGraph(landingBridgeFixture);
    const network = new IndoorStairPathNetwork(
      IndoorStairPathway.collectFromGraph(graph),
      IndoorLanding.collectFromGraph(graph),
    );

    expect(network.components).toHaveLength(1);
    expect(network.components[0].pathways.map((path) => path.id)).toEqual(["way/10", "way/11"]);
    expect(network.components[0].landings.map((landing) => landing.id)).toEqual(["way/20"]);
  });

  it("keeps touching pathways with different level spans in separate components", () => {
    const graph = new OsmGraph(levelAwareFixture);
    const network = new IndoorStairPathNetwork(
      IndoorStairPathway.collectFromGraph(graph),
      IndoorLanding.collectFromGraph(graph),
    );

    expect(
      network.components.map((component) => ({
        span: component.span,
        pathways: component.pathways.map((path) => path.id),
      })),
    ).toEqual([
      { span: { from: 0, to: 1 }, pathways: ["way/10"] },
      { span: { from: 1, to: 2 }, pathways: ["way/11"] },
    ]);
  });

  it("allows landings to join each compatible span component without bridging spans", () => {
    const graph = new OsmGraph(levelAwareLandingFixture);
    const network = new IndoorStairPathNetwork(
      IndoorStairPathway.collectFromGraph(graph),
      IndoorLanding.collectFromGraph(graph),
    );

    expect(
      network.components.map((component) => ({
        span: component.span,
        pathways: component.pathways.map((path) => path.id),
        landings: component.landings.map((landing) => landing.id),
      })),
    ).toEqual([
      { span: { from: 0, to: 1 }, pathways: ["way/10"], landings: ["way/20"] },
      { span: { from: 1, to: 2 }, pathways: ["way/11"], landings: ["way/20"] },
    ]);
  });

  it("bridges fractional stair spans through a landing at the shared boundary", () => {
    const graph = new OsmGraph(fractionalLandingFixture);
    const network = new IndoorStairPathNetwork(
      IndoorStairPathway.collectFromGraph(graph),
      IndoorLanding.collectFromGraph(graph),
    );

    expect(
      network.components.map((component) => ({
        span: component.span,
        pathways: component.pathways.map((path) => path.id),
        landings: component.landings.map((landing) => landing.id),
      })),
    ).toEqual([
      { span: { from: 0, to: 0.5 }, pathways: ["way/10"], landings: ["way/20"] },
      { span: { from: 0.5, to: 1 }, pathways: ["way/11"], landings: ["way/20"] },
    ]);
  });

  it("expands repeated pathway spans and landing levels by explicit repeat offsets", () => {
    const graph = new OsmGraph(repeatedFractionalLandingOffsetFixture);
    const network = new IndoorStairPathNetwork(
      IndoorStairPathway.collectFromGraph(graph),
      IndoorLanding.collectFromGraph(graph),
    );

    expect(
      network.components.map((component) => ({
        span: component.span,
        pathwayInstances: component.pathwayInstances.map((instance) => ({
          source: instance.source.id,
          repeatOffset: instance.repeatOffset,
        })),
        landingInstances: component.landingInstances.map((instance) => ({
          source: instance.source.id,
          level: instance.level,
          repeatOffset: instance.repeatOffset,
        })),
      })),
    ).toEqual([
      {
        span: { from: 0, to: 0.5 },
        pathwayInstances: [{ source: "way/10", repeatOffset: 0 }],
        landingInstances: [{ source: "way/20", level: 0.5, repeatOffset: 0 }],
      },
      {
        span: { from: 1, to: 1.5 },
        pathwayInstances: [{ source: "way/10", repeatOffset: 1 }],
        landingInstances: [{ source: "way/20", level: 1.5, repeatOffset: 1 }],
      },
      {
        span: { from: 2, to: 2.5 },
        pathwayInstances: [{ source: "way/10", repeatOffset: 2 }],
        landingInstances: [{ source: "way/20", level: 2.5, repeatOffset: 2 }],
      },
      {
        span: { from: 0.5, to: 1 },
        pathwayInstances: [{ source: "way/11", repeatOffset: 0 }],
        landingInstances: [{ source: "way/20", level: 0.5, repeatOffset: 0 }],
      },
      {
        span: { from: 1.5, to: 2 },
        pathwayInstances: [{ source: "way/11", repeatOffset: 1 }],
        landingInstances: [{ source: "way/20", level: 1.5, repeatOffset: 1 }],
      },
      {
        span: { from: 2.5, to: 3 },
        pathwayInstances: [{ source: "way/11", repeatOffset: 2 }],
        landingInstances: [{ source: "way/20", level: 2.5, repeatOffset: 2 }],
      },
    ]);
  });

  it("expands repeat_on as actual repeated start levels", () => {
    const graph = new OsmGraph(repeatedActualStartFixture);
    const network = new IndoorStairPathNetwork(
      IndoorStairPathway.collectFromGraph(graph),
      IndoorLanding.collectFromGraph(graph),
    );

    expect(
      network.components.map((component) => ({
        span: component.span,
        pathwayInstances: component.pathwayInstances.map((instance) => ({
          source: instance.source.id,
          repeatOffset: instance.repeatOffset,
        })),
      })),
    ).toEqual([
      {
        span: { from: 1, to: 2 },
        pathwayInstances: [{ source: "way/10", repeatOffset: 0 }],
      },
      {
        span: { from: 2, to: 3 },
        pathwayInstances: [{ source: "way/10", repeatOffset: 1 }],
      },
    ]);
  });
});

const pathNetworkFixture: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 1 },
    { type: "node", id: 3, lat: 0, lon: 2 },
    { type: "node", id: 4, lat: 1, lon: 0 },
    { type: "node", id: 5, lat: 1, lon: 1 },
    { type: "way", id: 10, nodes: [1, 2], tags: { indoor: "pathway", level: "0-1" } },
    { type: "way", id: 11, nodes: [2, 3], tags: { indoor: "pathway", level: "0-1" } },
    { type: "way", id: 12, nodes: [4, 5], tags: { indoor: "pathway", level: "0-1" } },
  ],
};

const landingBridgeFixture: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 1 },
    { type: "node", id: 3, lat: 1, lon: 1 },
    { type: "node", id: 4, lat: 1, lon: 0 },
    { type: "way", id: 10, nodes: [1, 2], tags: { indoor: "pathway", level: "0-1" } },
    { type: "way", id: 11, nodes: [3, 4], tags: { indoor: "pathway", level: "0-1" } },
    {
      type: "way",
      id: 20,
      nodes: [2, 3, 4, 1, 2],
      tags: { indoor: "area", landing: "yes", level: "1" },
    },
  ],
};

const levelAwareFixture: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 1 },
    { type: "node", id: 3, lat: 0, lon: 2 },
    { type: "way", id: 10, nodes: [1, 2], tags: { indoor: "pathway", level: "0-1" } },
    { type: "way", id: 11, nodes: [2, 3], tags: { indoor: "pathway", level: "1-2" } },
  ],
};

const levelAwareLandingFixture: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 1 },
    { type: "node", id: 3, lat: 1, lon: 1 },
    { type: "node", id: 4, lat: 1, lon: 0 },
    { type: "way", id: 10, nodes: [1, 2], tags: { indoor: "pathway", level: "0-1" } },
    { type: "way", id: 11, nodes: [3, 4], tags: { indoor: "pathway", level: "1-2" } },
    {
      type: "way",
      id: 20,
      nodes: [2, 3, 4, 1, 2],
      tags: { indoor: "area", landing: "yes", level: "1" },
    },
  ],
};

const fractionalLandingFixture: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 1 },
    { type: "node", id: 3, lat: 1, lon: 1 },
    { type: "node", id: 4, lat: 1, lon: 0 },
    { type: "way", id: 10, nodes: [1, 2], tags: { indoor: "pathway", level: "0-0.5" } },
    { type: "way", id: 11, nodes: [3, 4], tags: { indoor: "pathway", level: "0.5-1" } },
    {
      type: "way",
      id: 20,
      nodes: [2, 3, 4, 1, 2],
      tags: { indoor: "area", landing: "yes", level: "0.5" },
    },
  ],
};

const repeatedFractionalLandingOffsetFixture: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 1 },
    { type: "node", id: 3, lat: 1, lon: 1 },
    { type: "node", id: 4, lat: 1, lon: 0 },
    {
      type: "way",
      id: 10,
      nodes: [1, 2],
      tags: { indoor: "pathway", level: "0-0.5", repeat_on_offset: "1;2" },
    },
    {
      type: "way",
      id: 11,
      nodes: [3, 4],
      tags: { indoor: "pathway", level: "0.5-1", repeat_on_offset: "1;2" },
    },
    {
      type: "way",
      id: 20,
      nodes: [2, 3, 4, 1, 2],
      tags: { indoor: "area", landing: "yes", level: "0.5", repeat_on_offset: "1;2" },
    },
  ],
};

const repeatedActualStartFixture: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 1 },
    {
      type: "way",
      id: 10,
      nodes: [1, 2],
      tags: { indoor: "pathway", level: "1-2", repeat_on: "2" },
    },
  ],
};
