import { Application, Request, Response } from "express";
import * as BuildingConstantsDefinition from "../public/strings/buildingConstants.json";
import { BuildingInterface } from "../src/models/buildingInterface";
import { OverpassJson } from "@indoortoolkit/indoor-osm-parser";
import { findBuildingInOverpassBySearchString } from "../src/utils/buildingOverpassFilters";
import { filterOverpassByBounds, filterOverpassByElementIds } from "../src/utils/overpassFilters";
import { apiError } from "./apiError";
import {
  BuildingSourceRegistry,
  getCachedOverpassPathsForBuilding,
  getBuildingSourceDefinition,
} from "./buildingSources";
import { readCachedOverpassJson } from "./readCachedOverpassData";

type BuildingId = string;
type BuildingDefinitions = Record<
  string,
  {
    SEARCH_STRING: string;
    BEARING_CALC_NODE1?: string | number;
    BEARING_CALC_NODE2?: string | number;
  }
>;

export interface OverpassDataRouteOptions {
  buildingsDataPath?: string;
  indoorDataPath?: string;
  buildingDefinitions?: BuildingDefinitions;
  buildingSources?: BuildingSourceRegistry;
}

interface RawOverpassDataResponse {
  buildingInterface: BuildingInterface;
  buildings: OverpassJson;
  indoor: OverpassJson;
}

export function registerOverpassDataRoute(
  app: Application,
  options: OverpassDataRouteOptions = {},
): void {
  const routeOptions = normalizeRouteOptions(options);

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

interface NormalizedOverpassDataRouteOptions {
  buildingsDataPath?: string;
  indoorDataPath?: string;
  buildingDefinitions: BuildingDefinitions;
  buildingSources?: BuildingSourceRegistry;
}

function normalizeRouteOptions(
  options: OverpassDataRouteOptions,
): NormalizedOverpassDataRouteOptions {
  return {
    buildingsDataPath: options.buildingsDataPath,
    indoorDataPath: options.indoorDataPath,
    buildingDefinitions:
      options.buildingDefinitions ?? (BuildingConstantsDefinition as BuildingDefinitions),
    buildingSources: options.buildingSources,
  };
}

async function loadRawOverpassData(
  building: BuildingId,
  options: NormalizedOverpassDataRouteOptions,
): Promise<RawOverpassDataResponse> {
  const buildingDefinition = options.buildingDefinitions[building];
  const cachedPaths = getCachedPaths(building, options);
  const rawBuildings = await readCachedOverpassJson(cachedPaths.buildingsDataPath);
  const rawIndoor = await readCachedOverpassJson(cachedPaths.indoorDataPath);
  const buildingInterface = findBuildingInOverpassBySearchString(
    rawBuildings,
    buildingDefinition.SEARCH_STRING,
  );

  if (!buildingInterface) {
    throw new Error(
      `Configured building "${buildingDefinition.SEARCH_STRING}" was not found in cached buildings data.`,
    );
  }

  return {
    buildingInterface,
    buildings: filterOverpassByElementIds(rawBuildings, [buildingInterface.id]),
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
  options: NormalizedOverpassDataRouteOptions,
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
  options: NormalizedOverpassDataRouteOptions,
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
