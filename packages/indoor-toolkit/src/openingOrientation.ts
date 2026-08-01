import CoordinateHelpers from "./utils/coordinateHelpers";
import { IndoorDiagnostics } from "./diagnostics";
import { IndoorElementRef } from "./models/indoorElementRef";

/** Debug data exposing the source and calculated coordinates used for an opening orientation. */
export interface OpeningOrientationDebugData {
  /** Coordinate before the opening in the containing wall or room boundary. */
  previous: GeoJSON.Position;
  /** Opening coordinate. */
  opening: GeoJSON.Position;
  /** Coordinate after the opening in the containing wall or room boundary. */
  after: GeoJSON.Position;
  /** Distance from `previous` to `opening` in meters. */
  previousDistanceM: number;
  /** Distance from `after` to `opening` in meters. */
  afterDistanceM: number;
  /** Opening width used for the calculation, in meters. */
  widthM: number;
  /** Calculated endpoint on the previous side of the opening symbol. */
  calculatedPrevious: GeoJSON.Position;
  /** Calculated endpoint on the after side of the opening symbol. */
  calculatedAfter: GeoJSON.Position;
}

/** Geometry describing the line segment/orientation used for an opening symbol. */
export interface OpeningOrientationGeometry {
  /** Three coordinates: previous opening endpoint, opening node, after opening endpoint. */
  orientation: [GeoJSON.Position, GeoJSON.Position, GeoJSON.Position];
  /** Calculation details useful for debugging renderers or data issues. */
  debug: OpeningOrientationDebugData;
}

/**
 * Calculate opening orientation from a node and its neighboring boundary coordinates.
 *
 * Returns `undefined` if the opening is identical to a neighboring coordinate,
 * because the direction cannot be derived.
 */
export function calculateOpeningOrientationGeometry(
  openingCoord: GeoJSON.Position,
  previous: GeoJSON.Position,
  after: GeoJSON.Position,
  width = 1,
  diagnostics?: IndoorDiagnostics,
  elementRef?: IndoorElementRef,
): OpeningOrientationGeometry | undefined {
  const prevDist = CoordinateHelpers.getDistanceBetweenCoordinatesInM(previous, openingCoord);
  const afterDist = CoordinateHelpers.getDistanceBetweenCoordinatesInM(after, openingCoord);

  if (prevDist == 0 || afterDist == 0) {
    const message =
      "Cannot calculate opening orientation: the opening coordinate is identical to a neighboring coordinate.";

    if (diagnostics === undefined) {
      console.warn(`[OpeningOrientation] ${message}`);
    } else {
      diagnostics.warn({
        code: "OpeningOrientation.identical-neighbor-coordinate",
        message,
        elementRef,
      });
    }
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
