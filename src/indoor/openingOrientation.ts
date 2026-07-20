import { OpeningOrientationDebugData } from "../models/doorDataInterface";
import CoordinateHelpers from "../utils/coordinateHelpers";

export interface OpeningOrientationGeometry {
  orientation: [GeoJSON.Position, GeoJSON.Position, GeoJSON.Position];
  debug: OpeningOrientationDebugData;
}

export function calculateOpeningOrientationGeometry(
  openingCoord: GeoJSON.Position,
  previous: GeoJSON.Position,
  after: GeoJSON.Position,
  width = 1,
): OpeningOrientationGeometry | undefined {
  const prevDist = CoordinateHelpers.getDistanceBetweenCoordinatesInM(previous, openingCoord);
  const afterDist = CoordinateHelpers.getDistanceBetweenCoordinatesInM(after, openingCoord);

  if (prevDist == 0 || afterDist == 0) {
    return undefined;
  }

  const previousOpeningCoord = scaleCoordinateToward(openingCoord, previous, width, prevDist);
  const afterOpeningCoord = scaleCoordinateToward(openingCoord, after, width, afterDist);

  return {
    orientation: [previousOpeningCoord, openingCoord, afterOpeningCoord],
    debug: {
      previous,
      opening: openingCoord,
      after,
      previousDistanceM: prevDist,
      afterDistanceM: afterDist,
      widthM: width,
      calculatedPrevious: previousOpeningCoord,
      calculatedAfter: afterOpeningCoord,
    },
  };
}

function scaleCoordinateToward(
  origin: GeoJSON.Position,
  target: GeoJSON.Position,
  width: number,
  distanceMeters: number,
): GeoJSON.Position {
  return [
    origin[0] + ((target[0] - origin[0]) * width) / (2 * distanceMeters),
    CoordinateHelpers.y2lat(
      CoordinateHelpers.lat2y(origin[1]) +
        ((CoordinateHelpers.lat2y(target[1]) - CoordinateHelpers.lat2y(origin[1])) * width) /
          (2 * distanceMeters),
    ),
  ];
}
