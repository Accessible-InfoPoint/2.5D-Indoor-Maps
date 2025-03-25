import backendService from "./backendService";

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
    (f.properties.ref && f.properties.ref.toLowerCase().startsWith(s)) || //room number
    (f.properties.indoor && f.properties.indoor.toLowerCase().startsWith(s)) || //type
    (f.properties.amenity && f.properties.amenity.toLowerCase().startsWith(s)) //toilet type
  );
}

function getBuildingGeoJSON(): GeoJSON.FeatureCollection<any> {
  return backendService.getGeoJson();
}

function getBuildingDescription(): string {
  return backendService.getBuildingDescription();
}

export default {
  getBuildingGeoJSON,
  getBuildingDescription,
  runIndoorSearch,
};
