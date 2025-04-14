import { Vector2 } from "three";
import coordHelpers, { offsetLine } from "../../src/utils/coordinateHelpers";

describe("getDistanceBetweenCoordinatesInM", () => {
  it("returns ~343500m between Paris and London", () => {
    const paris = [2.3522, 48.8566]; // lon, lat
    const london = [-0.1276, 51.5074];
    const distance = coordHelpers.getDistanceBetweenCoordinatesInM(paris, london);
    expect(distance).toBeCloseTo(343500, -2); // within 0.1km
  });

  it("returns 0 for identical coordinates", () => {
    const point = [13.4050, 52.5200];
    expect(coordHelpers.getDistanceBetweenCoordinatesInM(point, point)).toBeCloseTo(0);
  });
});

describe("lat2y and y2lat", () => {
  it("should round-trip lat -> y -> lat", () => {
    const lat = 45;
    const y = coordHelpers.lat2y(lat);
    const resultLat = coordHelpers.y2lat(y);
    expect(resultLat).toBeCloseTo(lat, 4);
  });

  it("should match known Mercator conversion for equator", () => {
    expect(coordHelpers.lat2y(0)).toBeCloseTo(0);
  });
});

describe("simplifyByAngle", () => {
  const rightAngle = [
    [0, 0],
    [1, 0],
    [1, 1],
  ];

  it("returns simplified shape for low tolerance", () => {
    const simplified = coordHelpers.simplifyByAngle(rightAngle, 0.5);
    expect(simplified.length).toEqual(rightAngle.length);
  });

  it("keeps points with high tolerance", () => {
    const simplified = coordHelpers.simplifyByAngle(rightAngle, 180);
    expect(simplified.length).toBe(2); // Only start/end kept
  });
});

describe("offsetLine", () => {
  it("offsets a straight line correctly to the left", () => {
    const input = [new Vector2(0, 0), new Vector2(0, 10)];
    const offset = offsetLine(input, -2);

    expect(offset.length).toBe(2);
    expect(offset[0].x).toBeCloseTo(-2);
    expect(offset[0].y).toBeCloseTo(0);
    expect(offset[1].x).toBeCloseTo(-2);
    expect(offset[1].y).toBeCloseTo(10);
  });

  it("offsets a vertical line to the right", () => {
    const input = [new Vector2(0, 0), new Vector2(0, 10)];
    const offset = offsetLine(input, 2);

    expect(offset[0].x).toBeCloseTo(2);
    expect(offset[0].y).toBeCloseTo(0);
    expect(offset[1].x).toBeCloseTo(2);
    expect(offset[1].y).toBeCloseTo(10);
  });

  it("preserves length with symmetrical offset", () => {
    const input = [new Vector2(0, 0), new Vector2(0, 10)];
    const left = offsetLine(input, -2);
    const right = offsetLine(input, 2);

    expect(Math.abs(right[0].x - left[0].x)).toBeCloseTo(4);
  });
});

describe("offsetCoordinateLine", () => {
  it("moves the line by ~5 meters", () => {
    const originalLine: GeoJSON.Position[] = [
      [10.0, 50.0],
      [10.001, 50.0]
    ];

    const offsetLine = coordHelpers.offsetCoordinateLine(originalLine, 5);

    for (let i = 0; i < originalLine.length; i++) {
      const dist = coordHelpers.getDistanceBetweenCoordinatesInM(
        originalLine[i],
        offsetLine[i]
      );
      expect(dist).toBeCloseTo(5, 0); // Within 1 meter tolerance
    }
  });

  it("inverts direction for negative offset", () => {
    const originalLine: GeoJSON.Position[] = [
      [10.0, 50.0],
      [10.001, 50.0]
    ];

    const offsetA = coordHelpers.offsetCoordinateLine(originalLine, 5);
    const offsetB = coordHelpers.offsetCoordinateLine(originalLine, -5);

    for (let i = 0; i < originalLine.length; i++) {
      const dist = coordHelpers.getDistanceBetweenCoordinatesInM(offsetA[i], offsetB[i]);
      expect(dist).toBeCloseTo(10, 0); // 5m left + 5m right = ~10m apart
    }
  });
});
