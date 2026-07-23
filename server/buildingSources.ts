import { createHash } from "node:crypto";
import * as BuildingSourcesDefinition from "../public/strings/buildingSources.json";
import { OVERPASS_API_URL } from "./constants";

export interface BuildingSourceRegistry {
  sources: Record<string, BuildingSourceDefinition>;
  buildings: Record<string, BuildingSourceBuildingDefinition>;
}

export type BuildingSourceId = string;
export type BuildingSourceBuildingId = string;

export interface OverpassResource {
  label: string;
  url: string;
  dest: string;
  query: string;
  queryHash: string;
}

export interface CachedOverpassPaths {
  buildingsDataPath: string;
  indoorDataPath: string;
}

export interface BuildingSourceDefinition {
  label: string;
  region:
    | {
        type: "area";
        name: string;
      }
    | {
        type: "bbox";
        bbox: [west: number, south: number, east: number, north: number];
      };
}

export interface BuildingSourceBuildingDefinition {
  source: string;
  buildingTags: Record<string, string>;
}

const defaultBuildingSources = BuildingSourcesDefinition as unknown as BuildingSourceRegistry;

export function getBuildingSources(): BuildingSourceRegistry {
  return defaultBuildingSources;
}

export function getBuildingSourceId(
  building: string,
  registry: BuildingSourceRegistry = defaultBuildingSources,
): BuildingSourceId {
  const buildingSource = getBuildingSourceDefinition(building, registry);
  return buildingSource.source as BuildingSourceId;
}

export function getCachedOverpassPathsForBuilding(
  building: string,
  registry: BuildingSourceRegistry = defaultBuildingSources,
): CachedOverpassPaths {
  const sourceId = getBuildingSourceId(building, registry);

  return getCachedOverpassPathsForSource(sourceId);
}

export function getCachedOverpassPathsForSource(sourceId: string): CachedOverpassPaths {
  return {
    buildingsDataPath: `public/overpass/${sourceId}/buildings.json`,
    indoorDataPath: `public/overpass/${sourceId}/indoor.json`,
  };
}

export function getOverpassResourcesForBuilding(
  building: string,
  registry: BuildingSourceRegistry = defaultBuildingSources,
): OverpassResource[] {
  const sourceId = getBuildingSourceId(building, registry);
  const source = getSourceDefinition(sourceId, registry);
  const paths = getCachedOverpassPathsForSource(sourceId);
  const buildingQuery = buildBuildingsQuery(source);
  const indoorQuery = buildIndoorQuery(source);

  return [
    createResource({
      label: `${source.label} buildings`,
      dest: paths.buildingsDataPath,
      query: buildingQuery,
    }),
    createResource({
      label: `${source.label} indoor data`,
      dest: paths.indoorDataPath,
      query: indoorQuery,
    }),
  ];
}

export function getBuildingSourceDefinition(
  building: string,
  registry: BuildingSourceRegistry = defaultBuildingSources,
): BuildingSourceBuildingDefinition {
  const buildingSource = registry.buildings[building];

  if (buildingSource === undefined) {
    throw new Error(`Building "${building}" has no Overpass source configuration.`);
  }

  return buildingSource;
}

export function getSourceDefinition(
  sourceId: string,
  registry: BuildingSourceRegistry = defaultBuildingSources,
): BuildingSourceDefinition {
  const source = registry.sources[sourceId];

  if (source === undefined) {
    throw new Error(`Unknown Overpass source "${sourceId}".`);
  }

  return source;
}

export function matchesBuildingTags(
  properties: Record<string, unknown> | null | undefined,
  buildingTags: Record<string, string>,
): boolean {
  if (properties === null || properties === undefined) {
    return false;
  }

  return Object.entries(buildingTags).every(([key, value]) => properties[key] === value);
}

function createResource({
  label,
  dest,
  query,
}: {
  label: string;
  dest: string;
  query: string;
}): OverpassResource {
  return {
    label,
    dest,
    query,
    queryHash: hashQuery(query),
    url: OVERPASS_API_URL + encodeURIComponent(query),
  };
}

function buildBuildingsQuery(source: BuildingSourceDefinition): string {
  return [
    "[out:json];",
    buildRegionStatement(source),
    `(${buildRegionSelector('nwr["building"]["min_level"]', source)};);`,
    "(._;>;);",
    "out;",
  ].join("");
}

function buildIndoorQuery(source: BuildingSourceDefinition): string {
  const indoorSelector = buildRegionSelector('nwr["indoor"]', source);
  const levelSelector = buildRegionSelector('nwr["level"]', source);
  const nonSitBuildingSelector = buildRegionSelector('nwr["building"][!"min_level"]', source);

  return [
    "[out:json];",
    buildRegionStatement(source),
    `((${indoorSelector};${levelSelector};);-${nonSitBuildingSelector};);`,
    "(._;>;);",
    "out;",
  ].join("");
}

function buildRegionStatement(source: BuildingSourceDefinition): string {
  if (source.region.type === "area") {
    return `area["name"="${escapeOverpassValue(source.region.name)}"]->.searchArea;`;
  } // No need for bbox, as that is handled directly in buildRegionSelector

  return "";
}

function buildRegionSelector(selector: string, source: BuildingSourceDefinition): string {
  if (source.region.type === "area") {
    return `${selector}(area.searchArea)`;
  }

  const [west, south, east, north] = source.region.bbox;
  return `${selector}(${south},${west},${north},${east})`;
}

function escapeOverpassValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function hashQuery(query: string): string {
  return createHash("sha256").update(query).digest("hex");
}
