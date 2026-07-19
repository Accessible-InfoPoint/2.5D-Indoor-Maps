/**
 * @jest-environment jsdom
 */
import { createIndoorModel } from "../../src/indoor/IndoorModel";
import { BuildingInterface } from "../../src/models/buildingInterface";
import { RawOverpassDataResponse } from "../../src/services/httpService";

describe("IndoorVerticalConnection", () => {
  it("classifies simple, open, and free-floating raw vertical connections", () => {
    const model = createIndoorModel(rawOverpassData, buildingInterface);

    expect(model.verticalConnections.map((connection) => connection.kind)).toEqual([
      "simple",
      "open",
      "freeFloating",
    ]);
    expect(model.verticalConnections.map((connection) => connection.footprint?.id)).toEqual([
      "way/10",
      "way/20",
      undefined,
    ]);
    expect(
      model.verticalConnections.map((connection) =>
        connection.pathComponents.flatMap((component) =>
          component.pathways.map((pathway) => pathway.id),
        ),
      ),
    ).toEqual([["way/100"], ["way/101"], ["way/102"]]);
  });

  it("groups repeated free-floating stair spans by shared landing instances", () => {
    const model = createIndoorModel(repeatedFreeFloatingOverpassData, buildingInterface);

    expect(model.verticalConnections.map((connection) => connection.kind)).toEqual([
      "freeFloating",
      "freeFloating",
    ]);
    expect(
      model.verticalConnections.map((connection) =>
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
  });
});

const buildingFeature: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: "Feature",
  id: "way/1",
  properties: { building: "university" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ],
  },
};

const buildingInterface: BuildingInterface = {
  boundingBox: [0, 0, 1, 1],
  feature: buildingFeature,
};

const rawOverpassData: RawOverpassDataResponse = {
  buildingInterface,
  buildings: {
    elements: [],
  },
  indoor: {
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
  },
};

const repeatedFreeFloatingOverpassData: RawOverpassDataResponse = {
  buildingInterface,
  buildings: {
    elements: [],
  },
  indoor: {
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
  },
};
