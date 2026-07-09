import { Application, Request, Response } from "express";
import fs from "node:fs/promises";
import * as BuildingConstantsDefinition from "../public/strings/buildingConstants.json";
import { BuildingInterface } from "../src/models/buildingInterface";
import { filterByBounds, findBuildingBySearchString } from "../src/utils/buildingGeoJsonFilters";
import { apiError } from "./apiError";
import {
  BuildingSourceRegistry,
  getCachedOverpassPathsForBuilding,
  getBuildingSourceDefinition,
} from "./buildingSources";
import { resolveProjectPath } from "./paths";

type BuildingId = string;
type BuildingDefinitions = Record<string, { SEARCH_STRING: string }>;

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
  const buildings = await readFeatureCollection(cachedPaths.buildingsDataPath);
  const indoor = await readFeatureCollection(cachedPaths.indoorDataPath);
  const buildingInterface = findBuildingBySearchString(buildings, buildingDefinition.SEARCH_STRING);

  if (!buildingInterface) {
    throw new Error(
      `Configured building "${buildingDefinition.SEARCH_STRING}" was not found in cached buildings data.`,
    );
  }

  console.log(indoor.features.find(f => f.id == "node/9227302890"))

  return {
    buildingInterface,
    geoJson: filterByBounds(indoor, buildingInterface.boundingBox),
  };
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

async function readFeatureCollection(path: string): Promise<GeoJSON.FeatureCollection> {
  const data = await fs.readFile(resolveProjectPath(path), "utf8");

  return JSON.parse(data) as GeoJSON.FeatureCollection;
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
