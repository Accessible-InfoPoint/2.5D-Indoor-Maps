/**
 * @jest-environment jsdom
 */
import FeatureService from "../../src/services/featureService";

describe("FeatureService accessibility markers", () => {
  it("does not create an accessibility marker for the level info point", () => {
    expect(
      FeatureService.getAccessibilityMarkerDataFromTags(
        { information: "tactile_map", level: "0" },
        [13, 51],
      ),
    ).toBeNull();
  });
});
