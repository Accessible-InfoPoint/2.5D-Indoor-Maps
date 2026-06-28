// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import polygonCenter from "geojson-polygon-center";

export function getGeometryLabelCenter(
  geometry: GeoJSON.Geometry
): GeoJSON.Position | undefined {
  if (geometry.type == "Polygon") {
    return getPolygonCenter(geometry);
  }

  if (geometry.type == "MultiPolygon") {
    const largestPolygonCoordinates = geometry.coordinates
      .map((coordinates) => ({
        coordinates,
        area: getBoundingBoxArea(coordinates[0] ?? []),
      }))
      .sort((a, b) => b.area - a.area)[0]?.coordinates;

    return largestPolygonCoordinates
      ? getPolygonCenter({
          type: "Polygon",
          coordinates: largestPolygonCoordinates,
        })
      : undefined;
  }

  return undefined;
}

function getPolygonCenter(geometry: GeoJSON.Polygon): GeoJSON.Position | undefined {
  const center = polygonCenter(geometry) as GeoJSON.Point;

  return center.coordinates;
}

function getBoundingBoxArea(positions: GeoJSON.Position[]): number {
  if (positions.length == 0) {
    return 0;
  }

  const bounds = positions.reduce(
    (currentBounds, position) => ({
      minX: Math.min(currentBounds.minX, position[0]),
      minY: Math.min(currentBounds.minY, position[1]),
      maxX: Math.max(currentBounds.maxX, position[0]),
      maxY: Math.max(currentBounds.maxY, position[1]),
    }),
    {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    }
  );

  return (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
}
