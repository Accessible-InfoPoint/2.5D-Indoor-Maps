import fs from "node:fs/promises";
import * as BuildingConstantsDefinition from "../public/strings/buildingConstants.json";
import { filterByBoundsOrBearingNode, findFeatureById } from "../src/utils/buildingGeoJsonFilters";
import { getRequiredFeatureProperties } from "../src/utils/geoJsonHelpers";
import { getBuildingSourceDefinition, matchesBuildingTags } from "./buildingSources";
import { resolveProjectPath } from "./paths";

interface CachedOverpassPaths {
  buildingsDataPath: string;
  indoorDataPath: string;
}

type BuildingId = keyof typeof BuildingConstantsDefinition & string;

export async function validateCachedOverpassDataForBuilding(
  building: string,
  paths: CachedOverpassPaths,
): Promise<void> {
  const buildingConstants = getBuildingConstants(building);
  const buildingSource = getBuildingSourceDefinition(building);
  const buildings = await readFeatureCollection(paths.buildingsDataPath);
  const indoor = await readFeatureCollection(paths.indoorDataPath);
  const matchingBuildings = buildings.features.filter((feature) => {
    const properties = feature.properties;

    return (
      properties !== null &&
      properties.building !== undefined &&
      properties.min_level !== undefined &&
      matchesBuildingTags(properties, buildingSource.buildingTags)
    );
  });

  if (matchingBuildings.length !== 1) {
    throw new Error(
      `Expected exactly one SIT building for "${building}", found ${matchingBuildings.length}.`,
    );
  }

  const buildingFeature = matchingBuildings[0];
  if (!["Polygon", "MultiPolygon"].includes(buildingFeature.geometry.type)) {
    throw new Error(`SIT building "${building}" must have Polygon or MultiPolygon geometry.`);
  }

  const buildingBounds = getBoundingBox(buildingFeature);
  const indoorFeatures = filterByBoundsOrBearingNode(indoor, buildingBounds, {
    bearingNodeIds: [buildingConstants.BEARING_CALC_NODE1, buildingConstants.BEARING_CALC_NODE2],
  }).features.filter((feature) => {
    const properties = getRequiredFeatureProperties(feature);

    return properties.indoor !== undefined || properties.level !== undefined;
  });

  if (indoorFeatures.length === 0) {
    throw new Error(`No indoor or level features were found inside SIT building "${building}".`);
  }

  validateBearingNode(indoor, buildingConstants.BEARING_CALC_NODE1, "BEARING_CALC_NODE1", building);
  validateBearingNode(indoor, buildingConstants.BEARING_CALC_NODE2, "BEARING_CALC_NODE2", building);
}

async function readFeatureCollection(path: string): Promise<GeoJSON.FeatureCollection> {
  const data = await fs.readFile(resolveProjectPath(path), "utf8");

  return JSON.parse(data) as GeoJSON.FeatureCollection;
}

function getBuildingConstants(building: string): (typeof BuildingConstantsDefinition)[BuildingId] {
  if (!(building in BuildingConstantsDefinition)) {
    throw new Error(`Building "${building}" has no building constants.`);
  }

  return BuildingConstantsDefinition[building as BuildingId];
}

function validateBearingNode(
  indoor: GeoJSON.FeatureCollection,
  nodeId: string,
  fieldName: string,
  building: string,
): void {
  if (findFeatureById(indoor, `node/${nodeId}`) === undefined) {
    throw new Error(`${fieldName} node/${nodeId} was not found for SIT building "${building}".`);
  }
}

function getBoundingBox(feature: GeoJSON.Feature): number[] {
  const coordinates = (feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon).coordinates;
  const positions = flattenPositions(coordinates);
  const longitudes = positions.map((position) => position[0]);
  const latitudes = positions.map((position) => position[1]);

  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ];
}

function flattenPositions(
  coordinates: GeoJSON.Position[][][] | GeoJSON.Position[][],
): GeoJSON.Position[] {
  if (isPosition(coordinates[0][0])) {
    return coordinates.flat() as GeoJSON.Position[];
  }

  return (coordinates as GeoJSON.Position[][][]).flat(2);
}

function isPosition(value: GeoJSON.Position | GeoJSON.Position[]): value is GeoJSON.Position {
  return typeof value[0] === "number";
}
