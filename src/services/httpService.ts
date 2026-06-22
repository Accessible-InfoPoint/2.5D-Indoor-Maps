import { OVERPASS_DATA_URLS, LOCAL_GEOJSON_DATA_URL } from "../../public/strings/constants.json";
import { lang } from "./languageService";

let indoorDataGeoJSON: GeoJSON.FeatureCollection<any, any>;
let buildingDataGeoJSON: GeoJSON.FeatureCollection<any, any>;

function fetchOverpassData(): Promise<boolean> {
  return Promise.all([fetchIndoorData(), fetchBuildingData()]).then(
    (
      values: [
        GeoJSON.FeatureCollection<any, any>,
        GeoJSON.FeatureCollection<any, any>
      ]
    ) => {
      indoorDataGeoJSON = values[0];
      buildingDataGeoJSON = values[1];
    //   console.log(buildingDataGeoJSON);
      return true;
    }
  );
}

function getIndoorData(): GeoJSON.FeatureCollection<any, any> {
  return indoorDataGeoJSON;
}

function getBuildingData(): GeoJSON.FeatureCollection<any, any> {
  return buildingDataGeoJSON;
}

function fetchIndoorData(): Promise<GeoJSON.FeatureCollection<any, any>> {
  return getLocalData(OVERPASS_DATA_URLS.INDOOR);
}

function fetchBuildingData(): Promise<GeoJSON.FeatureCollection<any, any>> {
  return getLocalData(OVERPASS_DATA_URLS.BUILDINGS);
}

function getLocalData(overpassQuery: string): Promise<GeoJSON.FeatureCollection<any, any>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          const returnValue = JSON.parse(xhr.responseText);
          resolve(returnValue);
        } else if (xhr.status > 400) {
          reject(new Error(lang.buildingErrorFetching + xhr.statusText));
        }
      }
    };

    xhr.open("GET", overpassQuery, true);
    xhr.send();
  });
}

function fetchLocalGeojson(geojson_building: string): Promise<GeoJSON.FeatureCollection<any, any>> {
  return getLocalData(LOCAL_GEOJSON_DATA_URL + geojson_building + ".geojson");
}

export default {
  fetchOverpassData,
  getIndoorData,
  getBuildingData,
  fetchLocalGeojson,
};
