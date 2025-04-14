jest.mock("maptalks", () => {});

import levelService from '../../src/services/levelService';
import BuildingService from '../../src/services/buildingService';
import * as hasCurrentLevel from '../../src/utils/hasCurrentLevel';
import AccessibilityService from '../../src/services/accessibilityService';
import BackendService from '../../src/services/backendService';
import { geoMap } from '../../src/main';

jest.mock('../../src/services/buildingService');
jest.mock('../../src/utils/hasCurrentLevel');
jest.mock('../../src/services/accessibilityService');
jest.mock('../../src/services/backendService');
jest.mock('../../src/main', () => ({
  geoMap: {
    getCurrentLevel: jest.fn(),
  },
}));
jest.mock('../../src/services/languageService', () => ({
  lang: {
    currentLevel: 'Level ',
  },
}));

describe('levelService', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('getLevelGeoJSON', () => {
    it('filters features by level and caches result', () => {
      const mockFeatures = [
        { id: 1, properties: { level: '1' } },
        { id: 2, properties: { level: '2' } },
      ];
      const mockGeoJSON = { type: 'FeatureCollection', features: mockFeatures };

      (BuildingService.getBuildingGeoJSON as jest.Mock).mockReturnValue(mockGeoJSON);
      (hasCurrentLevel.hasLevel as jest.Mock).mockImplementation(
        (feat, level) => feat.properties.level === level
      );

      const result = levelService.getLevelGeoJSON('1');
      expect(result.features).toEqual([
        { id: 1, properties: { level: '1' } },
      ]);

      // Should return cached version on next call
      const cached = levelService.getLevelGeoJSON('1');
      expect(BuildingService.getBuildingGeoJSON).toHaveBeenCalledTimes(1);
      expect(cached).toBe(result);
    });
  });

  describe('getCurrentLevelGeoJSON', () => {
    it('returns data for current level', () => {
      const mockFeatures = [
        { id: 1, properties: { level: '1' } },
        { id: 2, properties: { level: '2' } },
      ];
      const mockGeoJSON = { type: 'FeatureCollection', features: mockFeatures };

      (geoMap.getCurrentLevel as jest.Mock).mockReturnValue('1');
      (BuildingService.getBuildingGeoJSON as jest.Mock).mockReturnValue(mockGeoJSON);
      (hasCurrentLevel.hasLevel as jest.Mock).mockImplementation(
        (feat, level) => feat.properties.level === level
      );

      const result = levelService.getCurrentLevelGeoJSON();
      expect(result.features.length).toBe(1);
      expect(result.features[0].properties!.level).toBe('1');
    });
  });

  describe('getLevelNames', () => {
    it('returns levels as strings', () => {
      (BackendService.getAllLevels as jest.Mock).mockReturnValue([3, 2, 1]);
      const result = levelService.getLevelNames();
      expect(result).toEqual(['3', '2', '1']);
    });
  });

  describe('getCurrentLevelDescription', () => {
    it('returns the current level description with accessibility info', () => {
      const mockFeatures = [
        { id: 1, properties: { level: '1' } },
      ];
      const mockGeoJSON = { type: 'FeatureCollection', features: mockFeatures };

      (geoMap.getCurrentLevel as jest.Mock).mockReturnValue('1');
      (BuildingService.getBuildingGeoJSON as jest.Mock).mockReturnValue(mockGeoJSON);
      (hasCurrentLevel.hasLevel as jest.Mock).mockImplementation(
        (feat, level) => feat.properties.level === level
      );
      (AccessibilityService.getForLevel as jest.Mock).mockReturnValue('is accessible');

      const result = levelService.getCurrentLevelDescription();
      expect(result).toBe('Level 1 is accessible');
    });
  });

  describe('clearData', () => {
    it('clears cached data and causes getLevelGeoJSON to reload', () => {
      const mockFeatures = [
        { id: 1, properties: { level: '1' } },
      ];
      const mockGeoJSON = { type: 'FeatureCollection', features: mockFeatures };

      (BuildingService.getBuildingGeoJSON as jest.Mock).mockReturnValue(mockGeoJSON);
      (hasCurrentLevel.hasLevel as jest.Mock).mockImplementation(
        (feat, level) => feat.properties.level === level
      );

      // Populate cache
      levelService.getLevelGeoJSON('1');
      levelService.clearData();

      // Should reload and call again
      levelService.getLevelGeoJSON('1');
      expect(BuildingService.getBuildingGeoJSON).toHaveBeenCalledTimes(2);
    });
  });
});