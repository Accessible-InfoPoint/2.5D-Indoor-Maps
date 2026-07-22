import levelService from "../../src/services/levelService";
import * as hasCurrentLevel from "../../src/utils/hasCurrentLevel";
import AccessibilityService from "../../src/services/accessibilityService";
import BackendService from "../../src/services/backendService";
import { IndoorDataPipelineEnum } from "../../src/models/indoorDataPipelineEnum";

jest.mock("../../src/services/buildingService");
jest.mock("../../src/utils/hasCurrentLevel");
jest.mock("../../src/services/accessibilityService");
jest.mock("../../src/services/backendService", () => ({
  getGeoJson: jest.fn(),
  getIndoorModel: jest.fn(),
  getAllLevels: jest.fn(),
  getLevelLabel: jest.fn((level: number) => level.toString()),
  getBackendConfig: jest.fn(() => ({
    indoorDataPipeline: "geoJsonCompatibility",
  })),
}));
jest.mock("../../src/services/languageService", () => ({
  lang: {
    currentLevel: "Level ",
  },
}));

describe("levelService", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    (BackendService.getBackendConfig as jest.Mock).mockReturnValue({
      indoorDataPipeline: IndoorDataPipelineEnum.geoJsonCompatibility,
    });
    (BackendService.getLevelLabel as jest.Mock).mockImplementation((level: number) =>
      level.toString(),
    );
    levelService.clearData();
  });

  describe("getLevelGeoJSON", () => {
    it("filters features by level and caches result", () => {
      const mockFeatures = [
        { id: 1, properties: { level: "1" } },
        { id: 2, properties: { level: "2" } },
      ];
      const mockGeoJSON = { type: "FeatureCollection", features: mockFeatures };

      (BackendService.getGeoJson as jest.Mock).mockReturnValue(mockGeoJSON);
      (hasCurrentLevel.hasLevel as jest.Mock).mockImplementation(
        (feat, level) => feat.properties.level === level.toString(),
      );

      const result = levelService.getLevelGeoJSON(1);
      expect(result.features).toEqual([{ id: 1, properties: { level: "1" } }]);

      // Should return cached version on next call
      const cached = levelService.getLevelGeoJSON(1);
      expect(BackendService.getGeoJson).toHaveBeenCalledTimes(1);
      expect(cached).toBe(result);
    });

    it("returns an empty feature collection for the raw indoor model pipeline", () => {
      (BackendService.getBackendConfig as jest.Mock).mockReturnValue({
        indoorDataPipeline: IndoorDataPipelineEnum.rawIndoorModel,
      });

      const result = levelService.getLevelGeoJSON(1);

      expect(result).toEqual({
        type: "FeatureCollection",
        features: [],
      });
      expect(BackendService.getGeoJson).not.toHaveBeenCalled();
    });
  });

  describe("getCurrentLevelGeoJSON", () => {
    it("returns data for current level", () => {
      const mockFeatures = [
        { id: 1, properties: { level: "1" } },
        { id: 2, properties: { level: "2" } },
      ];
      const mockGeoJSON = { type: "FeatureCollection", features: mockFeatures };

      (BackendService.getGeoJson as jest.Mock).mockReturnValue(mockGeoJSON);
      (hasCurrentLevel.hasLevel as jest.Mock).mockImplementation(
        (feat, level) => feat.properties.level === level.toString(),
      );

      const result = levelService.getCurrentLevelGeoJSON(1);
      expect(result.features.length).toBe(1);
      expect(result.features[0].properties!.level).toBe("1");
    });
  });

  describe("getLevelOptions", () => {
    it("uses level labels when available", () => {
      (BackendService.getAllLevels as jest.Mock).mockReturnValue([1, 0]);
      (BackendService.getLevelLabel as jest.Mock).mockImplementation((level: number) =>
        level == 0 ? "E" : level.toString(),
      );

      expect(levelService.getLevelOptions()).toEqual([
        { level: 1, label: "1" },
        { level: 0, label: "E" },
      ]);
    });
  });

  describe("getCurrentLevelDescription", () => {
    it("returns the current level description with accessibility info", () => {
      const mockFeatures = [{ id: 1, properties: { level: "1" } }];
      const mockGeoJSON = { type: "FeatureCollection", features: mockFeatures };

      (BackendService.getGeoJson as jest.Mock).mockReturnValue(mockGeoJSON);
      (hasCurrentLevel.hasLevel as jest.Mock).mockImplementation(
        (feat, level) => feat.properties.level === level.toString(),
      );
      (AccessibilityService.getForLevel as jest.Mock).mockReturnValue("is accessible");

      const result = levelService.getCurrentLevelDescription(1);
      expect(result).toBe("Level 1 is accessible");
      expect(AccessibilityService.getForLevel).toHaveBeenCalledWith(1, {
        type: "FeatureCollection",
        features: mockFeatures,
      });
      expect(AccessibilityService.getForLevelTags).not.toHaveBeenCalled();
    });

    it("uses raw indoor model tags instead of GeoJSON in the raw pipeline", () => {
      (BackendService.getBackendConfig as jest.Mock).mockReturnValue({
        indoorDataPipeline: IndoorDataPipelineEnum.rawIndoorModel,
      });
      (BackendService.getIndoorModel as jest.Mock).mockReturnValue({
        rooms: [
          { tags: { amenity: "toilets", level: "1" }, hasLevel: (level: number) => level == 1 },
          { tags: { amenity: "cafe", level: "2" }, hasLevel: (level: number) => level == 2 },
        ],
        pointFeatures: [
          {
            tags: { tactile_paving: "yes", level: "1" },
            hasLevel: (level: number) => level == 1,
          },
        ],
        infoPoints: [],
        tactilePaving: [],
        stairPathways: [],
      });
      (AccessibilityService.getForLevelTags as jest.Mock).mockReturnValue("raw accessibility");

      const result = levelService.getCurrentLevelDescription(1);

      expect(result).toBe("Level 1 raw accessibility");
      expect(AccessibilityService.getForLevelTags).toHaveBeenCalledWith(1, [
        { amenity: "toilets", level: "1" },
        { tactile_paving: "yes", level: "1" },
      ]);
      expect(AccessibilityService.getForLevel).not.toHaveBeenCalled();
      expect(BackendService.getGeoJson).not.toHaveBeenCalled();
    });
  });

  describe("clearData", () => {
    it("clears cached data and causes getLevelGeoJSON to reload", () => {
      const mockFeatures = [{ id: 1, properties: { level: "1" } }];
      const mockGeoJSON = { type: "FeatureCollection", features: mockFeatures };

      (BackendService.getGeoJson as jest.Mock).mockReturnValue(mockGeoJSON);
      (hasCurrentLevel.hasLevel as jest.Mock).mockImplementation(
        (feat, level) => feat.properties.level === level.toString(),
      );

      // Populate cache
      levelService.getLevelGeoJSON(1);
      levelService.clearData();

      // Should reload and call again
      levelService.getLevelGeoJSON(1);
      expect(BackendService.getGeoJson).toHaveBeenCalledTimes(2);
    });
  });
});
