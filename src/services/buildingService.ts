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

/**
 * Finding a building by search string:
 * 1) Iterate through all building Features if there is a Feature with the given name. If so, return the building Feature.
 * 2) Otherwise, call Nominatim service to do a more advanced search. Since Nominatim does not return a GeoJSON Feature,
 *    we have to again iterate through all building Features to find the id returned by Nominatim.
 */

/*Search*/
function handleSearch(featureCollection: GeoJSON.FeatureCollection, searchString: string): Promise<BuildingInterface> {
  let returnBuilding: BuildingInterface;

  const buildings = featureCollection;
  // console.log(buildings)
  const found = buildings.features.some(
    (building: GeoJSON.Feature<any, any>) => {
      if (
        building.properties.building !== undefined &&
        (
          (building.properties.name !== undefined && building.properties.name === searchString) ||
          (building.properties.loc_ref !== undefined && building.properties.loc_ref === searchString)
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

          if (buildingFeature === null) {
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

function runIndoorSearch(searchString: string): GeoJSON.Feature[] {
  const geoJSON = getBuildingGeoJSON();

  const results = geoJSON.features.filter((f) =>
    filterByString(f, searchString)
  );

  return results;
}

function filterByString(f: GeoJSON.Feature, searchString: string) {
  const s = searchString.toLowerCase();
  return (
    (f.properties.ref?.toLowerCase().startsWith(s)) || //room number
    (f.properties.indoor?.toLowerCase().startsWith(s)) || //type
    (f.properties.amenity?.toLowerCase().startsWith(s)) //toilet type
  );
}

// /*Filter*/
export function filterByBounds(
  geoJSON: GeoJsonObject,
  buildingBBox: Array<number>
): GeoJSON.FeatureCollection<any> {
  const featureCollection = <GeoJSON.FeatureCollection<any>>geoJSON;

  if (buildingBBox === null) {
    return null;
  }

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
  return !(
    feature.properties === undefined || feature.properties.level === undefined
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
  }
}

function filterInsideAndLevel(featureCollection: GeoJSON.FeatureCollection) {
  const filteredFeatures = featureCollection.features.filter((f) =>
    ("indoor" in f.properties && f.properties.indoor != "no") || "level" in f.properties
  );

  //create a new object to avoid to original GeoJSON object to be modified
  return {
    type: "FeatureCollection",
    features: filteredFeatures,
  } as GeoJSON.FeatureCollection<any>;
}

function getBuilding(featureId: string): GeoJSON.Feature<any, any> {
  //findBuildingFeatureInDataset
  const buildings = HttpService.getBuildingData();
  let foundBuilding: GeoJSON.Feature<any, any> = null;

  buildings.features.some((b) => {
    if (b.id === featureId) {
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
  filterByBounds,
  filterInsideAndLevel
};