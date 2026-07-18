import { OverpassJson } from "../models/overpassJson";

interface Osm2GeoJsonObject {
  refCount: number;
  hasTag: boolean;
  toFeature: () => GeoJSON.Feature | undefined;
}

export async function overpassToGeoJson(
  overpassJson: OverpassJson,
): Promise<GeoJSON.FeatureCollection> {
  const [{ default: analyzeFeaturesFromJson }, { RefElements }] = await Promise.all([
    import("osm2geojson-ultra/dist/json.js"),
    import("osm2geojson-ultra/dist/ref-elements.js"),
  ]);
  const refElements = new RefElements();
  const features: GeoJSON.Feature[] = [];

  analyzeFeaturesFromJson(overpassJson, refElements);
  refElements.bindAll();

  for (const value of refElements.values()) {
    const osmObject = value as Osm2GeoJsonObject;

    if (osmObject.refCount > 0 && !osmObject.hasTag) {
      continue;
    }

    const feature = osmObject.toFeature();

    if (feature !== undefined) {
      features.push(feature);
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}
