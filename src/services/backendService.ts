import { BuildingInterface } from "../models/buildingInterface";
import BuildingService from "./buildingService";
import HttpService from "./httpService";
import * as BuildingConstantsDefinition from "../../public/strings/buildingConstants.json";
import CoordinateHelpers from "../utils/coordinateHelpers";
import { extractLevels } from "../utils/extractLevels";
import DoorService from "./doorService";
import { BackendSourceEnum } from "../models/backendSourceEnum";
import { isDrawableRoomOrArea } from "../utils/drawableElementFilter";
import {
  BACKEND_SOURCE,
  CURRENT_BUILDING,
} from "../../public/strings/settings.json";

let buildingConstants: Record<string, number>;
let buildingDescription = "";
let geoJson: GeoJSON.FeatureCollection;
const allLevels = new Set<number>();

let buildingInterface: BuildingInterface;

export interface BackendConfig {
  source: BackendSourceEnum,
  building: keyof typeof BuildingConstantsDefinition,
}

const fallbackBackendConfig: BackendConfig = {
  source: BackendSourceEnum.localGeojson,
  building: "apb",
};

const defaultBackendConfig: BackendConfig = {
  source: parseBackendSource(BACKEND_SOURCE),
  building: parseBuildingId(CURRENT_BUILDING),
};

let backendConfig: BackendConfig = { ...defaultBackendConfig };

function parseBackendSource(value: string): BackendSourceEnum {
  if (Object.values(BackendSourceEnum).includes(value as BackendSourceEnum))
    return value as BackendSourceEnum;

  console.warn(`Unknown backend source "${value}", falling back to "${fallbackBackendConfig.source}".`);
  return fallbackBackendConfig.source;
}

function parseBuildingId(value: string): keyof typeof BuildingConstantsDefinition {
  if (value in BuildingConstantsDefinition)
    return value as keyof typeof BuildingConstantsDefinition;

  console.warn(`Unknown building "${value}", falling back to "${fallbackBackendConfig.building}".`);
  return fallbackBackendConfig.building;
}

function configureBackend(config: Partial<BackendConfig>): void {
  backendConfig = {
    ...backendConfig,
    ...config,
  };
}

function resetBackendData(): void {
  buildingConstants = undefined;
  buildingDescription = "";
  geoJson = undefined;
  allLevels.clear();
  buildingInterface = undefined;
  DoorService.clearDoorIndex();
}

async function fetchBackendData(config: Partial<BackendConfig> = {}): Promise<void> {
  configureBackend(config);
  resetBackendData();

  const currentBuilding = backendConfig.building;
  const buildingDefinition = BuildingConstantsDefinition[currentBuilding];

  if (backendConfig.source == BackendSourceEnum.cachedOverpass) {
    await HttpService.fetchOverpassData();

    buildingInterface = await BuildingService.handleSearch(HttpService.getBuildingData(), buildingDefinition.SEARCH_STRING);

    // filter indoor elements by bounds of building
    if (buildingInterface !== undefined) {
      geoJson = BuildingService.filterByBounds(
        HttpService.getIndoorData(),
        buildingInterface.boundingBox
      );
    }
  } else if (backendConfig.source == BackendSourceEnum.localGeojson) {
    const full_geojson = await HttpService.fetchLocalGeojson(currentBuilding);

    buildingInterface = await BuildingService.handleSearch(full_geojson, buildingDefinition.SEARCH_STRING);

    if (buildingInterface !== undefined) {
      geoJson = BuildingService.filterInsideAndLevel(full_geojson);
    }
  }

  console.log("BackendService BuildingInterface", structuredClone(buildingInterface));
  console.log("BackendService GeoJSON", structuredClone(geoJson));

  // rewrite the geojson so that 
  geoJson.features.forEach(
    (feature) => {
      if (!["Polygon", "LineString"].includes(feature.geometry.type)) { // only use geometries for levels that are actually drawn
        return;
      }

      if (feature.properties.level === undefined) {
        console.log("no level: ", feature);
        return;
      }

      const levels = extractLevels(feature.properties.level);
      feature.properties.level = levels;

      levels.forEach(
        (l) => {
          if (!allLevels.has(l))
            console.log("Level " + l + "added by feature", feature);
          allLevels.add(l);
        }
      );
    }
  )

  // initialize doors
  geoJson.features.forEach(
    (feature) => {
      if (feature.geometry.type != "Point")
        return;

      if (!("door" in feature.properties))
        return

      const levels = new Set<number>();
      extractLevels(feature.properties.level ?? "").forEach(l => levels.add(l));
      extractLevels(feature.properties.repeat_on ?? "").forEach(l => levels.add(l));
      DoorService.addDoor(feature.geometry.coordinates, levels, feature.properties);
    }
  )
  // Add rooms to the doors
  geoJson.features.forEach(
    (feature) => {
      if (isDrawableRoomOrArea(feature)) {
        const coords = (feature.geometry as GeoJSON.Polygon).coordinates[0].slice(1);
        for (let i = 0; i < coords.length; i++) {
          const coord = coords.at(i);
          if (DoorService.checkIfDoorExists(coord)) {
            DoorService.addRoomToDoor(coord, feature);
            // to correctly rotate door, it must be in line with previous and next coordinate
            const prev = coords.at(i - 1);
            const after = coords.at((i + 1) % coords.length);
            DoorService.calculateDoorOrientation(coord, prev, after);
          }
        }
      }
    }
  )
  
  // build building description
  if (buildingInterface.feature.properties.name !== undefined) {
    buildingDescription += buildingInterface.feature.properties.name;
  
    if (buildingInterface.feature.properties.loc_ref !== undefined) {
      buildingDescription += " (" + buildingInterface.feature.properties.loc_ref + ")";
    }
  }

  // calculate bearing, take two points and orient the map so that both points have a vertical line and point 1 is below (!!!) point 2
  // Then add BEARING_OFFSET (usually 90deg) rotated counterclockwise, so that the line between the points is horizontal again. (and point 1 is right of point 2)
  const p1 = (
    geoJson.features.find((feature) => feature.id == "node/" + buildingDefinition.BEARING_CALC_NODE1)
    .geometry as GeoJSON.Point
  ).coordinates;
  const p2 = (
    geoJson.features.find((feature) => feature.id == "node/" + buildingDefinition.BEARING_CALC_NODE2)
    .geometry as GeoJSON.Point
  ).coordinates;

  const standardBearing =((
    // angle of the line between the two points
    Math.atan2(
      p2[0] - p1[0],
      // we need to use mercator projection for the latitude
      CoordinateHelpers.lat2y(p2[1]) - CoordinateHelpers.lat2y(p1[1])
    ) * (180 / Math.PI) + buildingDefinition.BEARING_OFFSET
  // angle is between 0 and 360 after calculation (might even be above 360), map camera expects it between -180 and 180
  + 180) % 360) - 180;

  buildingConstants = {
    "standardZoom": buildingDefinition.STANDARD_ZOOM,
    "maxZoom": buildingDefinition.MAX_ZOOM,
    "minZoom": buildingDefinition.MIN_ZOOM,
    "standardBearing": standardBearing,
    "standardBearing3DMode": buildingDefinition.STANDARD_BEARING_3D_MODE,
    "standardPitch3DMode": buildingDefinition.STANDARD_PITCH_3D_MODE,
    "standardZoom3DMode": buildingDefinition.STANDARD_ZOOM_3D_MODE
  }
}

function getOutline(): number[][] {
  return (buildingInterface.feature.geometry as GeoJSON.Polygon).coordinates[0];
}

function getBuildingConstants(): Record<string, number> {
  return buildingConstants;
}

function getBuildingDescription(): string {
  return buildingDescription;
}

function getGeoJson(): GeoJSON.FeatureCollection {
  return geoJson;
}

function getAllLevels(): number[] {
  return Array.from(allLevels).sort((a, b) => -a + b); // reverse order
}

function getBackendConfig(): BackendConfig {
  return { ...backendConfig };
}

function getBoundingBox(): GeoJSON.BBox {
  return [...buildingInterface.boundingBox] as GeoJSON.BBox;
}

export default {
  getOutline,
  getBuildingConstants,
  getBuildingDescription,
  getGeoJson,
  getBoundingBox,
  fetchBackendData,
  getAllLevels,
  configureBackend,
  getBackendConfig,
};
