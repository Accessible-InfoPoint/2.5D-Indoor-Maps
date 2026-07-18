import { DoorOrientationDebugData } from "../models/doorDataInterface";
import CoordinateHelpers from "../utils/coordinateHelpers";

export interface DoorOrientationGeometry {
  orientation: [GeoJSON.Position, GeoJSON.Position];
  debug: DoorOrientationDebugData;
}

export function calculateDoorOrientationGeometry(
  doorCoord: GeoJSON.Position,
  previous: GeoJSON.Position,
  after: GeoJSON.Position,
  width = 1,
): DoorOrientationGeometry | undefined {
  const prevDist = CoordinateHelpers.getDistanceBetweenCoordinatesInM(previous, doorCoord);
  const afterDist = CoordinateHelpers.getDistanceBetweenCoordinatesInM(after, doorCoord);

  if (prevDist == 0 || afterDist == 0) {
    return undefined;
  }

  const prevDoorCoord = scaleCoordinateToward(doorCoord, previous, width, prevDist);
  const afterDoorCoord = scaleCoordinateToward(doorCoord, after, width, afterDist);

  return {
    orientation: [prevDoorCoord, afterDoorCoord],
    debug: {
      previous,
      door: doorCoord,
      after,
      previousDistanceM: prevDist,
      afterDistanceM: afterDist,
      widthM: width,
      calculatedPrevious: prevDoorCoord,
      calculatedAfter: afterDoorCoord,
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
