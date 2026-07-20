/**
 * @jest-environment jsdom
 */
jest.mock("../../src/services/httpService", () => ({
  __esModule: true,
  default: {
    fetchRawOverpassData: jest.fn(),
  },
}));

jest.mock("../../src/services/buildingService", () => ({
  __esModule: true,
  default: {
    handleSearch: jest.fn(),
    filterInsideAndLevel: jest.fn(),
  },
}));

jest.mock("../../src/utils/overpassToGeoJson", () => ({
  overpassToGeoJson: jest.fn(),
}));

import BackendService from "../../src/services/backendService";
import BuildingService from "../../src/services/buildingService";
import HttpService, { RawOverpassDataResponse } from "../../src/services/httpService";
import { BackendSourceEnum } from "../../src/models/backendSourceEnum";
import { IndoorDataPipelineEnum } from "../../src/models/indoorDataPipelineEnum";
import { overpassToGeoJson } from "../../src/utils/overpassToGeoJson";
import { BuildingInterface } from "../../src/models/buildingInterface";

describe("BackendService client GeoJSON compatibility pipeline", () => {
  const originalStructuredClone = globalThis.structuredClone;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    globalThis.structuredClone ??= ((value: unknown) =>
      JSON.parse(JSON.stringify(value))) as typeof structuredClone;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    globalThis.structuredClone = originalStructuredClone;
  });

  it("fetches filtered raw Overpass data and converts it to the existing GeoJSON backend data", async () => {
    const rawOverpassData: RawOverpassDataResponse = {
      buildingInterface,
      buildings: { elements: [] },
      indoor: { elements: [] },
    };
    const indoorGeoJson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [bearingNode1, bearingNode2, roomFeature],
    };

    (HttpService.fetchRawOverpassData as jest.Mock).mockResolvedValue(rawOverpassData);
    (overpassToGeoJson as jest.Mock).mockResolvedValueOnce(indoorGeoJson);

    await BackendService.fetchBackendData({
      source: BackendSourceEnum.cachedOverpass,
      indoorDataPipeline: IndoorDataPipelineEnum.clientGeoJsonCompatibility,
      building: "apb",
    });

    expect(HttpService.fetchRawOverpassData).toHaveBeenCalledWith("apb");
    expect(overpassToGeoJson).toHaveBeenCalledWith(rawOverpassData.indoor);
    expect(overpassToGeoJson).toHaveBeenCalledTimes(1);
    expect(BuildingService.handleSearch).not.toHaveBeenCalled();
    expect(BackendService.getGeoJson()).toBe(indoorGeoJson);
    expect(BackendService.getRawOverpassData()).toBe(rawOverpassData);
  });

  it("builds the raw indoor model and graph indexes for the raw pipeline", async () => {
    const rawOverpassData: RawOverpassDataResponse = {
      buildingInterface,
      buildings: rawBuildingOverpass,
      indoor: rawIndoorOverpass,
    };

    (HttpService.fetchRawOverpassData as jest.Mock).mockResolvedValue(rawOverpassData);

    await BackendService.fetchBackendData({
      source: BackendSourceEnum.cachedOverpass,
      indoorDataPipeline: IndoorDataPipelineEnum.rawIndoorModel,
      building: "apb",
    });

    expect(HttpService.fetchRawOverpassData).toHaveBeenCalledWith("apb");
    expect(overpassToGeoJson).not.toHaveBeenCalled();
    expect(BuildingService.handleSearch).not.toHaveBeenCalled();
    expect(BackendService.getIndoorModel().levels).toEqual([1, 0]);
    expect(BackendService.getIndoorModel().levelLabels.get(0)).toBe("E");
    expect(BackendService.getLevelLabel(0)).toBe("E");
    expect(BackendService.getLevelLabel(1)).toBe("1");
    expect(BackendService.getRawOverpassGraphs().indoor.getNode("8109446525")?.lon).toBe(0);
    expect(
      BackendService.getRawOverpassGraphs()
        .indoor.getWaysForNode(3)
        .map((way) => way.id),
    ).toEqual([2]);
    expect(BackendService.getAllLevels()).toEqual([1, 0]);
    expect(BackendService.getOutline()).toEqual(buildingFeature.geometry.coordinates[0]);
    expect(() => BackendService.getGeoJson()).toThrow("Indoor GeoJSON has not been loaded.");
  });
});

const buildingFeature: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: "Feature",
  id: "way/1",
  properties: {
    building: "university",
    name: "APB",
  },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ],
  },
};

const buildingInterface: BuildingInterface = {
  boundingBox: [0, 0, 1, 1],
  feature: buildingFeature,
};

const bearingNode1: GeoJSON.Feature<GeoJSON.Point> = {
  type: "Feature",
  id: "node/8109446525",
  properties: {},
  geometry: {
    type: "Point",
    coordinates: [0, 0],
  },
};

const bearingNode2: GeoJSON.Feature<GeoJSON.Point> = {
  type: "Feature",
  id: "node/8109446619",
  properties: {},
  geometry: {
    type: "Point",
    coordinates: [1, 0],
  },
};

const roomFeature: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: "Feature",
  id: "way/2",
  properties: {
    indoor: "room",
    level: "0",
  },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [0.5, 0],
        [0.5, 0.5],
        [0, 0.5],
        [0, 0],
      ],
    ],
  },
};

const rawBuildingOverpass: RawOverpassDataResponse["buildings"] = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 1 },
    { type: "node", id: 3, lat: 1, lon: 1 },
    { type: "node", id: 4, lat: 1, lon: 0 },
    {
      type: "way",
      id: 1,
      nodes: [1, 2, 3, 4, 1],
      tags: {
        building: "university",
        name: "APB",
      },
    },
  ],
};

const rawIndoorOverpass: RawOverpassDataResponse["indoor"] = {
  elements: [
    {
      type: "node",
      id: 8109446525,
      lat: 0,
      lon: 0,
      tags: { level: "0" },
    },
    {
      type: "node",
      id: 8109446619,
      lat: 1,
      lon: 0,
      tags: { level: "99" },
    },
    {
      type: "node",
      id: 3,
      lat: 0.5,
      lon: 0.5,
    },
    {
      type: "way",
      id: 2,
      nodes: [3],
      tags: {
        indoor: "room",
        level: "0",
        repeat_on: "1",
      },
    },
    { type: "node", id: 4, lat: 0, lon: 0 },
    { type: "node", id: 5, lat: 0, lon: 0.5 },
    { type: "node", id: 6, lat: 0.5, lon: 0.5 },
    {
      type: "way",
      id: 4,
      nodes: [4, 5, 6, 4],
      tags: {
        indoor: "level",
        level: "0",
        "level:ref": "E",
      },
    },
  ],
};
