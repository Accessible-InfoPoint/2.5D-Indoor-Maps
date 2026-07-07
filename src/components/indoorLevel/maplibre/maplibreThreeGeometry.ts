import maplibregl from "maplibre-gl";
import * as THREE from "three";

export function createPolygonSlabGeometry(
  origin: maplibregl.MercatorCoordinate,
  rings: GeoJSON.Position[][],
  thicknessMeters: number,
  baseElevationMeters = 0,
): THREE.BufferGeometry {
  const vertices: number[] = [];
  const openRings = rings.map((ring) => getOpenRing(ring)).filter((ring) => ring.length >= 3);
  const flatRings = openRings.flat();

  flatRings.forEach((coordinate) =>
    addMercatorVertex(vertices, origin, coordinate, baseElevationMeters),
  );
  flatRings.forEach((coordinate) =>
    addMercatorVertex(vertices, origin, coordinate, baseElevationMeters + thicknessMeters),
  );

  const bottomOffset = 0;
  const topOffset = flatRings.length;
  const [outerRing, ...innerRings] = openRings;
  const topTriangles = THREE.ShapeUtils.triangulateShape(
    createLocalShapePoints(origin, outerRing),
    innerRings.map((ring) => createLocalShapePoints(origin, ring)),
  );
  const indices: number[] = [];

  topTriangles.forEach(([a, b, c]) => {
    indices.push(topOffset + a, topOffset + b, topOffset + c);
    indices.push(bottomOffset + c, bottomOffset + b, bottomOffset + a);
  });

  addSideIndices(indices, openRings, bottomOffset, topOffset);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

export function createPolygonSurfaceGeometry(
  origin: maplibregl.MercatorCoordinate,
  rings: GeoJSON.Position[][],
  elevationMeters: number,
): THREE.BufferGeometry {
  const openRings = rings.map((ring) => getOpenRing(ring)).filter((ring) => ring.length >= 3);
  const [outerRing, ...innerRings] = openRings;
  const vertices: number[] = [];

  if (!outerRing) {
    return new THREE.BufferGeometry();
  }

  openRings
    .flat()
    .forEach((coordinate) => addMercatorVertex(vertices, origin, coordinate, elevationMeters));

  const indices = THREE.ShapeUtils.triangulateShape(
    createLocalShapePoints(origin, outerRing),
    innerRings.map((ring) => createLocalShapePoints(origin, ring)),
  ).flat();

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

export function createSlopedPrismGeometry(
  origin: maplibregl.MercatorCoordinate,
  coordinates: GeoJSON.Position[],
  heightMeters: number,
  altitudeMeters: number,
): THREE.BufferGeometry {
  const ring = getOpenRing(coordinates);
  const vertices: number[] = [];
  const indices: number[] = [];

  if (ring.length < 3) {
    return new THREE.BufferGeometry();
  }

  ring.forEach((coordinate) =>
    addMercatorVertex(
      vertices,
      origin,
      coordinate,
      altitudeMeters + getCoordinateElevationMeters(coordinate),
    ),
  );
  ring.forEach((coordinate) =>
    addMercatorVertex(
      vertices,
      origin,
      coordinate,
      altitudeMeters + getCoordinateElevationMeters(coordinate) + heightMeters,
    ),
  );

  const topOffset = ring.length;
  const topTriangles = THREE.ShapeUtils.triangulateShape(createLocalShapePoints(origin, ring), []);

  topTriangles.forEach(([a, b, c]) => {
    indices.push(topOffset + a, topOffset + b, topOffset + c);
    indices.push(c, b, a);
  });

  addSideIndices(indices, [ring], 0, topOffset);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

export function createVerticalCylinderGeometry(
  origin: maplibregl.MercatorCoordinate,
  coordinate: GeoJSON.Position,
  radiusMeters: number,
  heightMeters: number,
  altitudeMeters: number,
  radialSegments: number,
): THREE.BufferGeometry {
  const scale = origin.meterInMercatorCoordinateUnits();
  const geometry = new THREE.CylinderGeometry(
    radiusMeters * scale,
    radiusMeters * scale,
    heightMeters * scale,
    radialSegments,
  );
  const position = createLocalMercatorVector(origin, coordinate, altitudeMeters + heightMeters / 2);

  geometry.rotateX(Math.PI / 2);
  geometry.translate(position.x, position.y, position.z);
  geometry.computeVertexNormals();

  return geometry;
}

export function addMercatorVertex(
  vertices: number[],
  origin: maplibregl.MercatorCoordinate,
  coordinate: GeoJSON.Position,
  elevationMeters: number,
): void {
  const mercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat(
    { lng: coordinate[0], lat: coordinate[1] },
    elevationMeters,
  );

  vertices.push(
    mercatorCoordinate.x - origin.x,
    mercatorCoordinate.y - origin.y,
    mercatorCoordinate.z - origin.z,
  );
}

export function createLocalMercatorVector(
  origin: maplibregl.MercatorCoordinate,
  coordinate: GeoJSON.Position,
  elevationMeters: number,
): THREE.Vector3 {
  const mercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat(
    { lng: coordinate[0], lat: coordinate[1] },
    elevationMeters,
  );

  return new THREE.Vector3(
    mercatorCoordinate.x - origin.x,
    mercatorCoordinate.y - origin.y,
    mercatorCoordinate.z - origin.z,
  );
}

export function createMercatorOrigin(ring: GeoJSON.Position[]): maplibregl.MercatorCoordinate {
  const center = ring.reduce(
    (sum, coordinate) => ({
      lng: sum.lng + coordinate[0],
      lat: sum.lat + coordinate[1],
    }),
    { lng: 0, lat: 0 },
  );

  return maplibregl.MercatorCoordinate.fromLngLat(
    {
      lng: center.lng / ring.length,
      lat: center.lat / ring.length,
    },
    0,
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
  ring: GeoJSON.Position[],
): THREE.Vector2[] {
  return ring.map((coordinate) => {
    const mercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat(
      { lng: coordinate[0], lat: coordinate[1] },
      0,
    );

    return new THREE.Vector2(mercatorCoordinate.x - origin.x, mercatorCoordinate.y - origin.y);
  });
}

function addSideIndices(
  indices: number[],
  rings: GeoJSON.Position[][],
  bottomOffset: number,
  topOffset: number,
): void {
  let vertexOffset = 0;

  rings.forEach((ring) => {
    for (let i = 0; i < ring.length; i++) {
      const current = vertexOffset + i;
      const next = vertexOffset + ((i + 1) % ring.length);

      indices.push(
        bottomOffset + current,
        bottomOffset + next,
        topOffset + next,
        bottomOffset + current,
        topOffset + next,
        topOffset + current,
      );
    }

    vertexOffset += ring.length;
  });
}

function getCoordinateElevationMeters(coordinate: GeoJSON.Position): number {
  return typeof coordinate[2] == "number" ? coordinate[2] : 0;
}
