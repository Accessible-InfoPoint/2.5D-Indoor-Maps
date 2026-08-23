/**
 * @jest-environment jsdom
 */
import { createIndoorModel } from "@indoortoolkit/indoor-osm-parser";
import { BuildingInterface } from "../../src/models/buildingInterface";
import { UserGroupEnum } from "../../src/models/userGroupEnum";
import { RawOverpassDataResponse } from "../../src/services/httpService";
import { buildIndoorLevelRenderModel } from "../../src/components/indoorLevel/indoorLevelRenderBuilder";

describe("buildIndoorLevelRenderModel", () => {
  it("renders raw way-backed rooms for the requested level", () => {
    const model = createIndoorModel(rawOverpassData.indoor);

    const renderModel = buildIndoorLevelRenderModel({
      model,
      buildingOutlineGeometry: buildingFeature.geometry,
      level: 0,
      selectedFeatureIds: [],
      infoPointLevel: 0,
      userProfile: UserGroupEnum.noImpairments,
    });

    expect(renderModel.outlineGeometry).toEqual(buildingFeature.geometry);
    expect(renderModel.infoPoint?.feature.id).toBe("node/5");
    expect(renderModel.infoPoint?.feature.geometry.type).toBe("Point");
    expect(renderModel.infoPoint?.levels).toEqual([0]);
    expect(renderModel.rooms.map((room) => room.feature.id)).toEqual(["way/10", "way/16"]);
    expect(renderModel.rooms[0].label).toBe("Room A");
    expect(renderModel.rooms[0].feature.properties).toEqual({
      indoor: "room",
      level: "0",
      name: "Room A",
    });
    expect(renderModel.openings).toHaveLength(1);
    expect(renderModel.openings[0].debug?.opening).toEqual([13.1, 51]);
    expect(renderModel.walls.map((wall) => wall.feature.geometry.type)).toEqual([
      "LineString",
      "Polygon",
      "LineString",
      "Polygon",
    ]);
    expect(renderModel.walls.map((wall) => wall.feature.id)).toEqual([
      "way/12",
      "way/13",
      "way/17",
      "node/8",
    ]);
    expect(renderModel.walls.map((wall) => wall.style.polygonFill)).toEqual([
      "#000000",
      "#000000",
      "#000000",
      "#000000",
    ]);
    expect(renderModel.walls[3].style.lineWidth).toBe(0);
    expect(renderModel.tactilePaving.map((item) => item.feature.id)).toEqual(["way/14"]);
    expect(renderModel.tactilePaving[0].feature.geometry.type).toBe("LineString");
    expect(renderModel.tactilePaving[0].style.lineDasharray).toEqual([2, 2]);
    expect(renderModel.accessibilityMarkers.map((marker) => marker.id)).toEqual([
      "way/16",
      "node/7",
    ]);
    expect(renderModel.accessibilityMarkers.map((marker) => marker.sourceFeature.id)).toEqual([
      "way/16",
      "node/7",
    ]);
  });

  it("marks selected raw rooms using stable raw element ids", () => {
    const model = createIndoorModel(rawOverpassData.indoor);

    const renderModel = buildIndoorLevelRenderModel({
      model,
      buildingOutlineGeometry: buildingFeature.geometry,
      level: 0,
      selectedFeatureIds: ["way/10"],
      infoPointLevel: 0,
      userProfile: UserGroupEnum.noImpairments,
    });

    expect(renderModel.rooms[0].isSelected).toBe(true);
    expect(renderModel.rooms[0].selectedPositionMarker?.label).toBe("0");
  });

  it("uses neutral fill semantics for ordinary 3D room visibility", () => {
    const model = createIndoorModel(roomTag3DVisibilityOverpassData.indoor);

    const renderModel = buildIndoorLevelRenderModel({
      model,
      buildingOutlineGeometry: buildingFeature.geometry,
      level: 0,
      selectedFeatureIds: [],
      infoPointLevel: 0,
      userProfile: UserGroupEnum.noImpairments,
    });

    expect(getRoomRenderItem(renderModel, "way/20").isVisibleIn3D).toBe(true);
    expect(getRoomRenderItem(renderModel, "way/21").isVisibleIn3D).toBe(false);
    expect(getRoomRenderItem(renderModel, "way/22").isVisibleIn3D).toBe(true);
    expect(getRoomRenderItem(renderModel, "way/23").isVisibleIn3D).toBe(true);
    expect(getRoomRenderItem(renderModel, "way/24").isVisibleIn3D).toBe(false);
  });

  it("uses indoor=level outlines for the raw 3D outline on matching levels", () => {
    const model = createIndoorModel(levelOutlineOverpassData.indoor);

    const level0 = buildIndoorLevelRenderModel({
      model,
      buildingOutlineGeometry: buildingFeature.geometry,
      level: 0,
      selectedFeatureIds: [],
      infoPointLevel: 0,
      userProfile: UserGroupEnum.noImpairments,
    });
    const level1 = buildIndoorLevelRenderModel({
      model,
      buildingOutlineGeometry: buildingFeature.geometry,
      level: 1,
      selectedFeatureIds: [],
      infoPointLevel: 0,
      userProfile: UserGroupEnum.noImpairments,
    });

    expect(level0.outlineGeometry).toEqual({
      type: "Polygon",
      coordinates: [
        [
          [13, 51],
          [13.05, 51],
          [13.05, 51.05],
          [13, 51],
        ],
        [
          [13.01, 51.01],
          [13.02, 51.01],
          [13.02, 51.02],
          [13.01, 51.01],
        ],
      ],
    });
    expect(level1.outlineGeometry).toEqual(buildingFeature.geometry);
  });
});

function getRoomRenderItem(
  renderModel: ReturnType<typeof buildIndoorLevelRenderModel>,
  id: string,
) {
  const room = renderModel.rooms.find((candidate) => candidate.feature.id == id);

  if (room === undefined) {
    throw new Error(`Expected room render item "${id}".`);
  }

  return room;
}

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
  id: "way/1",
  tags: {},
  boundingBox: [13, 51, 13.1, 51.1],
  outlineGeometry: buildingFeature.geometry,
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
        type: "node",
        id: 5,
        lat: 51.05,
        lon: 13.05,
        tags: { information: "tactile_map", level: "0" },
      },
      {
        type: "node",
        id: 6,
        lat: 51.06,
        lon: 13.06,
        tags: { information: "tactile_map", level: "1" },
      },
      {
        type: "node",
        id: 7,
        lat: 51.07,
        lon: 13.07,
        tags: { amenity: "toilets", level: "0" },
      },
      {
        type: "node",
        id: 8,
        lat: 51.08,
        lon: 13.08,
        tags: { indoor: "column", level: "0", diameter: "1" },
      },
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
        nodes: [1, 3, 4, 1],
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
      {
        type: "way",
        id: 16,
        nodes: [1, 4, 3, 1],
        tags: { indoor: "room", amenity: "toilets", level: "0", name: "Toilet" },
      },
      {
        type: "way",
        id: 17,
        nodes: [3, 4],
        tags: { barrier: "handrail", level: "0" },
      },
    ],
  },
};

const levelOutlineOverpassData: RawOverpassDataResponse = {
  buildingInterface,
  buildings: {
    elements: [],
  },
  indoor: {
    elements: [
      { type: "node", id: 1, lat: 51, lon: 13 },
      { type: "node", id: 2, lat: 51, lon: 13.05 },
      { type: "node", id: 3, lat: 51.05, lon: 13.05 },
      { type: "node", id: 4, lat: 51.01, lon: 13.01 },
      { type: "node", id: 5, lat: 51.01, lon: 13.02 },
      { type: "node", id: 6, lat: 51.02, lon: 13.02 },
      {
        type: "way",
        id: 10,
        nodes: [1, 2, 3, 1],
      },
      {
        type: "way",
        id: 12,
        nodes: [4, 5, 6, 4],
      },
      {
        type: "relation",
        id: 10,
        members: [
          { type: "way", ref: 10, role: "outer" },
          { type: "way", ref: 12, role: "inner" },
        ],
        tags: { indoor: "level", level: "0", "level:ref": "E", type: "multipolygon" },
      },
      {
        type: "way",
        id: 11,
        nodes: [1, 2, 3, 1],
        tags: { indoor: "room", level: "0" },
      },
    ],
  },
};

const roomTag3DVisibilityOverpassData: RawOverpassDataResponse = {
  buildingInterface,
  buildings: {
    elements: [],
  },
  indoor: {
    elements: [
      { type: "node", id: 20, lat: 51, lon: 13 },
      { type: "node", id: 21, lat: 51, lon: 13.01 },
      { type: "node", id: 22, lat: 51.01, lon: 13.01 },
      { type: "node", id: 23, lat: 51.01, lon: 13 },
      { type: "node", id: 24, lat: 51.02, lon: 13 },
      { type: "node", id: 25, lat: 51.02, lon: 13.01 },
      { type: "node", id: 26, lat: 51.03, lon: 13.01 },
      { type: "node", id: 27, lat: 51.03, lon: 13 },
      { type: "node", id: 28, lat: 51.04, lon: 13 },
      { type: "node", id: 29, lat: 51.04, lon: 13.01 },
      { type: "node", id: 30, lat: 51.05, lon: 13.01 },
      { type: "node", id: 31, lat: 51.05, lon: 13 },
      { type: "node", id: 32, lat: 51.06, lon: 13 },
      { type: "node", id: 33, lat: 51.06, lon: 13.01 },
      { type: "node", id: 34, lat: 51.07, lon: 13.01 },
      { type: "node", id: 35, lat: 51.07, lon: 13 },
      { type: "node", id: 36, lat: 51.08, lon: 13 },
      { type: "node", id: 37, lat: 51.08, lon: 13.01 },
      { type: "node", id: 38, lat: 51.09, lon: 13.01 },
      { type: "node", id: 39, lat: 51.09, lon: 13 },
      {
        type: "way",
        id: 20,
        nodes: [20, 21, 22, 20],
        tags: { indoor: "area", level: "0" },
      },
      {
        type: "way",
        id: 21,
        nodes: [24, 25, 26, 24],
        tags: { indoor: "area", room: "office", level: "0" },
      },
      {
        type: "way",
        id: 22,
        nodes: [28, 29, 30, 28],
        tags: { indoor: "room", room: "corridor", level: "0" },
      },
      {
        type: "way",
        id: 23,
        nodes: [32, 33, 34, 32],
        tags: { indoor: "room", room: "entrance", level: "0" },
      },
      {
        type: "way",
        id: 24,
        nodes: [36, 37, 38, 36],
        tags: { indoor: "room", level: "0" },
      },
    ],
  },
};
