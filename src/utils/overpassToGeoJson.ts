import { OverpassJson } from "../models/overpassJson";

export async function overpassToGeoJson(
  overpassJson: OverpassJson,
): Promise<GeoJSON.FeatureCollection> {
  const { default: osm2geojson } = await import("osm2geojson-ultra");
  const geoJson = osm2geojson(overpassJson);

  if (geoJson?.type !== "FeatureCollection") {
    throw new Error("OSM conversion did not produce a GeoJSON FeatureCollection.");
  }

  return geoJson;
}
