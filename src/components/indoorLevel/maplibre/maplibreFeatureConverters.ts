import { getRequiredFeatureId } from "../../../utils/geoJsonHelpers";
import { DoorRenderItem, RoomRenderItem, StyledFeatureRenderItem } from "../indoorLevelRenderModel";
import { getGeometryLabelCenter } from "./maplibreGeometryHelpers";
import { getPatternImageId } from "./maplibreIndoorLevelTypes";
import { getStyleNumber, getStyleNumberArray, getStyleString } from "./maplibreStyleHelpers";

export interface MapLibreRoomFeatureConversion {
  feature: GeoJSON.Feature;
  featureId: string;
  patternFile: string;
  sourceFeature: GeoJSON.Feature;
}

export function buildMapLibreRoomFeature(item: RoomRenderItem): MapLibreRoomFeatureConversion {
  const featureId = getRequiredFeatureId(item.feature);
  const patternFile = getRoomPatternFile(item);

  return {
    feature: {
      ...item.feature,
      properties: {
        ...item.feature.properties,
        __featureId: featureId,
        fillColor: getStyleString(item.style, "polygonFill", "#ffffff"),
        fillOpacity: getStyleNumber(item.style, "polygonOpacity", 1),
        lineColor: getStyleString(item.style, "lineColor", "#000000"),
        lineWidth: getStyleNumber(item.style, "lineWidth", 1),
        lineOpacity: getStyleNumber(item.style, "lineOpacity", 1),
        patternFile,
        ...(patternFile
          ? {
              patternImageId: getPatternImageId(patternFile),
            }
          : {}),
      },
    },
    featureId,
    patternFile,
    sourceFeature: item.feature,
  };
}

export function buildMapLibreRoomNumberFeature(
  item: RoomRenderItem,
): GeoJSON.Feature<GeoJSON.Point> | undefined {
  if (!item.label) {
    return undefined;
  }

  const coordinates = getGeometryLabelCenter(item.feature.geometry);

  if (!coordinates) {
    return undefined;
  }

  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates,
    },
    properties: {
      label: item.label,
    },
  };
}

export function buildMapLibreStyledLineFeature(item: StyledFeatureRenderItem): GeoJSON.Feature {
  return {
    ...item.feature,
    properties: {
      ...item.feature.properties,
      lineColor: getStyleString(item.style, "lineColor", "#000000"),
      lineWidth: getStyleNumber(item.style, "lineWidth", 1),
      lineOpacity: getStyleNumber(item.style, "lineOpacity", 1),
      lineDasharray: getStyleNumberArray(item.style, "lineDasharray", [10, 10]),
    },
  };
}

export function buildMapLibreDoorFeature(
  item: DoorRenderItem,
): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: item.coordinates,
    },
    properties: {
      lineColor: item.symbol.lineColor,
      lineWidth: item.symbol.lineWidth,
      lineOpacity: 1,
    },
  };
}

export function buildMapLibreDoorDebugFeatures(door: DoorRenderItem): GeoJSON.Feature[] {
  const debug = door.debug;

  if (!debug) {
    return [];
  }

  return [
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [debug.previous, debug.door, debug.after],
      },
      properties: {
        debugType: "wall-context",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [debug.calculatedPrevious, debug.calculatedAfter],
      },
      properties: {
        debugType: "calculated-door",
      },
    },
    buildDoorDebugPoint("previous", "P", debug.previous, {
      distanceM: debug.previousDistanceM,
      widthM: debug.widthM,
    }),
    buildDoorDebugPoint("door", "D", debug.door, {
      widthM: debug.widthM,
    }),
    buildDoorDebugPoint("after", "A", debug.after, {
      distanceM: debug.afterDistanceM,
      widthM: debug.widthM,
    }),
  ];
}

export function getRoomPatternFile(item: RoomRenderItem): string {
  return getStyleString(item.style, "polygonPatternFile", "");
}

function buildDoorDebugPoint(
  debugType: string,
  label: string,
  coordinates: GeoJSON.Position,
  properties: Record<string, unknown>,
): GeoJSON.Feature<GeoJSON.Point> {
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates,
    },
    properties: {
      ...properties,
      debugType,
      label,
    },
  };
}
