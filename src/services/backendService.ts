import { BuildingInterface } from "../models/buildingInterface";
import { createIndoorModel, IndoorModel, OsmGraph } from "../indoor";
import HttpService, { RawOverpassDataResponse } from "./httpService";
import * as BuildingConstantsDefinition from "../../public/strings/buildingConstants.json";
import CoordinateHelpers from "../utils/coordinateHelpers";
import { BackendSourceEnum } from "../models/backendSourceEnum";
import { IndoorDataPipelineEnum } from "../models/indoorDataPipelineEnum";
import { getRequiredMatch } from "../utils/requiredHelpers";
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
  source: BackendSourceEnum.cachedOverpass,
  indoorDataPipeline: IndoorDataPipelineEnum.rawIndoorModel,
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

interface RawOverpassLoadedBackendData {
  kind: "rawOverpass";
  rawOverpassData: RawOverpassDataResponse;
  indoorModel: IndoorModel;
}

type LoadedBackendData = RawOverpassLoadedBackendData;

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
  rawOverpassData = undefined;
  indoorModel = undefined;
  allLevels.clear();
  buildingInterface = undefined;
}

async function fetchBackendData(config: Partial<BackendConfig> = {}): Promise<void> {
  configureBackend(config);
  resetBackendData();

  const currentBuilding = backendConfig.building;
  const buildingDefinition = BuildingConstantsDefinition[currentBuilding];
  const loadedData = await loadBackendData(backendConfig);

  rawOverpassData = loadedData.rawOverpassData;
  indoorModel = loadedData.indoorModel;
  buildingInterface = rawOverpassData.buildingInterface;
  buildingDescription = buildBuildingDescription(buildingInterface);
  indoorModel.levels.forEach((level) => allLevels.add(level));
  buildingConstants = buildRawBuildingConstants(indoorModel, buildingDefinition);

  console.log("BackendService BuildingInterface", structuredClone(buildingInterface));
  console.log("BackendService IndoorModel", structuredClone(indoorModel));
}

async function loadBackendData(config: BackendConfig): Promise<LoadedBackendData> {
  switch (config.source) {
    case BackendSourceEnum.cachedOverpass:
      return loadRawOverpassData();
    default:
      throw new Error(`Unsupported backend source "${config.source}".`);
  }
}

async function loadRawOverpassData(): Promise<LoadedBackendData> {
  const loadedRawOverpassData = await HttpService.fetchRawOverpassData(backendConfig.building);

  return {
    kind: "rawOverpass",
    rawOverpassData: loadedRawOverpassData,
    indoorModel: createIndoorModel(loadedRawOverpassData.indoor),
  };
}

function buildBuildingDescription(currentBuildingInterface: BuildingInterface): string {
  const buildingProperties = currentBuildingInterface.tags;
  const name = buildingProperties.name;
  const locRef = buildingProperties.loc_ref;

  if (typeof name !== "string") return "";

  if (typeof locRef === "string") return name + " (" + locRef + ")";

  return name;
}

function buildRawBuildingConstants(
  model: IndoorModel,
  buildingDefinition: BuildingDefinition,
): BuildingConstants {
  const standardBearing = calculateRawStandardBearing(model.graph, buildingDefinition);

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

function calculateRawStandardBearing(
  graph: OsmGraph,
  buildingDefinition: BuildingDefinition,
): number {
  const p1 = getRawBearingCalculationNode(
    graph,
    buildingDefinition.BEARING_CALC_NODE1,
    "Bearing calculation node 1",
  );
  const p2 = getRawBearingCalculationNode(
    graph,
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
  graph: OsmGraph,
  nodeId: number | string,
  label: string,
): GeoJSON.Position {
  const node = getRequiredMatch(graph.getNode(nodeId), label);

  return [node.lon, node.lat];
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

function getAllLevels(): number[] {
  return Array.from(allLevels).sort((a, b) => -a + b); // reverse order
}

function getLevelLabel(level: number): string {
  return indoorModel?.levelLabels.get(level) ?? level.toString();
}

function getBackendConfig(): BackendConfig {
  return { ...backendConfig };
}

function getBoundingBox(): GeoJSON.BBox {
  return [...getLoadedBuildingInterface().boundingBox] as GeoJSON.BBox;
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

function getRawOverpassGraph(): OsmGraph {
  return getIndoorModel().graph;
}

function getBuildingInterface(): BuildingInterface {
  return getLoadedBuildingInterface();
}

function getLoadedBuildingInterface(): BuildingInterface {
  if (buildingInterface === undefined) {
    throw new Error("Building interface has not been loaded.");
  }

  return buildingInterface;
}

export default {
  getBuildingInterface,
  getBuildingConstants,
  getBuildingDescription,
  getBoundingBox,
  fetchBackendData,
  getAllLevels,
  getLevelLabel,
  configureBackend,
  getBackendConfig,
  getRawOverpassData,
  getIndoorModel,
  getRawOverpassGraph,
};
