import { LEVEL_HEIGHT, STAIRCASE_HANDRAIL_HEIGHT } from "../../public/strings/settings.json";
import {
  buildSimpleStaircaseRenderItems,
  buildStaircasePathRenderItems,
} from "../../src/components/staircase/staircaseRenderBuilder";

describe("staircaseRenderBuilder", () => {
  it("builds framework-neutral render items for simple staircases", () => {
    const coordinates: GeoJSON.Position[] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ];

    const items = buildSimpleStaircaseRenderItems(coordinates, 12);

    expect(items[0]).toEqual({
      type: "prism",
      coordinates: coordinates.map((position) => [position[0], position[1], 0]),
      height: LEVEL_HEIGHT,
      altitude: 12,
      materialRole: "main",
    });
    expect(items.slice(1)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "cylinder",
          height: LEVEL_HEIGHT,
          altitude: 12,
          radius: 0.02,
          radialSegments: 10,
          materialRole: "outline",
        }),
      ]),
    );
  });

  it("builds floor and handrail prism items for stair paths", () => {
    const lineString: GeoJSON.Position[] = [
      [13.0, 51.0],
      [13.0, 51.0001],
    ];

    const items = buildStaircasePathRenderItems(lineString, 1, [0, LEVEL_HEIGHT - 0.05], 6);

    expect(items).toHaveLength(3);
    expect(items.map((item) => item.type)).toEqual(["prism", "prism", "prism"]);
    expect(items.map((item) => item.height)).toEqual([
      0.05,
      STAIRCASE_HANDRAIL_HEIGHT,
      STAIRCASE_HANDRAIL_HEIGHT,
    ]);
    expect(items.every((item) => item.altitude == 6)).toBe(true);
    expect(items.every((item) => item.materialRole == "main")).toBe(true);

    const floor = items[0];
    if (floor.type != "prism") {
      throw new Error("Expected floor item to be a prism.");
    }

    expect(floor.coordinates).toHaveLength(5);
    expect(floor.coordinates[0][2]).toBeCloseTo(0);
    expect(floor.coordinates[1][2]).toBeCloseTo(LEVEL_HEIGHT - 0.05);
  });

  it("respects explicit handrail options", () => {
    const lineString: GeoJSON.Position[] = [
      [13.0, 51.0],
      [13.0, 51.0001],
    ];

    const items = buildStaircasePathRenderItems(lineString, 1, [0, 1], 0, {
      left: false,
      right: false,
      middle: true,
    });

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.height)).toEqual([0.05, STAIRCASE_HANDRAIL_HEIGHT]);
  });
});
