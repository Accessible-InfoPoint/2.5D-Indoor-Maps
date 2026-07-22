/**
 * @jest-environment jsdom
 */
import { getCategoryIconFromTags } from "../../src/services/featureService";
import { MARKERS_IMG_DIR, ICONS } from "../../public/strings/constants.json";

describe("getCategoryIconFromTags", () => {
  it("returns the wheelchair-accessible toilet icon for accessible toilets", () => {
    expect(getCategoryIconFromTags({ amenity: "toilets", wheelchair: "yes" })).toBe(
      MARKERS_IMG_DIR + ICONS.TOILETS_WHEELCHAIR,
    );
  });

  it("returns the toilet icon for non-accessible toilets", () => {
    expect(getCategoryIconFromTags({ amenity: "toilets" })).toBe(MARKERS_IMG_DIR + ICONS.TOILETS);
  });

  it("returns the cafe icon for cafes", () => {
    expect(getCategoryIconFromTags({ amenity: "cafe" })).toBe(MARKERS_IMG_DIR + ICONS.CAFE);
  });

  it("returns the shop icon for shops", () => {
    expect(getCategoryIconFromTags({ shop: "convenience" })).toBe(MARKERS_IMG_DIR + ICONS.SHOP);
  });

  it("returns the elevator icon for elevators", () => {
    expect(getCategoryIconFromTags({ highway: "elevator" })).toBe(MARKERS_IMG_DIR + ICONS.ELEVATOR);
  });

  it("returns the stairs icon for stairs", () => {
    expect(getCategoryIconFromTags({ stairs: "yes" })).toBe(MARKERS_IMG_DIR + ICONS.STAIRS);
  });

  it("returns the entrance icon for entrances", () => {
    expect(getCategoryIconFromTags({ entrance: "main" })).toBe(MARKERS_IMG_DIR + ICONS.ENTRANCE);
  });

  it("returns no icon for unrecognized rooms", () => {
    expect(getCategoryIconFromTags({ indoor: "room" })).toBeUndefined();
  });
});
