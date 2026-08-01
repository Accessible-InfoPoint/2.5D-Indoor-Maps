import levelService from "../../src/services/levelService";
import AccessibilityService from "../../src/services/accessibilityService";
import BackendService from "../../src/services/backendService";

jest.mock("../../src/services/accessibilityService");
jest.mock("../../src/services/backendService", () => ({
  getIndoorModel: jest.fn(),
  getAllLevels: jest.fn(),
  getLevelLabel: jest.fn((level: number) => level.toString()),
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
    (BackendService.getLevelLabel as jest.Mock).mockImplementation((level: number) =>
      level.toString(),
    );
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
    it("uses raw indoor model tags for level accessibility info", () => {
      (BackendService.getIndoorModel as jest.Mock).mockReturnValue({
        elements: {
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
          tactilePaving: [],
          stairPathways: [],
        },
      });
      (AccessibilityService.getForLevelTags as jest.Mock).mockReturnValue("raw accessibility");

      const result = levelService.getCurrentLevelDescription(1);

      expect(result).toBe("Level 1 raw accessibility");
      expect(AccessibilityService.getForLevelTags).toHaveBeenCalledWith(1, [
        { amenity: "toilets", level: "1" },
        { tactile_paving: "yes", level: "1" },
      ]);
    });
  });

  describe("clearData", () => {
    it("resets cached accessibility descriptions", () => {
      levelService.clearData();

      expect(AccessibilityService.reset).toHaveBeenCalled();
    });
  });
});
