import { BuildingInterface } from "../models/buildingInterface";
import { lang } from "./languageService";
import BackendService from "./backendService";
import {
  filterFeaturesByIndoorSearch,
  filterInsideAndLevel,
  findBuildingBySearchString,
} from "../utils/buildingGeoJsonFilters";

function handleSearch(featureCollection: GeoJSON.FeatureCollection, searchString: string): Promise<BuildingInterface> {
  const returnBuilding = findBuildingBySearchString(featureCollection, searchString);

  if (returnBuilding) {
    return Promise.resolve(returnBuilding);
  }

  return Promise.reject(new Error(`${lang.buildingNotFound}: ${searchString}`));
}

function runIndoorSearch(searchString: string): GeoJSON.Feature[] {
  return filterFeaturesByIndoorSearch(getBuildingGeoJSON(), searchString);
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
  filterInsideAndLevel
};
