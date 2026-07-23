import * as BuildingConstantsDefinition from "../public/strings/buildingConstants.json";
import { OverpassElement } from "../src/models/overpassJson";
import { OsmGraph } from "../src/overpass/OsmGraph";
import { getBuildingInterfaceFromOverpassElement } from "../src/utils/buildingOverpassFilters";
import { filterOverpassByBounds } from "../src/utils/overpassFilters";
import { getBuildingSourceDefinition, matchesBuildingTags } from "./buildingSources";
import { readCachedOverpassJson } from "./readCachedOverpassData";

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
  const buildings = await readCachedOverpassJson(paths.buildingsDataPath);
  const indoor = await readCachedOverpassJson(paths.indoorDataPath);
  const buildingGraph = new OsmGraph(buildings);
  const indoorGraph = new OsmGraph(indoor);
  const matchingBuildings = buildingGraph.elements.filter((element) =>
    isMatchingSitBuilding(element, buildingSource.buildingTags),
  );

  if (matchingBuildings.length !== 1) {
    throw new Error(
      `Expected exactly one SIT building for "${building}", found ${matchingBuildings.length}.`,
    );
  }

  const buildingInterface = getBuildingInterfaceFromOverpassElement(
    buildingGraph,
    matchingBuildings[0],
  );
  if (buildingInterface === undefined) {
    throw new Error(`SIT building "${building}" must have Polygon or MultiPolygon geometry.`);
  }

  const indoorElements = filterOverpassByBounds(indoor, buildingInterface.boundingBox, {
    bearingNodeIds: [buildingConstants.BEARING_CALC_NODE1, buildingConstants.BEARING_CALC_NODE2],
  }).elements.filter(isValidationIndoorElement);

  if (indoorElements.length === 0) {
    throw new Error(`No indoor or level elements were found inside SIT building "${building}".`);
  }

  validateBearingNode(
    indoorGraph,
    buildingConstants.BEARING_CALC_NODE1,
    "BEARING_CALC_NODE1",
    building,
  );
  validateBearingNode(
    indoorGraph,
    buildingConstants.BEARING_CALC_NODE2,
    "BEARING_CALC_NODE2",
    building,
  );
}

function isMatchingSitBuilding(
  element: OverpassElement,
  buildingTags: Record<string, string>,
): boolean {
  const tags = element.tags;

  return (
    tags !== undefined &&
    tags.building !== undefined &&
    tags.min_level !== undefined &&
    matchesBuildingTags(tags, buildingTags)
  );
}

function isValidationIndoorElement(element: OverpassElement): boolean {
  const tags = element.tags;

  return tags !== undefined && (tags.indoor !== undefined || tags.level !== undefined);
}

function getBuildingConstants(building: string): (typeof BuildingConstantsDefinition)[BuildingId] {
  if (!(building in BuildingConstantsDefinition)) {
    throw new Error(`Building "${building}" has no building constants.`);
  }

  return BuildingConstantsDefinition[building as BuildingId];
}

function validateBearingNode(
  indoorGraph: OsmGraph,
  nodeId: string,
  fieldName: string,
  building: string,
): void {
  if (indoorGraph.getNode(nodeId) === undefined) {
    throw new Error(`${fieldName} node/${nodeId} was not found for SIT building "${building}".`);
  }
}
