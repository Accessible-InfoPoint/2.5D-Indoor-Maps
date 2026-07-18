import { BuildingInterface } from "../models/buildingInterface";
import { createIndoorModel, IndoorModel, RawOverpassGraphs } from "../indoor/IndoorModel";
import BuildingService from "./buildingService";
import HttpService, { RawOverpassDataResponse } from "./httpService";
import * as BuildingConstantsDefinition from "../../public/strings/buildingConstants.json";
import CoordinateHelpers from "../utils/coordinateHelpers";
import { extractLevels } from "../utils/extractLevels";
import DoorService from "./doorService";
import { BackendSourceEnum } from "../models/backendSourceEnum";
import { IndoorDataPipelineEnum } from "../models/indoorDataPipelineEnum";
import { isDrawableRoomOrArea } from "../utils/drawableElementFilter";
import { getRequiredFeatureId, getRequiredFeatureProperties } from "../utils/geoJsonHelpers";
import { overpassToGeoJson } from "../utils/overpassToGeoJson";
import { getRequiredArrayValue, getRequiredMatch } from "../utils/requiredHelpers";
import {
  BACKEND_SOURCE,
  CURRENT_BUILDING,
  INDOOR_DATA_PIPELINE,
} from "../../public/strings/settings.json";

export type BuildingCenter = [longitude: number, latitude: number];

export interface BuildingConstants {
  standardZoom: number;
  maxZoom: number;
  minZoom: number;
  standardBearing: number;
  standardBearing3DMode: number;
  standardPitch3DMode: number;
  standardZoom3DMode: number;
  standardCenter?: BuildingCenter;
  standardCenterWheelchairMode?: BuildingCenter;
}

let buildingConstants: BuildingConstants | undefined;
let buildingDescription = "";
let geoJson: GeoJSON.FeatureCollection | undefined;
let rawOverpassData: RawOverpassDataResponse | undefined;
let indoorModel: IndoorModel | undefined;
const allLevels = new Set<number>();

let buildingInterface: BuildingInterface | undefined;

export interface BackendConfig {
  source: BackendSourceEnum;
  indoorDataPipeline: IndoorDataPipelineEnum;
  building: keyof typeof BuildingConstantsDefinition;
}

const fallbackBackendConfig: BackendConfig = {
  source: BackendSourceEnum.localGeojson,
  indoorDataPipeline: IndoorDataPipelineEnum.geoJsonCompatibility,
  building: "apb",
};

const defaultBackendConfig: BackendConfig = {
  source: parseBackendSource(BACKEND_SOURCE),
  indoorDataPipeline: parseIndoorDataPipeline(INDOOR_DATA_PIPELINE),
  building: parseBuildingId(CURRENT_BUILDING),
};

let backendConfig: BackendConfig = { ...defaultBackendConfig };

type BuildingId = keyof typeof BuildingConstantsDefinition;
type BuildingDefinition = (typeof BuildingConstantsDefinition)[BuildingId];
type BuildingDefinitionWithCenters = BuildingDefinition & {
  STANDARD_CENTER?: number[];
  STANDARD_CENTER_WHEELCHAIR_MODE?: number[];
};

interface GeoJsonLoadedBackendData {
  kind: "geoJson";
  buildingInterface: BuildingInterface;
  geoJson: GeoJSON.FeatureCollection;
  rawOverpassData?: RawOverpassDataResponse;
}

interface RawOverpassLoadedBackendData {
  kind: "rawOverpass";
  rawOverpassData: RawOverpassDataResponse;
  indoorModel: IndoorModel;
}

type LoadedBackendData = GeoJsonLoadedBackendData | RawOverpassLoadedBackendData;

function parseBackendSource(value: string): BackendSourceEnum {
  if (Object.values(BackendSourceEnum).includes(value as BackendSourceEnum))
    return value as BackendSourceEnum;

  console.warn(
    `Unknown backend source "${value}", falling back to "${fallbackBackendConfig.source}".`,
  );
  return fallbackBackendConfig.source;
}

function parseIndoorDataPipeline(value: string): IndoorDataPipelineEnum {
  if (Object.values(IndoorDataPipelineEnum).includes(value as IndoorDataPipelineEnum)) {
    return value as IndoorDataPipelineEnum;
  }

  console.warn(
    `Unknown indoor data pipeline "${value}", falling back to "${fallbackBackendConfig.indoorDataPipeline}".`,
  );
  return fallbackBackendConfig.indoorDataPipeline;
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
  rawOverpassData = undefined;
  indoorModel = undefined;
  allLevels.clear();
  buildingInterface = undefined;
  DoorService.clearDoorIndex();
}

async function fetchBackendData(config: Partial<BackendConfig> = {}): Promise<void> {
  configureBackend(config);
  resetBackendData();

  const currentBuilding = backendConfig.building;
  const buildingDefinition = BuildingConstantsDefinition[currentBuilding];
  const loadedData = await loadBackendData(backendConfig, buildingDefinition);

  if (loadedData.kind === "rawOverpass") {
    rawOverpassData = loadedData.rawOverpassData;
    indoorModel = loadedData.indoorModel;
    buildingInterface = indoorModel.buildingInterface;
    buildingDescription = buildBuildingDescription(buildingInterface);
    indoorModel.levels.forEach((level) => allLevels.add(level));
    buildingConstants = buildRawBuildingConstants(indoorModel, buildingDefinition);

    console.log("BackendService BuildingInterface", structuredClone(buildingInterface));
    console.log("BackendService IndoorModel", structuredClone(indoorModel));
    return;
  }

  buildingInterface = loadedData.buildingInterface;
  geoJson = loadedData.geoJson;
  rawOverpassData = loadedData.rawOverpassData;

  console.log("BackendService BuildingInterface", structuredClone(buildingInterface));
  console.log("BackendService GeoJSON", structuredClone(geoJson));

  const indoorGeoJson = getLoadedGeoJson();
  const currentBuildingInterface = getLoadedBuildingInterface();

  normalizeLevelProperties(indoorGeoJson);
  initializeDoors(indoorGeoJson);
  buildingDescription = buildBuildingDescription(currentBuildingInterface);
  buildingConstants = buildBuildingConstants(indoorGeoJson, buildingDefinition);
}

async function loadBackendData(
  config: BackendConfig,
  buildingDefinition: BuildingDefinition,
): Promise<LoadedBackendData> {
  switch (config.source) {
    case BackendSourceEnum.cachedOverpass:
      if (config.indoorDataPipeline === IndoorDataPipelineEnum.rawIndoorModel) {
        return loadRawOverpassData();
      }
      if (config.indoorDataPipeline === IndoorDataPipelineEnum.clientGeoJsonCompatibility) {
        return loadClientGeoJsonCompatibilityData();
      }
      return loadCachedOverpassData();
    case BackendSourceEnum.localGeojson:
      return loadLocalGeoJsonData(config.building, buildingDefinition);
    default:
      throw new Error(`Unsupported backend source "${config.source}".`);
  }
}

async function loadCachedOverpassData(): Promise<LoadedBackendData> {
  return {
    kind: "geoJson",
    ...(await HttpService.fetchFilteredIndoorData(backendConfig.building)),
  };
}

async function loadRawOverpassData(): Promise<LoadedBackendData> {
  const loadedRawOverpassData = await HttpService.fetchRawOverpassData(backendConfig.building);

  return {
    kind: "rawOverpass",
    rawOverpassData: loadedRawOverpassData,
    indoorModel: createIndoorModel(loadedRawOverpassData, loadedRawOverpassData.buildingInterface),
  };
}

async function loadClientGeoJsonCompatibilityData(): Promise<LoadedBackendData> {
  const loadedRawOverpassData = await HttpService.fetchRawOverpassData(backendConfig.building);
  const indoorGeoJson = await overpassToGeoJson(loadedRawOverpassData.indoor);

  return {
    kind: "geoJson",
    buildingInterface: loadedRawOverpassData.buildingInterface,
    geoJson: indoorGeoJson,
    rawOverpassData: loadedRawOverpassData,
  };
}

async function loadLocalGeoJsonData(
  currentBuilding: BuildingId,
  buildingDefinition: BuildingDefinition,
): Promise<LoadedBackendData> {
  const fullGeoJson = await HttpService.fetchLocalGeojson(currentBuilding);
  const loadedBuildingInterface = await BuildingService.handleSearch(
    fullGeoJson,
    buildingDefinition.SEARCH_STRING,
  );

  return {
    kind: "geoJson",
    buildingInterface: loadedBuildingInterface,
    geoJson: BuildingService.filterInsideAndLevel(fullGeoJson),
  };
}

function normalizeLevelProperties(indoorGeoJson: GeoJSON.FeatureCollection): void {
  indoorGeoJson.features.forEach((feature) => {
    const properties = getRequiredFeatureProperties(feature);

    if (!["Polygon", "LineString"].includes(feature.geometry.type)) {
      // only use geometries for levels that are actually drawn
      return;
    }

    if (properties.level === undefined) {
      console.log("no level: ", feature);
      return;
    }

    const levels = extractLevels(properties.level);
    properties.level = levels;

    levels.forEach((l) => {
      if (!allLevels.has(l)) console.log("Level " + l + "added by feature", feature);
      allLevels.add(l);
    });
  });
}

function initializeDoors(indoorGeoJson: GeoJSON.FeatureCollection): void {
  addDoorFeatures(indoorGeoJson);
  connectRoomsToDoors(indoorGeoJson);
}

function addDoorFeatures(indoorGeoJson: GeoJSON.FeatureCollection): void {
  indoorGeoJson.features.forEach((feature) => {
    const properties = getRequiredFeatureProperties(feature);

    if (feature.geometry.type != "Point") return;

    if (!("door" in properties)) return;

    const levels = new Set<number>();
    extractLevels(properties.level ?? "").forEach((l) => levels.add(l));
    extractLevels(properties.repeat_on ?? "").forEach((l) => levels.add(l));
    DoorService.addDoor(feature.geometry.coordinates, levels, properties);
  });
}

function connectRoomsToDoors(indoorGeoJson: GeoJSON.FeatureCollection): void {
  indoorGeoJson.features.forEach((feature) => {
    if (isDrawableRoomOrArea(feature)) connectRoomToDoors(feature);
  });
}

function connectRoomToDoors(feature: GeoJSON.Feature): void {
  const roomLevels = extractLevels(getRequiredFeatureProperties(feature).level);
  const coords = getRequiredArrayValue(
    (feature.geometry as GeoJSON.Polygon).coordinates,
    0,
    "Room coordinates",
  ).slice(1);

  for (let i = 0; i < coords.length; i++) {
    const coord = getRequiredArrayValue(coords, i, "Room coordinates");
    const door = DoorService.findDoorByCoordinate(coord, roomLevels);

    if (door && hasSharedLevel(door.levels, roomLevels)) {
      DoorService.addRoomToDoor(coord, feature, roomLevels);
      // to correctly rotate door, it must be in line with previous and next coordinate
      const prev = getRequiredArrayValue(coords, i - 1, "Room coordinates");
      const after = getRequiredArrayValue(coords, (i + 1) % coords.length, "Room coordinates");
      DoorService.calculateDoorOrientation(coord, prev, after, roomLevels);
    }
  }
}

function hasSharedLevel(doorLevels: Set<number>, roomLevels: number[]): boolean {
  return roomLevels.some((level) => doorLevels.has(level));
}

function buildBuildingDescription(currentBuildingInterface: BuildingInterface): string {
  const buildingProperties = getRequiredFeatureProperties(currentBuildingInterface.feature);

  if (buildingProperties.name === undefined) return "";

  if (buildingProperties.loc_ref !== undefined)
    return buildingProperties.name + " (" + buildingProperties.loc_ref + ")";

  return buildingProperties.name;
}

function buildBuildingConstants(
  indoorGeoJson: GeoJSON.FeatureCollection,
  buildingDefinition: BuildingDefinition,
): BuildingConstants {
  const standardBearing = calculateStandardBearing(indoorGeoJson, buildingDefinition);

  return buildBuildingConstantsFromStandardBearing(standardBearing, buildingDefinition);
}

function buildRawBuildingConstants(
  model: IndoorModel,
  buildingDefinition: BuildingDefinition,
): BuildingConstants {
  const standardBearing = calculateRawStandardBearing(model.graphs, buildingDefinition);

  return buildBuildingConstantsFromStandardBearing(standardBearing, buildingDefinition);
}

function buildBuildingConstantsFromStandardBearing(
  standardBearing: number,
  buildingDefinition: BuildingDefinition,
): BuildingConstants {
  const buildingDefinitionWithCenters = buildingDefinition as BuildingDefinitionWithCenters;

  return {
    standardZoom: buildingDefinition.STANDARD_ZOOM,
    maxZoom: buildingDefinition.MAX_ZOOM,
    minZoom: buildingDefinition.MIN_ZOOM,
    standardBearing: standardBearing,
    standardBearing3DMode: buildingDefinition.STANDARD_BEARING_3D_MODE,
    standardPitch3DMode: buildingDefinition.STANDARD_PITCH_3D_MODE,
    standardZoom3DMode: buildingDefinition.STANDARD_ZOOM_3D_MODE,
    standardCenter: getOptionalBuildingCenter(
      buildingDefinitionWithCenters.STANDARD_CENTER,
      "STANDARD_CENTER",
    ),
    standardCenterWheelchairMode: getOptionalBuildingCenter(
      buildingDefinitionWithCenters.STANDARD_CENTER_WHEELCHAIR_MODE,
      "STANDARD_CENTER_WHEELCHAIR_MODE",
    ),
  };
}

function getOptionalBuildingCenter(
  value: number[] | undefined,
  fieldName: string,
): BuildingCenter | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    !Array.isArray(value) ||
    value.length != 2 ||
    value.some((coordinate) => typeof coordinate != "number")
  ) {
    throw new Error(`${fieldName} must be [longitude, latitude].`);
  }

  return [value[0], value[1]];
}

function calculateStandardBearing(
  indoorGeoJson: GeoJSON.FeatureCollection,
  buildingDefinition: BuildingDefinition,
): number {
  // calculate bearing, take two points and orient the map so that both points have a vertical line and point 1 is below (!!!) point 2
  // Then add BEARING_OFFSET (usually 90deg) rotated counterclockwise, so that the line between the points is horizontal again. (and point 1 is right of point 2)
  const p1 = getBearingCalculationNode(
    indoorGeoJson,
    buildingDefinition.BEARING_CALC_NODE1,
    "Bearing calculation node 1",
  );
  const p2 = getBearingCalculationNode(
    indoorGeoJson,
    buildingDefinition.BEARING_CALC_NODE2,
    "Bearing calculation node 2",
  );

  return (
    // angle of the line between the two points
    ((Math.atan2(
      p2[0] - p1[0],
      // we need to use mercator projection for the latitude
      CoordinateHelpers.lat2y(p2[1]) - CoordinateHelpers.lat2y(p1[1]),
    ) *
      (180 / Math.PI) +
      buildingDefinition.BEARING_OFFSET +
      // angle is between 0 and 360 after calculation (might even be above 360), map camera expects it between -180 and 180
      180) %
      360) -
    180
  );
}

function getBearingCalculationNode(
  indoorGeoJson: GeoJSON.FeatureCollection,
  nodeId: number | string,
  label: string,
): GeoJSON.Position {
  return (
    getRequiredMatch(
      indoorGeoJson.features.find((feature) => getRequiredFeatureId(feature) == "node/" + nodeId),
      label,
    ).geometry as GeoJSON.Point
  ).coordinates;
}

function calculateRawStandardBearing(
  graphs: RawOverpassGraphs,
  buildingDefinition: BuildingDefinition,
): number {
  const p1 = getRawBearingCalculationNode(
    graphs,
    buildingDefinition.BEARING_CALC_NODE1,
    "Bearing calculation node 1",
  );
  const p2 = getRawBearingCalculationNode(
    graphs,
    buildingDefinition.BEARING_CALC_NODE2,
    "Bearing calculation node 2",
  );

  return (
    ((Math.atan2(p2[0] - p1[0], CoordinateHelpers.lat2y(p2[1]) - CoordinateHelpers.lat2y(p1[1])) *
      (180 / Math.PI) +
      buildingDefinition.BEARING_OFFSET +
      180) %
      360) -
    180
  );
}

function getRawBearingCalculationNode(
  graphs: RawOverpassGraphs,
  nodeId: number | string,
  label: string,
): GeoJSON.Position {
  const node = getRequiredMatch(graphs.indoor.getNode(nodeId), label);

  return [node.lon, node.lat];
}

function getOutline(): number[][] {
  if (indoorModel !== undefined) {
    return indoorModel.outlineCoordinates;
  }

  return getRequiredArrayValue(
    (getLoadedBuildingInterface().feature.geometry as GeoJSON.Polygon).coordinates,
    0,
    "Building outline coordinates",
  );
}

function getBuildingConstants(): BuildingConstants {
  if (buildingConstants === undefined) {
    throw new Error("Building constants have not been loaded.");
  }

  return buildingConstants;
}

function getBuildingDescription(): string {
  return buildingDescription;
}

function getGeoJson(): GeoJSON.FeatureCollection {
  return getLoadedGeoJson();
}

function getAllLevels(): number[] {
  return Array.from(allLevels).sort((a, b) => -a + b); // reverse order
}

function getBackendConfig(): BackendConfig {
  return { ...backendConfig };
}

function getBoundingBox(): GeoJSON.BBox {
  return [...getLoadedBuildingInterface().boundingBox] as GeoJSON.BBox;
}

function getLoadedGeoJson(): GeoJSON.FeatureCollection {
  if (geoJson === undefined) {
    throw new Error("Indoor GeoJSON has not been loaded.");
  }

  return geoJson;
}

function getRawOverpassData(): RawOverpassDataResponse {
  if (rawOverpassData === undefined) {
    throw new Error("Raw Overpass data has not been loaded.");
  }

  return rawOverpassData;
}

function getIndoorModel(): IndoorModel {
  if (indoorModel === undefined) {
    throw new Error("Indoor model has not been loaded.");
  }

  return indoorModel;
}

function getRawOverpassGraphs(): RawOverpassGraphs {
  return getIndoorModel().graphs;
}

function getLoadedBuildingInterface(): BuildingInterface {
  if (buildingInterface === undefined) {
    throw new Error("Building interface has not been loaded.");
  }

  return buildingInterface;
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
  getRawOverpassData,
  getIndoorModel,
  getRawOverpassGraphs,
};
