import { extractLevels } from "./extractLevels";
import { getRequiredFeatureProperties } from "./geoJsonHelpers";

export function getFeatureLevels(feature: GeoJSON.Feature): number[] {
  const properties = getRequiredFeatureProperties(feature);
  const levels = [
    ...extractLevels(properties.level),
    ...extractLevels(properties.repeat_on),
  ];

  return Array.from(new Set(levels));
}
