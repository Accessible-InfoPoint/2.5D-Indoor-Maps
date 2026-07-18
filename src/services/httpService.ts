import { LOCAL_GEOJSON_DATA_URL } from "../../public/strings/constants.json";
import { BuildingInterface } from "../models/buildingInterface";
import { OverpassJson } from "../models/overpassJson";
import { lang } from "./languageService";

export interface FilteredIndoorDataResponse {
  buildingInterface: BuildingInterface;
  geoJson: GeoJSON.FeatureCollection;
}

export interface RawOverpassDataResponse {
  buildings: OverpassJson;
  indoor: OverpassJson;
}

interface ApiErrorResponse {
  error?:
    | string
    | {
        code?: unknown;
        message?: unknown;
        details?: unknown;
      };
}

export class HttpRequestError extends Error {
  readonly url: string;
  readonly status: number;
  readonly statusText: string;
  readonly responseBody: unknown;

  constructor(url: string, xhr: XMLHttpRequest, message: string, responseBody: unknown) {
    super(lang.buildingErrorFetching + message);
    this.name = "HttpRequestError";
    this.url = url;
    this.status = xhr.status;
    this.statusText = xhr.statusText;
    this.responseBody = responseBody;
  }
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
          const parsedResponse = parseResponseBody(xhr.responseText);
          reject(
            new HttpRequestError(
              overpassQuery,
              xhr,
              getErrorMessage(xhr, parsedResponse),
              parsedResponse,
            ),
          );
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

function parseResponseBody(responseText: string): unknown {
  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
}

function getErrorMessage(xhr: XMLHttpRequest, responseBody: unknown): string {
  const response = responseBody as ApiErrorResponse;

  if (typeof response?.error === "string") {
    return response.error;
  }

  if (
    typeof response?.error === "object" &&
    response.error !== null &&
    typeof response.error.message === "string"
  ) {
    return response.error.message;
  }

  return xhr.statusText || `HTTP ${xhr.status}`;
}

function fetchLocalGeojson(geojson_building: string): Promise<GeoJSON.FeatureCollection<any, any>> {
  return getLocalData(LOCAL_GEOJSON_DATA_URL + geojson_building + ".geojson");
}

function fetchFilteredIndoorData(building: string): Promise<FilteredIndoorDataResponse> {
  return getLocalData(`/api/buildings/${encodeURIComponent(building)}/indoor`);
}

function fetchRawOverpassData(building: string): Promise<RawOverpassDataResponse> {
  return getLocalData(`/api/buildings/${encodeURIComponent(building)}/overpass`);
}

export default {
  fetchLocalGeojson,
  fetchFilteredIndoorData,
  fetchRawOverpassData,
};
