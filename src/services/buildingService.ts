import { BuildingInterface } from "../models/buildingInterface";
import HttpService from "./httpService";
import {
  MAPQUEST_API_KEY,
  NOMINATIM_SERVER,
} from "../../public/strings/constants.json";
import { GeoJsonObject, Position } from "geojson";
import { getArrayDepth } from "../utils/getArrayDepth";
import { lang } from "./languageService";
import { extent} from "geojson-bounds";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { booleanContainsPoint } from "bbox-fns";
import BackendService from "./backendService";
import { getRequiredFeatureId, getRequiredFeatureProperties } from "../utils/geoJsonHelpers";
import { getFeatureLevels } from "../utils/featureLevels";

export interface SearchSuggestion {
  id: string;
  displayName: string;
  levels: number[];
  type: string | undefined;
  feature: GeoJSON.Feature;
}

export interface SuggestionSortContext {
  currentLevel: number;
  selectedFeature?: GeoJSON.Feature;
  infoPointFeature?: GeoJSON.Feature;
}

/**
 * Finding a building by search string:
 * 1) Iterate through all building Features if there is a Feature with the given name. If so, return the building Feature.
 * 2) Otherwise, call Nominatim service to do a more advanced search. Since Nominatim does not return a GeoJSON Feature,
 *    we have to again iterate through all building Features to find the id returned by Nominatim.
 */

/*Search*/
function handleSearch(featureCollection: GeoJSON.FeatureCollection, searchString: string): Promise<BuildingInterface> {
  let returnBuilding: BuildingInterface | undefined;

  const buildings = featureCollection;
  // console.log(buildings)
  const found = buildings.features.some(
    (building: GeoJSON.Feature<any, any>) => {
      const properties = getRequiredFeatureProperties(building);

      if (
        properties.building !== undefined &&
        (
          (properties.name !== undefined && properties.name === searchString) ||
          (properties.loc_ref !== undefined && properties.loc_ref === searchString)
        )
      ) {
        returnBuilding = {
          boundingBox: extent(building),
          feature: building,
        };
        return true;
      }
      return false;
    }
  );

  if (found) {
    if (!returnBuilding) {
      return Promise.reject(new Error(lang.buildingNotFound));
    }

    return Promise.resolve(returnBuilding);
  }

  return nominatimSearch(searchString);
}

function nominatimSearch(searchString: string): Promise<BuildingInterface> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          const nominatimResponse = JSON.parse(xhr.responseText);
          if (
            nominatimResponse.length === 0 ||
            nominatimResponse[0] === undefined
          ) {
            return reject(new Error(lang.buildingNotFound));
          }

          const BBox = nominatimResponse[0]["boundingbox"];
          const buildingFeature = getBuilding(
            nominatimResponse[0]["osm_type"] + "/" + nominatimResponse[0]["osm_id"]
          );

          if (buildingFeature === undefined) {
            return reject(new Error(lang.buildingNotSITconform));
          }

          if (BBox !== undefined) {
            const returnBuilding = {
              boundingBox: BBox,
              feature: buildingFeature,
            };
            return resolve(returnBuilding);
          }

          return reject(new Error());
        } else if (xhr.status > 400) {
          return reject(new Error());
        }
      }
    };

    xhr.open(
      "GET",
      NOMINATIM_SERVER + "?key= " + MAPQUEST_API_KEY + "&format=json&q=" + encodeURIComponent(searchString) + "&addressdetails=0&limit=1",
      true
    );
    xhr.send();
  });
}

function runIndoorSearch(
  searchString: string
): GeoJSON.Feature[] {
  const geoJSON = getBuildingGeoJSON();

  const results = geoJSON.features.filter((f) =>
    filterByString(f, searchString)
  );

  return results;
}

function filterByString(
  f: GeoJSON.Feature,
  searchString: string
) {
  const properties = getRequiredFeatureProperties(f);
  const s = searchString.toLowerCase();

  return (
    (properties.ref?.toLowerCase().startsWith(s)) || //room number
    (properties.indoor?.toLowerCase().startsWith(s)) || //type
    (properties.amenity?.toLowerCase().startsWith(s)) //toilet type
  );
}

const OSM_NAME_ARTIFACTS = new Set([]);
const EXCLUDED_AMENITIES = new Set(["waste_basket"]);

function getValidName(
  p: Record<string, unknown>
): string | undefined {
  const name = p.name;
  if (typeof name !== "string" || OSM_NAME_ARTIFACTS.has(name.toLowerCase())) return undefined;
  return name;
}

function filterForSuggestions(
  f: GeoJSON.Feature,
  searchString: string
): boolean {
  const p = getRequiredFeatureProperties(f);
  if (getFeatureLevels(f).length === 0) return false;
  if (p.amenity && EXCLUDED_AMENITIES.has(String(p.amenity))) return false;
  const s = searchString.toLowerCase();
  return !!(
    getValidName(p)?.toLowerCase().includes(s) ||
    p.ref?.toLowerCase().includes(s) ||
    p.amenity?.toLowerCase().includes(s)
  );
}

function getFeatureCentroid(
  feature: GeoJSON.Feature
): [number, number] | undefined {
  const geom = feature.geometry;
  if (geom.type === "Polygon" && geom.coordinates[0]?.length > 0) {
    const ring = geom.coordinates[0];
    return [
      ring.reduce((s, c) => s + c[0], 0) / ring.length,
      ring.reduce((s, c) => s + c[1], 0) / ring.length,
    ];
  }
  if (geom.type === "LineString" && geom.coordinates.length > 0) {
    const pts = geom.coordinates;
    return [
      pts.reduce((s, c) => s + c[0], 0) / pts.length,
      pts.reduce((s, c) => s + c[1], 0) / pts.length,
    ];
  }
  return undefined;
}

const FIELD_PRIORITY: Record<"name" | "ref" | "amenity", number> = {
  name: 0,
  ref: 1,
  amenity: 2,
};
const QUALITY_TIER_COUNT = 3; // exact, prefix, substring

function matchQuality(value: string | undefined, query: string): number | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase();
  if (v === query) return 0;
  if (v.startsWith(query)) return 1;
  if (v.includes(query)) return 2;
  return undefined;
}

/**
 * Scores a feature's relevance to a search query across its name, ref and
 * amenity fields, then combines them so a better match on a lower-priority
 * field still ranks close to a worse match on a higher-priority field
 * (e.g. an exact ref match ranks just behind a substring name match).
 * Lower is better. Reorder FIELD_PRIORITY to change field precedence.
 */
function matchScore(
  p: Record<string, unknown>,
  validName: string | undefined,
  searchString: string
): number {
  const query = searchString.toLowerCase();
  const fieldValues: Array<[keyof typeof FIELD_PRIORITY, string | undefined]> = [
    ["name", validName],
    ["ref", p.ref as string | undefined],
    ["amenity", p.amenity as string | undefined],
  ];

  const scores = fieldValues
    .map(([field, value]) => {
      const quality = matchQuality(value, query);
      return quality === undefined ? undefined : FIELD_PRIORITY[field] * QUALITY_TIER_COUNT + quality;
    })
    .filter((score): score is number => score !== undefined);

  return Math.min(...scores);
}

function minLevelDistance(
  levels: number[],
  currentLevel: number
): number {
  return Math.min(...levels.map((l) => Math.abs(l - currentLevel)));
}

function searchSuggestions(
  searchString: string,
  context: SuggestionSortContext
): SearchSuggestion[] {
  if (!searchString) return [];
  const geoJSON = getBuildingGeoJSON();
  const suggestions = geoJSON.features
    .filter((f) => filterForSuggestions(f, searchString))
    .map((f) => {
      const p = getRequiredFeatureProperties(f);
      return {
        id: getRequiredFeatureId(f),
        displayName: (getValidName(p) ?? p.ref ?? p.indoor ?? p.amenity ?? "?") as string,
        levels: getFeatureLevels(f),
        type: (p.amenity ?? p.indoor) as string | undefined,
        feature: f,
      };
    });

  const centroids = new Map<string, [number, number] | undefined>(
    suggestions.map((s) => [s.id, getFeatureCentroid(s.feature)])
  );
  const selectedCoords = context.selectedFeature
    ? getFeatureCentroid(context.selectedFeature)
    : undefined;
  const infoCoords = context.infoPointFeature
    ? getFeatureCentroid(context.infoPointFeature)
    : undefined;

  const squaredDist = (a: [number, number], b: [number, number]): number =>
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

  return suggestions.sort((a, b) => {
    const propsA = getRequiredFeatureProperties(a.feature);
    const propsB = getRequiredFeatureProperties(b.feature);
    const matchDiff =
      matchScore(propsA, getValidName(propsA), searchString) -
      matchScore(propsB, getValidName(propsB), searchString);
    if (matchDiff !== 0) return matchDiff;

    const levelDiff = minLevelDistance(a.levels, context.currentLevel) - minLevelDistance(b.levels, context.currentLevel);
    if (levelDiff !== 0) return levelDiff;

    if (selectedCoords) {
      const ca = centroids.get(a.id);
      const cb = centroids.get(b.id);
      if (ca && cb) {
        const diff = squaredDist(ca, selectedCoords) - squaredDist(cb, selectedCoords);
        if (diff !== 0) return diff;
      }
    }

    if (infoCoords) {
      const ca = centroids.get(a.id);
      const cb = centroids.get(b.id);
      if (ca && cb) {
        const diff = squaredDist(ca, infoCoords) - squaredDist(cb, infoCoords);
        if (diff !== 0) return diff;
      }
    }

    return 0;
  });
}

// /*Filter*/
export function filterByBounds(
  geoJSON: GeoJsonObject,
  buildingBBox: Array<number>
): GeoJSON.FeatureCollection<any> {
  const featureCollection = <GeoJSON.FeatureCollection<any>>geoJSON;

  const filteredFeatures = featureCollection.features.filter((f) =>
    doFilterByBounds(f, buildingBBox)
  );

  //create a new object to avoid to original GeoJSON object to be modified
  return {
    type: "FeatureCollection",
    features: filteredFeatures,
  } as GeoJSON.FeatureCollection<any>;
}

function doFilterByBounds(
  feature: GeoJSON.Feature<any>,
  buildingBBox: Array<number>
) {
  const { coordinates } = feature.geometry;

  return checkIfValid(feature) && checkIfInside(coordinates, buildingBBox);
}

function checkIfValid(feature: GeoJSON.Feature<any>): boolean {
  const properties = getRequiredFeatureProperties(feature);

  return !(
    properties.level === undefined
  );
}

function checkIfInside(
  featureCoordinates: Position[][] | Position[] | Position,
  buildingBBox: Array<number>
): boolean {
  switch (getArrayDepth(featureCoordinates)) {
    case 1: {
      featureCoordinates = <Position>featureCoordinates;
      return booleanContainsPoint(buildingBBox, featureCoordinates);
    }
    case 2: {
      featureCoordinates = <Position[]>featureCoordinates;
      return featureCoordinates.some((fc: Position) => {
        return booleanContainsPoint(buildingBBox, fc);
      });
    }
    case 3: {
      featureCoordinates = <Position[][]>featureCoordinates;
      return featureCoordinates.some((fc: Position[]) => {
        return fc.some((fc2: Position) => {
          return booleanContainsPoint(buildingBBox, fc2);
        });
      });
    }
    default:
      return false;
  }
}

function filterInsideAndLevel(featureCollection: GeoJSON.FeatureCollection) {
  const filteredFeatures = featureCollection.features.filter((f) => {
    const properties = getRequiredFeatureProperties(f);

    return ("indoor" in properties && properties.indoor != "no") || "level" in properties;
  });

  //create a new object to avoid to original GeoJSON object to be modified
  return {
    type: "FeatureCollection",
    features: filteredFeatures,
  } as GeoJSON.FeatureCollection<any>;
}

function getBuilding(featureId: string): GeoJSON.Feature<any, any> | undefined {
  //findBuildingFeatureInDataset
  const buildings = HttpService.getBuildingData();
  let foundBuilding: GeoJSON.Feature<any, any> | undefined;

  buildings.features.some((b) => {
    if (getRequiredFeatureId(b) === featureId) {
      foundBuilding = b;
      return true;
    }
    return false;
  });

  return foundBuilding;
}

function getBuildingGeoJSON(): GeoJSON.FeatureCollection<any> {
  return BackendService.getGeoJson();
}

function getBuildingDescription(): string {
  return BackendService.getBuildingDescription();
}

export default {
  getBuildingGeoJSON,
  getBuildingDescription,
  handleSearch,
  runIndoorSearch,
  searchSuggestions,
  filterByBounds,
  filterInsideAndLevel
};
