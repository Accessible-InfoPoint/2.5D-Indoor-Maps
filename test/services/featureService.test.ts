/**
 * @jest-environment jsdom
 */
import { getCategoryIcon } from "../../src/services/featureService";
import { MARKERS_IMG_DIR, ICONS } from "../../public/strings/constants.json";

function feature(properties: Record<string, unknown>): GeoJSON.Feature {
  return {
    id: "way/1",
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [] },
    properties,
  };
}

describe("getCategoryIcon", () => {
  it("returns the wheelchair-accessible toilet icon for accessible toilets", () => {
    expect(getCategoryIcon(feature({ amenity: "toilets", wheelchair: "yes" })))
      .toBe(MARKERS_IMG_DIR + ICONS.TOILETS_WHEELCHAIR);
  });

  it("returns the toilet icon for non-accessible toilets", () => {
    expect(getCategoryIcon(feature({ amenity: "toilets" })))
      .toBe(MARKERS_IMG_DIR + ICONS.TOILETS);
  });

  it("returns the cafe icon for cafes", () => {
    expect(getCategoryIcon(feature({ amenity: "cafe" })))
      .toBe(MARKERS_IMG_DIR + ICONS.CAFE);
  });

  it("returns the shop icon for shops", () => {
    expect(getCategoryIcon(feature({ shop: "convenience" })))
      .toBe(MARKERS_IMG_DIR + ICONS.SHOP);
  });

  it("returns the elevator icon for elevators", () => {
    expect(getCategoryIcon(feature({ highway: "elevator" })))
      .toBe(MARKERS_IMG_DIR + ICONS.ELEVATOR);
  });

  it("returns the stairs icon for stairs", () => {
    expect(getCategoryIcon(feature({ stairs: "yes" })))
      .toBe(MARKERS_IMG_DIR + ICONS.STAIRS);
  });

  it("returns the entrance icon for entrances", () => {
    expect(getCategoryIcon(feature({ entrance: "main" })))
      .toBe(MARKERS_IMG_DIR + ICONS.ENTRANCE);
  });

  it("falls back to the generic icon for unrecognized rooms", () => {
    expect(getCategoryIcon(feature({ indoor: "room" })))
      .toBe(MARKERS_IMG_DIR + ICONS.ADDITIONAL);
  });
});
