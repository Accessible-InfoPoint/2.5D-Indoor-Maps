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
      buildings: { elements: [] },
      indoor: { elements: [] },
    };
    const buildingGeoJson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [buildingFeature],
    };
    const indoorGeoJson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [bearingNode1, bearingNode2, roomFeature],
    };

    (HttpService.fetchRawOverpassData as jest.Mock).mockResolvedValue(rawOverpassData);
    (overpassToGeoJson as jest.Mock)
      .mockResolvedValueOnce(buildingGeoJson)
      .mockResolvedValueOnce(indoorGeoJson);
    (BuildingService.handleSearch as jest.Mock).mockResolvedValue(buildingInterface);

    await BackendService.fetchBackendData({
      source: BackendSourceEnum.cachedOverpass,
      indoorDataPipeline: IndoorDataPipelineEnum.clientGeoJsonCompatibility,
      building: "apb",
    });

    expect(HttpService.fetchRawOverpassData).toHaveBeenCalledWith("apb");
    expect(overpassToGeoJson).toHaveBeenCalledWith(rawOverpassData.buildings);
    expect(overpassToGeoJson).toHaveBeenCalledWith(rawOverpassData.indoor);
    expect(BuildingService.handleSearch).toHaveBeenCalledWith(buildingGeoJson, "APB");
    expect(BackendService.getGeoJson()).toBe(indoorGeoJson);
    expect(BackendService.getRawOverpassData()).toBe(rawOverpassData);
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
