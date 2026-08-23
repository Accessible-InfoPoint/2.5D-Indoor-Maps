/**
 * @jest-environment jsdom
 */
import {
  getCategoryIconFromTags,
  getFeatureStyleFromTags,
  getIndoorFillStyleFromTags,
  getLineWidthFromTags,
  hasNeutralIndoorFillTags,
} from "../../src/services/featureService";
import { MARKERS_IMG_DIR, ICONS } from "../../public/strings/constants.json";
import { OPEN_AREA_WALL_WEIGHT } from "../../public/strings/settings.json";
import * as defaultColors from "../../public/strings/colorProfiles/default.json";

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

describe("getIndoorFillStyleFromTags", () => {
  it("renders ordinary rooms with the room fill color", () => {
    expect(getIndoorFillStyleFromTags({ indoor: "room" }).polygonFill).toBe(
      defaultColors.roomColor,
    );
  });

  it("renders indoor rooms tagged as entrances or corridors with the neutral fill color", () => {
    expect(getIndoorFillStyleFromTags({ indoor: "room", room: "entrance" }).polygonFill).toBe(
      "#fff",
    );
    expect(getIndoorFillStyleFromTags({ indoor: "room", room: "corridor" }).polygonFill).toBe(
      "#fff",
    );
  });

  it("renders indoor areas with room tags as rooms unless the room value is neutral", () => {
    expect(getIndoorFillStyleFromTags({ indoor: "area", room: "office" }).polygonFill).toBe(
      defaultColors.roomColor,
    );
    expect(getIndoorFillStyleFromTags({ indoor: "area", room: "entrance" }).polygonFill).toBe(
      "#fff",
    );
    expect(getIndoorFillStyleFromTags({ indoor: "area", room: "corridor" }).polygonFill).toBe(
      "#fff",
    );
  });
});

describe("hasNeutralIndoorFillTags", () => {
  it("matches the tags that use the neutral indoor fill", () => {
    expect(hasNeutralIndoorFillTags({ indoor: "area" })).toBe(true);
    expect(hasNeutralIndoorFillTags({ indoor: "corridor" })).toBe(true);
    expect(hasNeutralIndoorFillTags({ indoor: "room", room: "entrance" })).toBe(true);
    expect(hasNeutralIndoorFillTags({ indoor: "room", room: "corridor" })).toBe(true);
    expect(hasNeutralIndoorFillTags({ indoor: "area", room: "office" })).toBe(false);
    expect(hasNeutralIndoorFillTags({ indoor: "room" })).toBe(false);
    expect(hasNeutralIndoorFillTags({ indoor: "area", stairs: "yes" })).toBe(false);
    expect(hasNeutralIndoorFillTags({ indoor: "room", amenity: "toilets" })).toBe(false);
  });
});

describe("getLineWidthFromTags", () => {
  it("does not render implicit walls for corridors and open areas", () => {
    expect(getLineWidthFromTags({ indoor: "corridor" })).toBe(OPEN_AREA_WALL_WEIGHT);
    expect(getLineWidthFromTags({ indoor: "area" })).toBe(OPEN_AREA_WALL_WEIGHT);
  });

  it("keeps implicit walls for indoor rooms independent of room tag values", () => {
    expect(getLineWidthFromTags({ indoor: "room", room: "corridor" })).toBeGreaterThan(
      OPEN_AREA_WALL_WEIGHT,
    );
    expect(getLineWidthFromTags({ indoor: "room", room: "entrance" })).toBeGreaterThan(
      OPEN_AREA_WALL_WEIGHT,
    );
  });

  it("lets open staircase outlines be handled by the room render builder override", () => {
    expect(getLineWidthFromTags({ indoor: "area", stairs: "yes" })).toBeGreaterThan(
      OPEN_AREA_WALL_WEIGHT,
    );
  });

  it("uses the same corridor and area width through full feature styles", () => {
    expect(getFeatureStyleFromTags({ indoor: "corridor" }).lineWidth).toBe(OPEN_AREA_WALL_WEIGHT);
    expect(getFeatureStyleFromTags({ indoor: "area" }).lineWidth).toBe(OPEN_AREA_WALL_WEIGHT);
  });
});
