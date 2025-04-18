import { geoMap } from "../main";

export function isDrawableRoomOrArea(feature: GeoJSON.Feature): boolean {
  return feature.geometry.type == "Polygon" &&
    "indoor" in feature.properties &&
    feature.properties["indoor"] != "pathway" &&
    feature.properties["area"] != "no";
}

export function isVisibleIn3DMode(feature: GeoJSON.Feature): boolean {
  return feature.properties["indoor"] == "corridor" ||
  feature.properties["indoor"] == "area" ||
  feature.properties["highway"] == "elevator" ||
  feature.properties["stairs"] == "yes" ||
  geoMap.selectedFeatures.includes(feature.id.toString());
}