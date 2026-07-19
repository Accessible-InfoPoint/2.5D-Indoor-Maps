/**
 * @jest-environment jsdom
 */
import { createIndoorModel } from "../../src/indoor/IndoorModel";
import { BuildingInterface } from "../../src/models/buildingInterface";
import { UserGroupEnum } from "../../src/models/userGroupEnum";
import { RawOverpassDataResponse } from "../../src/services/httpService";
import { buildRawIndoorLevelRenderModel } from "../../src/components/indoorLevel/rawIndoorLevelRenderBuilder";

describe("buildRawIndoorLevelRenderModel", () => {
  it("renders raw way-backed rooms for the requested level", () => {
    const model = createIndoorModel(rawOverpassData, buildingInterface);

    const renderModel = buildRawIndoorLevelRenderModel({
      model,
      level: 0,
      selectedFeatureIds: [],
      infoPointLevel: 0,
      userProfile: UserGroupEnum.noImpairments,
    });

    expect(renderModel.outlineCoordinates).toBe(buildingFeature.geometry.coordinates[0]);
    expect(renderModel.rooms.map((room) => room.feature.id)).toEqual(["way/10"]);
    expect(renderModel.rooms[0].label).toBe("Room A");
    expect(renderModel.rooms[0].feature.properties).toEqual({
      indoor: "room",
      level: "0",
      name: "Room A",
    });
    expect(renderModel.doors).toHaveLength(1);
    expect(renderModel.doors[0].debug?.door).toEqual([13.1, 51]);
    expect(renderModel.walls.map((wall) => wall.feature.geometry.type)).toEqual([
      "LineString",
      "Polygon",
    ]);
    expect(renderModel.walls.map((wall) => wall.style.polygonFill)).toEqual(["#000000", "#000000"]);
    expect(renderModel.tactilePaving.map((item) => item.feature.id)).toEqual(["way/14"]);
    expect(renderModel.tactilePaving[0].feature.geometry.type).toBe("LineString");
    expect(renderModel.tactilePaving[0].style.lineDasharray).toEqual([2, 2]);
  });

  it("marks selected raw rooms using the same ids as GeoJSON compatibility rooms", () => {
    const model = createIndoorModel(rawOverpassData, buildingInterface);

    const renderModel = buildRawIndoorLevelRenderModel({
      model,
      level: 0,
      selectedFeatureIds: ["way/10"],
      infoPointLevel: 0,
      userProfile: UserGroupEnum.noImpairments,
    });

    expect(renderModel.rooms[0].isSelected).toBe(true);
    expect(renderModel.rooms[0].selectedPositionMarker?.label).toBe("0");
  });
});

const buildingFeature: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: "Feature",
  id: "way/1",
  properties: { building: "university", name: "APB" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [13, 51],
        [13.1, 51],
        [13.1, 51.1],
        [13, 51],
      ],
    ],
  },
};

const buildingInterface: BuildingInterface = {
  boundingBox: [13, 51, 13.1, 51.1],
  feature: buildingFeature,
};

const rawOverpassData: RawOverpassDataResponse = {
  buildingInterface,
  buildings: {
    elements: [],
  },
  indoor: {
    elements: [
      { type: "node", id: 1, lat: 51, lon: 13 },
      { type: "node", id: 2, lat: 51, lon: 13.1, tags: { door: "yes", level: "0" } },
      { type: "node", id: 3, lat: 51.1, lon: 13.1 },
      { type: "node", id: 4, lat: 51.1, lon: 13 },
      {
        type: "way",
        id: 10,
        nodes: [1, 2, 3, 1],
        tags: { indoor: "room", level: "0", name: "Room A" },
      },
      {
        type: "way",
        id: 11,
        nodes: [1, 2, 3, 1],
        tags: { indoor: "room", level: "1", name: "Room B" },
      },
      {
        type: "way",
        id: 12,
        nodes: [1, 2],
        tags: { indoor: "wall", level: "0" },
      },
      {
        type: "way",
        id: 13,
        nodes: [1, 2, 3, 4, 1],
        tags: { indoor: "wall", area: "yes", level: "0" },
      },
      {
        type: "way",
        id: 14,
        nodes: [1, 2, 3],
        tags: { indoor: "yes", tactile_paving: "yes", level: "0" },
      },
      {
        type: "way",
        id: 15,
        nodes: [1, 2, 3],
        tags: { tactile_paving: "yes", level: "1" },
      },
    ],
  },
};
