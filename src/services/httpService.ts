import { LOCAL_GEOJSON_DATA_URL } from "../../public/strings/constants.json";
import { BuildingInterface } from "../models/buildingInterface";
import { lang } from "./languageService";

export interface FilteredIndoorDataResponse {
  buildingInterface: BuildingInterface;
  geoJson: GeoJSON.FeatureCollection;
}

function getLocalData<T = GeoJSON.FeatureCollection<any, any>>(overpassQuery: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          const returnValue = JSON.parse(xhr.responseText);
          resolve(returnValue);
        } else if (xhr.status >= 400) {
          reject(new Error(lang.buildingErrorFetching + getErrorMessage(xhr)));
        }
      }
    };
    xhr.onerror = () => {
      reject(new Error(lang.buildingErrorFetching + "Network error"));
    };

    xhr.open("GET", overpassQuery, true);
    xhr.send();
  });
}

function getErrorMessage(xhr: XMLHttpRequest): string {
  try {
    const response = JSON.parse(xhr.responseText) as { error?: unknown };

    if (typeof response.error === "string") {
      return response.error;
    }
  } catch {
    // Fall back to the HTTP status text below.
  }

  return xhr.statusText || `HTTP ${xhr.status}`;
}

function fetchLocalGeojson(geojson_building: string): Promise<GeoJSON.FeatureCollection<any, any>> {
  return getLocalData(LOCAL_GEOJSON_DATA_URL + geojson_building + ".geojson");
}

function fetchFilteredIndoorData(building: string): Promise<FilteredIndoorDataResponse> {
  return getLocalData(`/api/buildings/${encodeURIComponent(building)}/indoor`);
}

export default {
  fetchLocalGeojson,
  fetchFilteredIndoorData,
};
