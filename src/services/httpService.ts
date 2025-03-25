import { OVERPASS_DATA_URLS } from "../../public/strings/constants.json";
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

function fetchIndoorData() {
  return getOverpassData(OVERPASS_DATA_URLS.INDOOR);
}

function fetchBuildingData() {
  return getOverpassData(OVERPASS_DATA_URLS.BUILDINGS);
}

function getOverpassData(overpassQuery: string) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          const returnValue = JSON.parse(xhr.responseText);
          resolve(returnValue);
        } else if (xhr.status > 400) {
          reject(lang.buildingErrorFetching + xhr.statusText);
        }
      }
    };

    xhr.open("GET", overpassQuery, true);
    xhr.send();
  });
}

export default {
  fetchOverpassData,
  getIndoorData,
  getBuildingData,
};
