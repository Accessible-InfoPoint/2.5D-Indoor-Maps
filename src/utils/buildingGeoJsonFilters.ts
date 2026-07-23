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
  searchString: string,
): BuildingInterface | undefined {
  const building = featureCollection.features.find((feature) => {
    const properties = getRequiredFeatureProperties(feature);

    return (
      properties.building !== undefined &&
      ((properties.name !== undefined && properties.name === searchString) ||
        (properties.loc_ref !== undefined && properties.loc_ref === searchString))
    );
  });

  if (!building) {
    return undefined;
  }

  return createBuildingInterfaceFromFeature(building);
}

export function createBuildingInterfaceFromFeature(feature: GeoJSON.Feature): BuildingInterface {
  return {
    id: getRequiredFeatureId(feature),
    tags: { ...getRequiredFeatureProperties(feature) },
    boundingBox: extent(feature),
    outlineGeometry: getBuildingOutlineGeometry(feature),
  };
}

export interface FilterByBoundsOptions {
  bearingNodeIds?: Array<number | string>;
}

export function filterByBoundsOrBearingNode(
  geoJSON: GeoJsonObject,
  buildingBBox: Array<number>,
  options: FilterByBoundsOptions = {},
): GeoJSON.FeatureCollection {
  const featureCollection = geoJSON as GeoJSON.FeatureCollection;
  const bearingNodeIds = new Set((options.bearingNodeIds ?? []).map(normalizeBearingNodeId));

  const filteredFeatures = featureCollection.features.filter((feature) =>
    doFilterByBoundsOrBearingNode(feature, buildingBBox, bearingNodeIds),
  );

  return {
    type: "FeatureCollection",
    features: filteredFeatures,
  };
}

export function filterInsideAndLevel(
  featureCollection: GeoJSON.FeatureCollection,
): GeoJSON.FeatureCollection {
  const filteredFeatures = featureCollection.features.filter((feature) => {
    const properties = getRequiredFeatureProperties(feature);

    return ("indoor" in properties && properties.indoor != "no") || "level" in properties;
  });

  return {
    type: "FeatureCollection",
    features: filteredFeatures,
  };
}

function getBuildingOutlineGeometry(
  feature: GeoJSON.Feature,
): GeoJSON.Polygon | GeoJSON.MultiPolygon {
  if (feature.geometry.type !== "Polygon" && feature.geometry.type !== "MultiPolygon") {
    throw new Error(
      `Building feature "${getRequiredFeatureId(feature)}" must have polygon geometry.`,
    );
  }

  return feature.geometry;
}

function doFilterByBoundsOrBearingNode(
  feature: GeoJSON.Feature,
  buildingBBox: Array<number>,
  bearingNodeIds: Set<string>,
): boolean {
  if (checkIfBearingNode(feature, bearingNodeIds)) {
    return true;
  }

  if (feature.geometry.type === "GeometryCollection") {
    return false;
  }

  const { coordinates } = feature.geometry;

  return checkIfValid(feature) && checkIfInside(coordinates, buildingBBox);
}

function checkIfBearingNode(feature: GeoJSON.Feature, bearingNodeIds: Set<string>): boolean {
  return bearingNodeIds.has(getRequiredFeatureId(feature));
}

function normalizeBearingNodeId(nodeId: number | string): string {
  const value = String(nodeId);

  return value.startsWith("node/") ? value : `node/${value}`;
}

function checkIfValid(feature: GeoJSON.Feature): boolean {
  const properties = getRequiredFeatureProperties(feature);

  return properties.level !== undefined;
}

function checkIfInside(
  featureCoordinates: Position[][][] | Position[][] | Position[] | Position,
  buildingBBox: Array<number>,
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
