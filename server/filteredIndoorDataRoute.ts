import fs from "node:fs/promises";
import * as BuildingConstantsDefinition from "../public/strings/buildingConstants.json";
import { BuildingInterface } from "../src/models/buildingInterface";
import {
  filterByBounds,
  findBuildingBySearchString,
} from "../src/utils/buildingGeoJsonFilters";
import { resolveProjectPath } from "./paths";

const BUILDINGS_DATA_PATH = "public/overpass/buildings.json";
const INDOOR_DATA_PATH = "public/overpass/indoor.json";

type BuildingId = keyof typeof BuildingConstantsDefinition;

interface FilteredIndoorDataResponse {
  buildingInterface: BuildingInterface;
  geoJson: GeoJSON.FeatureCollection;
}

export function registerFilteredIndoorDataRoute(app: any): void {
  app.get("/api/buildings/:building/indoor", async (request: RouteRequest, response: RouteResponse) => {
    try {
      const building = request.params.building;

      if (!isBuildingId(building)) {
        response.status(404).json({ error: `Unknown building "${building}".` });
        return;
      }

      response.json(await loadFilteredIndoorData(building));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown server error.";
      response.status(500).json({ error: message });
    }
  });
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

async function loadFilteredIndoorData(building: BuildingId): Promise<FilteredIndoorDataResponse> {
  const buildingDefinition = BuildingConstantsDefinition[building];
  const buildings = await readFeatureCollection(BUILDINGS_DATA_PATH);
  const indoor = await readFeatureCollection(INDOOR_DATA_PATH);
  const buildingInterface = findBuildingBySearchString(
    buildings,
    buildingDefinition.SEARCH_STRING
  );

  if (!buildingInterface) {
    throw new Error(`Configured building "${buildingDefinition.SEARCH_STRING}" was not found in cached buildings data.`);
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

function isBuildingId(value: string): value is BuildingId {
  return value in BuildingConstantsDefinition;
}
