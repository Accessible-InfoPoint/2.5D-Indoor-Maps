import { LEVEL_HEIGHT, STAIRCASE_HANDRAIL_HEIGHT } from "../../public/strings/settings.json";
import {
  buildComplexStaircaseRenderItems,
  buildSimpleStaircaseRenderItems,
  filterConnectedPathways,
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

  it("builds floor and handrail prism items for complex staircases", () => {
    const lineString: GeoJSON.Position[] = [
      [13.0, 51.0],
      [13.0, 51.0001],
    ];
    const allNodes: GeoJSON.Feature[] = [
      createPointFeature(lineString[0], "0"),
      createPointFeature(lineString[1], "1"),
    ];

    const items = buildComplexStaircaseRenderItems([[lineString, 1]], allNodes, 6);

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

  it("filters connected staircase pathways and preserves pathway width", () => {
    const staircase = createPolygonFeature([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ]);
    const path = createLineStringFeature(
      [
        [0, 0],
        [0.5, 0.5],
      ],
      {
        level: [0, 1],
        width: "1.5",
      },
    );
    const lowestPoint = createPointFeature([0.5, 0.5], "0");

    const paths = filterConnectedPathways(staircase, [[0, 0]], [lowestPoint], [path], 0);

    expect(paths).toEqual([
      [
        [
          [0, 0],
          [0.5, 0.5],
        ],
        1.5,
      ],
    ]);
  });

  it("skips unsupported staircase feature geometries instead of throwing", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const paths = filterConnectedPathways(createPointFeature([0, 0], "0"), [], [], [], 0);

    expect(paths).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      'Skipping staircase pathway with unsupported geometry type "Point".',
      expect.objectContaining({
        geometry: expect.objectContaining({ type: "Point" }),
      }),
    );

    consoleError.mockRestore();
  });

  it("skips unsupported connected pathway geometries instead of throwing", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const staircase = createPolygonFeature([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ]);

    const paths = filterConnectedPathways(
      staircase,
      [[0, 0]],
      [],
      [createPointFeature([0, 0], "0")],
      0,
    );

    expect(paths).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      'Skipping staircase pathway with unsupported geometry type "Point".',
      expect.objectContaining({
        geometry: expect.objectContaining({ type: "Point" }),
      }),
    );

    consoleError.mockRestore();
  });
});

function createPointFeature(coordinates: GeoJSON.Position, level: string): GeoJSON.Feature {
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates,
    },
    properties: {
      level,
    },
  };
}

function createLineStringFeature(
  coordinates: GeoJSON.Position[],
  properties: GeoJSON.GeoJsonProperties,
): GeoJSON.Feature {
  return {
    type: "Feature",
    id: "way/1",
    geometry: {
      type: "LineString",
      coordinates,
    },
    properties,
  };
}

function createPolygonFeature(coordinates: GeoJSON.Position[]): GeoJSON.Feature {
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
    properties: {},
  };
}
