import { Application, Request, Response } from "express";
import * as BuildingConstantsDefinition from "../public/strings/buildingConstants.json";
import { BuildingInterface } from "../src/models/buildingInterface";
import { OverpassJson } from "../src/models/overpassJson";
import {
  filterByBoundsOrBearingNode,
  findBuildingBySearchString,
} from "../src/utils/buildingGeoJsonFilters";
import { filterOverpassByBounds, filterOverpassByElementIds } from "../src/utils/overpassFilters";
import { getRequiredFeatureId } from "../src/utils/geoJsonHelpers";
import { apiError } from "./apiError";
import {
  BuildingSourceRegistry,
  getCachedOverpassPathsForBuilding,
  getBuildingSourceDefinition,
} from "./buildingSources";
import { readCachedGeoJsonCompat, readCachedOverpassJson } from "./readCachedOverpassData";

type BuildingId = string;
type BuildingDefinitions = Record<
  string,
  {
    SEARCH_STRING: string;
    BEARING_CALC_NODE1?: string | number;
    BEARING_CALC_NODE2?: string | number;
  }
>;

export interface FilteredIndoorDataRouteOptions {
  buildingsDataPath?: string;
  indoorDataPath?: string;
  buildingDefinitions?: BuildingDefinitions;
  buildingSources?: BuildingSourceRegistry;
}

interface FilteredIndoorDataResponse {
  buildingInterface: BuildingInterface;
  geoJson: GeoJSON.FeatureCollection;
}

interface RawOverpassDataResponse {
  buildings: OverpassJson;
  indoor: OverpassJson;
}

export function registerFilteredIndoorDataRoute(
  app: Application,
  options: FilteredIndoorDataRouteOptions = {},
): void {
  const routeOptions = normalizeRouteOptions(options);

  app.get(
    "/api/buildings/:building/indoor",
    async (request: RouteRequest, response: RouteResponse) => {
      try {
        const building = request.params.building;

        if (!isBuildingId(building, routeOptions)) {
          response
            .status(404)
            .json(apiError("unknown_building", `Unknown building "${building}".`, { building }));
          return;
        }

        response.json(await loadFilteredIndoorData(building, routeOptions));
      } catch (error) {
        const message = getErrorMessage(error);
        response.status(500).json(
          apiError("cached_indoor_data_unavailable", message, {
            building: request.params.building,
          }),
        );
      }
    },
  );

  app.get(
    "/api/buildings/:building/overpass",
    async (request: RouteRequest, response: RouteResponse) => {
      try {
        const building = request.params.building;

        if (!isBuildingId(building, routeOptions)) {
          response
            .status(404)
            .json(apiError("unknown_building", `Unknown building "${building}".`, { building }));
          return;
        }

        response.json(await loadRawOverpassData(building, routeOptions));
      } catch (error) {
        const message = getErrorMessage(error);
        response.status(500).json(
          apiError("cached_overpass_data_unavailable", message, {
            building: request.params.building,
          }),
        );
      }
    },
  );
}

type RouteRequest = Request<{ building: string }>;
type RouteResponse = Response;

interface NormalizedFilteredIndoorDataRouteOptions {
  buildingsDataPath?: string;
  indoorDataPath?: string;
  buildingDefinitions: BuildingDefinitions;
  buildingSources?: BuildingSourceRegistry;
}

function normalizeRouteOptions(
  options: FilteredIndoorDataRouteOptions,
): NormalizedFilteredIndoorDataRouteOptions {
  return {
    buildingsDataPath: options.buildingsDataPath,
    indoorDataPath: options.indoorDataPath,
    buildingDefinitions:
      options.buildingDefinitions ?? (BuildingConstantsDefinition as BuildingDefinitions),
    buildingSources: options.buildingSources,
  };
}

async function loadFilteredIndoorData(
  building: BuildingId,
  options: NormalizedFilteredIndoorDataRouteOptions,
): Promise<FilteredIndoorDataResponse> {
  const buildingDefinition = options.buildingDefinitions[building];
  const cachedPaths = getCachedPaths(building, options);
  const buildings = await readCachedGeoJsonCompat(cachedPaths.buildingsDataPath);
  const indoor = await readCachedGeoJsonCompat(cachedPaths.indoorDataPath);
  const buildingInterface = findBuildingBySearchString(buildings, buildingDefinition.SEARCH_STRING);

  if (!buildingInterface) {
    throw new Error(
      `Configured building "${buildingDefinition.SEARCH_STRING}" was not found in cached buildings data.`,
    );
  }

  return {
    buildingInterface,
    geoJson: filterByBoundsOrBearingNode(indoor, buildingInterface.boundingBox, {
      bearingNodeIds: getBearingNodeIds(buildingDefinition),
    }),
  };
}

async function loadRawOverpassData(
  building: BuildingId,
  options: NormalizedFilteredIndoorDataRouteOptions,
): Promise<RawOverpassDataResponse> {
  const buildingDefinition = options.buildingDefinitions[building];
  const cachedPaths = getCachedPaths(building, options);
  const rawBuildings = await readCachedOverpassJson(cachedPaths.buildingsDataPath);
  const rawIndoor = await readCachedOverpassJson(cachedPaths.indoorDataPath);
  const buildings = await readCachedGeoJsonCompat(cachedPaths.buildingsDataPath);
  const buildingInterface = findBuildingBySearchString(buildings, buildingDefinition.SEARCH_STRING);

  if (!buildingInterface) {
    throw new Error(
      `Configured building "${buildingDefinition.SEARCH_STRING}" was not found in cached buildings data.`,
    );
  }

  return {
    buildings: filterOverpassByElementIds(rawBuildings, [
      getRequiredFeatureId(buildingInterface.feature),
    ]),
    indoor: filterOverpassByBounds(rawIndoor, buildingInterface.boundingBox, {
      bearingNodeIds: getBearingNodeIds(buildingDefinition),
    }),
  };
}

function getBearingNodeIds(
  buildingDefinition: BuildingDefinitions[BuildingId],
): Array<string | number> {
  return [buildingDefinition.BEARING_CALC_NODE1, buildingDefinition.BEARING_CALC_NODE2].filter(
    (nodeId): nodeId is string | number => nodeId !== undefined,
  );
}

function getCachedPaths(
  building: BuildingId,
  options: NormalizedFilteredIndoorDataRouteOptions,
): { buildingsDataPath: string; indoorDataPath: string } {
  if (options.buildingsDataPath !== undefined && options.indoorDataPath !== undefined) {
    return {
      buildingsDataPath: options.buildingsDataPath,
      indoorDataPath: options.indoorDataPath,
    };
  }

  if (options.buildingSources !== undefined) {
    return getCachedOverpassPathsForBuilding(building, options.buildingSources);
  }

  return getCachedOverpassPathsForBuilding(building);
}

function isBuildingId(
  value: string,
  options: NormalizedFilteredIndoorDataRouteOptions,
): value is BuildingId {
  if (!(value in options.buildingDefinitions)) {
    return false;
  }

  if (options.buildingsDataPath !== undefined && options.indoorDataPath !== undefined) {
    return true;
  }

  try {
    getBuildingSourceDefinition(value, options.buildingSources);
    return true;
  } catch {
    return false;
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Unknown server error.";
}
