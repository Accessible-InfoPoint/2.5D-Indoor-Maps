export type RequiredGeoJsonProperties = NonNullable<GeoJSON.GeoJsonProperties>;

export function getRequiredFeatureProperties(
  feature: GeoJSON.Feature,
  context = "GeoJSON feature",
): RequiredGeoJsonProperties {
  if (!feature.properties) {
    throw new Error(`${context} is missing properties.`);
  }

  return feature.properties;
}

export function getRequiredFeatureId(
  feature: GeoJSON.Feature,
  context = "GeoJSON feature",
): string {
  if (feature.id === undefined || feature.id === null) {
    throw new Error(`${context} is missing an id.`);
  }

  return feature.id.toString();
}
