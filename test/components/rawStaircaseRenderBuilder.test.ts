/**
 * @jest-environment jsdom
 */
import { buildRawIndoorLevelRenderModel } from "../../src/components/indoorLevel/rawIndoorLevelRenderBuilder";
import { LEVEL_HEIGHT, STAIRCASE_HANDRAIL_HEIGHT } from "../../public/strings/settings.json";
import { createIndoorModel } from "../../src/indoor/IndoorModel";
import { BuildingInterface } from "../../src/models/buildingInterface";
import { UserGroupEnum } from "../../src/models/userGroupEnum";
import { RawOverpassDataResponse } from "../../src/services/httpService";

describe("raw staircase rendering", () => {
  it("builds 3D prism and edge cylinder render items for simple staircase footprints", () => {
    const model = createIndoorModel(simpleStaircaseData, buildingInterface);

    const level0 = buildRawIndoorLevelRenderModel({
      model,
      level: 0,
      selectedFeatureIds: [],
      infoPointLevel: 0,
      userProfile: UserGroupEnum.noImpairments,
    });
    const level1 = buildRawIndoorLevelRenderModel({
      model,
      level: 1,
      selectedFeatureIds: [],
      infoPointLevel: 0,
      userProfile: UserGroupEnum.noImpairments,
    });

    expect(level0.staircase.renderItems.map((item) => item.item.type)).toEqual([
      "prism",
      "cylinder",
      "cylinder",
      "cylinder",
    ]);
    expect(level1.staircase.renderItems).toEqual([]);
  });

  it("builds flat 2D surfaces and 3D span items for free-floating staircases", () => {
    const model = createIndoorModel(freeFloatingStaircaseData, buildingInterface);

    const renderModel = buildRawIndoorLevelRenderModel({
      model,
      level: 0,
      selectedFeatureIds: [],
      infoPointLevel: 0,
      userProfile: UserGroupEnum.noImpairments,
    });

    expect(renderModel.rooms.map((room) => room.feature.id)).toEqual([
      "free-floating-stair-path/way/100@0-0.5",
      "free-floating-stair-path/way/101@0.5-1",
      "free-floating-stair-landing/way/200@0.5/0",
    ]);
    expect(renderModel.rooms.every((room) => room.feature.geometry.type == "Polygon")).toBe(true);
    expect(renderModel.rooms.every((room) => room.isVisibleIn3D == false)).toBe(true);
    expect(renderModel.staircase.renderItems).toHaveLength(3);
    expect(getHandrailPrisms(renderModel.staircase.renderItems)).toHaveLength(0);
  });

  it("renders raw staircase pathway handrails only when explicit handrail tags are present", () => {
    const model = createIndoorModel(staircaseWithPathwayHandrailsData, buildingInterface);

    const renderModel = buildRawIndoorLevelRenderModel({
      model,
      level: 0,
      selectedFeatureIds: [],
      infoPointLevel: 0,
      userProfile: UserGroupEnum.noImpairments,
    });

    expect(getStaircaseFloorPrisms(renderModel.staircase.renderItems)).toHaveLength(1);
    expect(getHandrailPrisms(renderModel.staircase.renderItems)).toHaveLength(2);
  });

  it("orients raw footprint handrails in the upward direction", () => {
    const model = createIndoorModel(staircaseWithFootprintHandrailData, buildingInterface);

    const renderModel = buildRawIndoorLevelRenderModel({
      model,
      level: 0,
      selectedFeatureIds: [],
      infoPointLevel: 0,
      userProfile: UserGroupEnum.noImpairments,
    });

    const handrailPrisms = getHandrailPrisms(renderModel.staircase.renderItems);

    expect(handrailPrisms).toHaveLength(1);
    expect(getAverageLongitude(handrailPrisms[0].coordinates)).toBeLessThan(0);
  });

  it("renders explicit landing handrail ways in 3D", () => {
    const model = createIndoorModel(staircaseWithLandingHandrailData, buildingInterface);

    const renderModel = buildRawIndoorLevelRenderModel({
      model,
      level: 0,
      selectedFeatureIds: [],
      infoPointLevel: 0,
      userProfile: UserGroupEnum.noImpairments,
    });

    expect(renderModel.walls.map((wall) => wall.feature.id)).toEqual([]);
    expect(getStaircaseFloorPrisms(renderModel.staircase.renderItems)).toHaveLength(3);
    expect(getHandrailPrisms(renderModel.staircase.renderItems)).toHaveLength(1);
  });

  it("uses node levels for raw staircase path altitudes and interpolates missing node levels", () => {
    const model = createIndoorModel(staircaseWithNodeLevelsData, buildingInterface);

    const renderModel = buildRawIndoorLevelRenderModel({
      model,
      level: 1,
      selectedFeatureIds: [],
      infoPointLevel: 0,
      userProfile: UserGroupEnum.noImpairments,
    });

    const floorPrisms = renderModel.staircase.renderItems
      .map(({ item }) => item)
      .filter((item) => item.type == "prism" && item.height == 0.05);

    expect(floorPrisms).toHaveLength(3);

    if (
      floorPrisms[0].type != "prism" ||
      floorPrisms[1].type != "prism" ||
      floorPrisms[2].type != "prism"
    ) {
      throw new Error("Expected staircase floor items to be prisms.");
    }

    expect(floorPrisms[0].coordinates[0][2]).toBeCloseTo(0.5 * LEVEL_HEIGHT);
    expect(floorPrisms[0].coordinates[1][2]).toBeCloseTo(0.75 * LEVEL_HEIGHT);
    expect(floorPrisms[1].coordinates[1][2]).toBeCloseTo(0.875 * LEVEL_HEIGHT);
    expect(floorPrisms[2].coordinates[1][2]).toBeCloseTo(1 * LEVEL_HEIGHT);
  });

  it("treats repeated closed staircase path endpoints as the top of the vertical span", () => {
    const model = createIndoorModel(closedRepeatedStaircaseData, buildingInterface);

    const level1 = buildRawIndoorLevelRenderModel({
      model,
      level: 1,
      selectedFeatureIds: [],
      infoPointLevel: 0,
      userProfile: UserGroupEnum.noImpairments,
    });
    const level2 = buildRawIndoorLevelRenderModel({
      model,
      level: 2,
      selectedFeatureIds: [],
      infoPointLevel: 0,
      userProfile: UserGroupEnum.noImpairments,
    });

    const level1FloorPrisms = getStaircaseFloorPrisms(level1.staircase.renderItems);
    const level2FloorPrisms = getStaircaseFloorPrisms(level2.staircase.renderItems);

    expect(level1FloorPrisms).toHaveLength(4);
    expect(level2FloorPrisms).toHaveLength(4);

    expect(level1FloorPrisms[0].coordinates[0][2]).toBeCloseTo(0);
    expect(level1FloorPrisms[0].coordinates[1][2]).toBeCloseTo(0);
    expect(level1FloorPrisms[3].coordinates[0][2]).toBeCloseTo(LEVEL_HEIGHT);
    expect(level1FloorPrisms[3].coordinates[1][2]).toBeCloseTo(LEVEL_HEIGHT);

    expect(level2FloorPrisms[0].coordinates[0][2]).toBeCloseTo(0);
    expect(level2FloorPrisms[0].coordinates[1][2]).toBeCloseTo(0);
    expect(level2FloorPrisms[3].coordinates[0][2]).toBeCloseTo(LEVEL_HEIGHT);
    expect(level2FloorPrisms[3].coordinates[1][2]).toBeCloseTo(LEVEL_HEIGHT);
  });
});

type RawStaircaseRenderItems = ReturnType<
  typeof buildRawIndoorLevelRenderModel
>["staircase"]["renderItems"];

function getStaircaseFloorPrisms(renderItems: RawStaircaseRenderItems) {
  return renderItems
    .map(({ item }) => item)
    .filter((item) => item.type == "prism" && item.height == 0.05)
    .map((item) => {
      if (item.type != "prism") {
        throw new Error("Expected staircase floor item to be a prism.");
      }

      return item;
    });
}

function getHandrailPrisms(renderItems: RawStaircaseRenderItems) {
  return renderItems
    .map(({ item }) => item)
    .filter((item) => item.type == "prism" && item.height == STAIRCASE_HANDRAIL_HEIGHT)
    .map((item) => {
      if (item.type != "prism") {
        throw new Error("Expected staircase handrail item to be a prism.");
      }

      return item;
    });
}

function getAverageLongitude(coordinates: GeoJSON.Position[]): number {
  return coordinates.reduce((sum, coordinate) => sum + coordinate[0], 0) / coordinates.length;
}

const buildingFeature: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: "Feature",
  id: "way/1",
  properties: { building: "university" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 0],
      ],
    ],
  },
};

const buildingInterface: BuildingInterface = {
  boundingBox: [0, 0, 2, 2],
  feature: buildingFeature,
};

const simpleStaircaseData: RawOverpassDataResponse = {
  buildingInterface,
  buildings: { elements: [] },
  indoor: {
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
    ],
  },
};

const freeFloatingStaircaseData: RawOverpassDataResponse = {
  buildingInterface,
  buildings: { elements: [] },
  indoor: {
    elements: [
      { type: "node", id: 1, lat: 0, lon: 0 },
      { type: "node", id: 2, lat: 0, lon: 1 },
      { type: "node", id: 3, lat: 1, lon: 1 },
      { type: "node", id: 4, lat: 1, lon: 0 },
      { type: "way", id: 100, nodes: [1, 2], tags: { indoor: "pathway", level: "0-0.5" } },
      { type: "way", id: 101, nodes: [3, 4], tags: { indoor: "pathway", level: "0.5-1" } },
      {
        type: "way",
        id: 200,
        nodes: [2, 3, 4, 1, 2],
        tags: { indoor: "area", landing: "yes", level: "0.5" },
      },
    ],
  },
};

const staircaseWithNodeLevelsData: RawOverpassDataResponse = {
  buildingInterface,
  buildings: { elements: [] },
  indoor: {
    elements: [
      { type: "node", id: 1, lat: 0, lon: 0, tags: { level: "1.5" } },
      { type: "node", id: 2, lat: 0, lon: 0.5, tags: { level: "1.75" } },
      { type: "node", id: 3, lat: 0, lon: 1 },
      { type: "node", id: 4, lat: 0, lon: 1.5, tags: { level: "2" } },
      {
        type: "way",
        id: 100,
        nodes: [1, 2, 3, 4],
        tags: { indoor: "pathway", level: "1.5-2" },
      },
    ],
  },
};

const staircaseWithPathwayHandrailsData: RawOverpassDataResponse = {
  buildingInterface,
  buildings: { elements: [] },
  indoor: {
    elements: [
      { type: "node", id: 1, lat: 0, lon: 0 },
      { type: "node", id: 2, lat: 0.5, lon: 0 },
      {
        type: "way",
        id: 100,
        nodes: [1, 2],
        tags: {
          indoor: "pathway",
          level: "0-1",
          handrail: "yes",
          "handrail:right": "no",
          "handrail:middle": "yes",
        },
      },
    ],
  },
};

const staircaseWithFootprintHandrailData: RawOverpassDataResponse = {
  buildingInterface,
  buildings: { elements: [] },
  indoor: {
    elements: [
      { type: "node", id: 1, lat: 0, lon: -0.25, tags: { level: "0" } },
      { type: "node", id: 2, lat: 0, lon: 0.25 },
      { type: "node", id: 3, lat: 1, lon: 0.25 },
      { type: "node", id: 4, lat: 1, lon: -0.25, tags: { level: "1" } },
      {
        type: "way",
        id: 10,
        nodes: [1, 2, 3, 4, 1],
        tags: { indoor: "area", stairs: "yes", level: "0;1", "handrail:left": "yes" },
      },
      {
        type: "way",
        id: 100,
        nodes: [4, 1],
        tags: { indoor: "pathway", level: "0-1" },
      },
    ],
  },
};

const staircaseWithLandingHandrailData: RawOverpassDataResponse = {
  buildingInterface,
  buildings: { elements: [] },
  indoor: {
    elements: [
      { type: "node", id: 1, lat: 0, lon: 0 },
      { type: "node", id: 2, lat: 0, lon: 1 },
      { type: "node", id: 3, lat: 1, lon: 1 },
      { type: "node", id: 4, lat: 1, lon: 0 },
      { type: "way", id: 100, nodes: [1, 2], tags: { indoor: "pathway", level: "0-0.5" } },
      { type: "way", id: 101, nodes: [3, 4], tags: { indoor: "pathway", level: "0.5-1" } },
      {
        type: "way",
        id: 200,
        nodes: [2, 3, 4, 1, 2],
        tags: { indoor: "area", landing: "yes", level: "0.5" },
      },
      {
        type: "way",
        id: 300,
        nodes: [2, 3],
        tags: { barrier: "handrail", level: "0.5" },
      },
    ],
  },
};

const closedRepeatedStaircaseData: RawOverpassDataResponse = {
  buildingInterface,
  buildings: { elements: [] },
  indoor: {
    elements: [
      { type: "node", id: 1, lat: 0, lon: 0, tags: { level: "1" } },
      { type: "node", id: 2, lat: 0, lon: 0.5, tags: { level: "1" } },
      { type: "node", id: 3, lat: 0.5, lon: 1 },
      { type: "node", id: 4, lat: 1, lon: 0.5, tags: { level: "2" } },
      {
        type: "way",
        id: 100,
        nodes: [1, 2, 3, 4, 1],
        tags: { indoor: "pathway", level: "1-2", repeat_on: "2" },
      },
    ],
  },
};
