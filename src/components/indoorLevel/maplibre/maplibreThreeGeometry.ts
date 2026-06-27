import maplibregl from "maplibre-gl";
import * as THREE from "three";

export function createPolygonSlabGeometry(
  origin: maplibregl.MercatorCoordinate,
  ring: GeoJSON.Position[],
  thicknessMeters: number
): THREE.BufferGeometry {
  const vertices: number[] = [];

  ring.forEach((coordinate) => addMercatorVertex(vertices, origin, coordinate, 0));
  ring.forEach((coordinate) => addMercatorVertex(vertices, origin, coordinate, thicknessMeters));

  const bottomOffset = 0;
  const topOffset = ring.length;
  const topTriangles = THREE.ShapeUtils.triangulateShape(
    createLocalShapePoints(origin, ring),
    []
  );
  const indices: number[] = [];

  topTriangles.forEach(([a, b, c]) => {
    indices.push(topOffset + a, topOffset + b, topOffset + c);
    indices.push(bottomOffset + c, bottomOffset + b, bottomOffset + a);
  });

  for (let i = 0; i < ring.length; i++) {
    const next = (i + 1) % ring.length;

    indices.push(
      bottomOffset + i,
      bottomOffset + next,
      topOffset + next,
      bottomOffset + i,
      topOffset + next,
      topOffset + i
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

export function addMercatorVertex(
  vertices: number[],
  origin: maplibregl.MercatorCoordinate,
  coordinate: GeoJSON.Position,
  elevationMeters: number
): void {
  const mercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat(
    { lng: coordinate[0], lat: coordinate[1] },
    elevationMeters
  );

  vertices.push(
    mercatorCoordinate.x - origin.x,
    mercatorCoordinate.y - origin.y,
    mercatorCoordinate.z - origin.z
  );
}

export function createMercatorOrigin(
  ring: GeoJSON.Position[]
): maplibregl.MercatorCoordinate {
  const center = ring.reduce(
    (sum, coordinate) => ({
      lng: sum.lng + coordinate[0],
      lat: sum.lat + coordinate[1],
    }),
    { lng: 0, lat: 0 }
  );

  return maplibregl.MercatorCoordinate.fromLngLat(
    {
      lng: center.lng / ring.length,
      lat: center.lat / ring.length,
    },
    0
  );
}

export function getOpenRing(coordinates: GeoJSON.Position[]): GeoJSON.Position[] {
  if (coordinates.length <= 1) {
    return coordinates;
  }

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];

  if (first[0] == last[0] && first[1] == last[1]) {
    return coordinates.slice(0, -1);
  }

  return coordinates;
}

function createLocalShapePoints(
  origin: maplibregl.MercatorCoordinate,
  ring: GeoJSON.Position[]
): THREE.Vector2[] {
  return ring.map((coordinate) => {
    const mercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat(
      { lng: coordinate[0], lat: coordinate[1] },
      0
    );

    return new THREE.Vector2(
      mercatorCoordinate.x - origin.x,
      mercatorCoordinate.y - origin.y
    );
  });
}
