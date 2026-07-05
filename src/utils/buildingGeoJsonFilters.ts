import { GeoJsonObject, Position } from "geojson";
import { extent } from "geojson-bounds";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { booleanContainsPoint } from "bbox-fns";
import { BuildingInterface } from "../models/buildingInterface";
import { getArrayDepth } from "./getArrayDepth";
import { getRequiredFeatureId, getRequiredFeatureProperties } from "./geoJsonHelpers";

export function findBuildingBySearchString(
  featureCollection: GeoJSON.FeatureCollection,
  searchString: string
): BuildingInterface | undefined {
  const building = featureCollection.features.find((feature) => {
    const properties = getRequiredFeatureProperties(feature);

    return (
      properties.building !== undefined &&
      (
        (properties.name !== undefined && properties.name === searchString) ||
        (properties.loc_ref !== undefined && properties.loc_ref === searchString)
      )
    );
  });

  if (!building) {
    return undefined;
  }

  return {
    boundingBox: extent(building),
    feature: building,
  };
}

export function findFeatureById(
  featureCollection: GeoJSON.FeatureCollection,
  featureId: string
): GeoJSON.Feature | undefined {
  return featureCollection.features.find((feature) => getRequiredFeatureId(feature) === featureId);
}

export function filterFeaturesByIndoorSearch(
  featureCollection: GeoJSON.FeatureCollection,
  searchString: string
): GeoJSON.Feature[] {
  const normalizedSearchString = searchString.toLowerCase();

  return featureCollection.features.filter((feature) =>
    matchesIndoorSearch(feature, normalizedSearchString)
  );
}

export function filterByBounds(
  geoJSON: GeoJsonObject,
  buildingBBox: Array<number>
): GeoJSON.FeatureCollection {
  const featureCollection = geoJSON as GeoJSON.FeatureCollection;

  const filteredFeatures = featureCollection.features.filter((feature) =>
    doFilterByBounds(feature, buildingBBox)
  );

  return {
    type: "FeatureCollection",
    features: filteredFeatures,
  };
}

export function filterInsideAndLevel(featureCollection: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  const filteredFeatures = featureCollection.features.filter((feature) => {
    const properties = getRequiredFeatureProperties(feature);

    return ("indoor" in properties && properties.indoor != "no") || "level" in properties;
  });

  return {
    type: "FeatureCollection",
    features: filteredFeatures,
  };
}

function matchesIndoorSearch(feature: GeoJSON.Feature, normalizedSearchString: string): boolean {
  const properties = getRequiredFeatureProperties(feature);

  return (
    properties.ref?.toLowerCase().startsWith(normalizedSearchString) ||
    properties.indoor?.toLowerCase().startsWith(normalizedSearchString) ||
    properties.amenity?.toLowerCase().startsWith(normalizedSearchString)
  );
}

function doFilterByBounds(
  feature: GeoJSON.Feature,
  buildingBBox: Array<number>
): boolean {
  if (feature.geometry.type === "GeometryCollection") {
    return false;
  }

  const { coordinates } = feature.geometry;

  return checkIfValid(feature) && checkIfInside(coordinates, buildingBBox);
}

function checkIfValid(feature: GeoJSON.Feature): boolean {
  const properties = getRequiredFeatureProperties(feature);

  return properties.level !== undefined;
}

function checkIfInside(
  featureCoordinates: Position[][][] | Position[][] | Position[] | Position,
  buildingBBox: Array<number>
): boolean {
  switch (getArrayDepth(featureCoordinates)) {
    case 1: {
      featureCoordinates = featureCoordinates as Position;
      return booleanContainsPoint(buildingBBox, featureCoordinates);
    }
    case 2: {
      featureCoordinates = featureCoordinates as Position[];
      return featureCoordinates.some((coordinate: Position) => {
        return booleanContainsPoint(buildingBBox, coordinate);
      });
    }
    case 3: {
      featureCoordinates = featureCoordinates as Position[][];
      return featureCoordinates.some((coordinates: Position[]) => {
        return coordinates.some((coordinate: Position) => {
          return booleanContainsPoint(buildingBBox, coordinate);
        });
      });
    }
    default:
      return false;
  }
}
