import fs from "node:fs/promises";
import * as BuildingConstantsDefinition from "../public/strings/buildingConstants.json";
import { BuildingInterface } from "../src/models/buildingInterface";
import { filterByBounds, findBuildingBySearchString } from "../src/utils/buildingGeoJsonFilters";
import { apiError } from "./apiError";
import { resolveProjectPath } from "./paths";

const BUILDINGS_DATA_PATH = "public/overpass/buildings.json";
const INDOOR_DATA_PATH = "public/overpass/indoor.json";

type BuildingId = string;
type BuildingDefinitions = Record<string, { SEARCH_STRING: string }>;

export interface FilteredIndoorDataRouteOptions {
  buildingsDataPath?: string;
  indoorDataPath?: string;
  buildingDefinitions?: BuildingDefinitions;
}

interface FilteredIndoorDataResponse {
  buildingInterface: BuildingInterface;
  geoJson: GeoJSON.FeatureCollection;
}

interface RouteApp {
  get(
    path: string,
    handler: (request: RouteRequest, response: RouteResponse) => Promise<void>,
  ): void;
}

export function registerFilteredIndoorDataRoute(
  app: RouteApp,
  options: FilteredIndoorDataRouteOptions = {},
): void {
  const routeOptions = normalizeRouteOptions(options);

  app.get(
    "/api/buildings/:building/indoor",
    async (request: RouteRequest, response: RouteResponse) => {
      try {
        const building = request.params.building;

        if (!isBuildingId(building, routeOptions.buildingDefinitions)) {
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

interface RouteRequest {
  params: {
    building: string;
  };
}

interface RouteResponse {
  status: (statusCode: number) => RouteResponse;
  json: (body: unknown) => void;
}

interface NormalizedFilteredIndoorDataRouteOptions {
  buildingsDataPath: string;
  indoorDataPath: string;
  buildingDefinitions: BuildingDefinitions;
}

function normalizeRouteOptions(
  options: FilteredIndoorDataRouteOptions,
): NormalizedFilteredIndoorDataRouteOptions {
  return {
    buildingsDataPath: options.buildingsDataPath ?? BUILDINGS_DATA_PATH,
    indoorDataPath: options.indoorDataPath ?? INDOOR_DATA_PATH,
    buildingDefinitions:
      options.buildingDefinitions ?? (BuildingConstantsDefinition as BuildingDefinitions),
  };
}

async function loadFilteredIndoorData(
  building: BuildingId,
  options: NormalizedFilteredIndoorDataRouteOptions,
): Promise<FilteredIndoorDataResponse> {
  const buildingDefinition = options.buildingDefinitions[building];
  const buildings = await readFeatureCollection(options.buildingsDataPath);
  const indoor = await readFeatureCollection(options.indoorDataPath);
  const buildingInterface = findBuildingBySearchString(buildings, buildingDefinition.SEARCH_STRING);

  if (!buildingInterface) {
    throw new Error(
      `Configured building "${buildingDefinition.SEARCH_STRING}" was not found in cached buildings data.`,
    );
  }

  return {
    buildingInterface,
    geoJson: filterByBounds(indoor, buildingInterface.boundingBox),
  };
}

async function readFeatureCollection(path: string): Promise<GeoJSON.FeatureCollection> {
  const data = await fs.readFile(resolveProjectPath(path), "utf8");

  return JSON.parse(data) as GeoJSON.FeatureCollection;
}

function isBuildingId(
  value: string,
  buildingDefinitions: BuildingDefinitions,
): value is BuildingId {
  return value in buildingDefinitions;
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
