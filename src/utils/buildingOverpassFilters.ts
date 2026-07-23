import { getRelationAreaGeometry, getWayPolygonGeometry } from "../indoor/indoorAreaGeometry";
import { BuildingInterface } from "../models/buildingInterface";
import { OverpassElement, OverpassJson } from "../models/overpassJson";
import { OsmGraph } from "../overpass/OsmGraph";
import { getOverpassElementKey } from "./overpassJsonHelpers";

export function findBuildingInOverpassBySearchString(
  overpassJson: OverpassJson,
  searchString: string,
): BuildingInterface | undefined {
  const graph = new OsmGraph(overpassJson);
  const building = graph.elements.find((element) => matchesBuildingSearch(element, searchString));

  if (building === undefined) {
    return undefined;
  }

  return getBuildingInterfaceFromOverpassElement(graph, building);
}

export function getBuildingInterfaceFromOverpassElement(
  graph: OsmGraph,
  building: OverpassElement,
): BuildingInterface | undefined {
  if (building.type === "node") {
    return undefined;
  }

  const geometry =
    building.type === "way"
      ? getWayPolygonGeometry(building, getAreaGeometryOptions(graph, building))
      : getRelationAreaGeometry(building, getAreaGeometryOptions(graph, building));

  if (geometry === undefined) {
    return undefined;
  }

  return {
    id: getOverpassElementKey(building),
    tags: { ...(building.tags ?? {}) },
    boundingBox: getGeometryBoundingBox(geometry),
    outlineGeometry: geometry,
  };
}

function matchesBuildingSearch(element: OverpassElement, searchString: string): boolean {
  const tags = element.tags;

  return (
    tags !== undefined &&
    tags.building !== undefined &&
    (tags.name === searchString || tags.loc_ref === searchString)
  );
}

function getAreaGeometryOptions(graph: OsmGraph, building: OverpassElement) {
  return {
    graph,
    elementId: getOverpassElementKey(building),
    elementKind: "building",
    warningPrefix: "BuildingOverpassFilters",
    emittedWarnings: new Set<string>(),
  };
}

function getGeometryBoundingBox(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): number[] {
  const positions = flattenGeometryPositions(geometry);
  const longitudes = positions.map((position) => position[0]);
  const latitudes = positions.map((position) => position[1]);

  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ];
}

function flattenGeometryPositions(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): GeoJSON.Position[] {
  return geometry.type === "Polygon" ? geometry.coordinates.flat() : geometry.coordinates.flat(2);
}
