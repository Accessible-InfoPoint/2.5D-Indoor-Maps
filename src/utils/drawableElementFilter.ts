import { getRequiredFeatureId, getRequiredFeatureProperties } from "./geoJsonHelpers";

export function isDrawableRoomOrArea(feature: GeoJSON.Feature): boolean {
  const properties = getRequiredFeatureProperties(feature);

  return feature.geometry.type == "Polygon" &&
    "indoor" in properties &&
    properties["indoor"] != "pathway" &&
    properties["area"] != "no";
}

export function isVisibleIn3DMode(feature: GeoJSON.Feature, selectedFeatureIds: string[] = []): boolean {
  const properties = getRequiredFeatureProperties(feature);

  return properties["indoor"] == "corridor" ||
  properties["indoor"] == "area" ||
  properties["highway"] == "elevator" ||
  properties["stairs"] == "yes" ||
  selectedFeatureIds.includes(getRequiredFeatureId(feature));
}
