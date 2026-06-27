import type { AddLayerObject } from "maplibre-gl";
import { ROOM_NUMBER_BACKGROUND_IMAGE_ID } from "./maplibreImageRegistry";
import {
  getOpacityExpression,
  getPatternExpression,
  getZoomOpacityExpression,
  ROOM_NUMBER_FADE_START_ZOOM,
} from "./maplibreStyleHelpers";

export interface LayerDefinitionOptions {
  layerId: (name: string, layerName: string) => string;
  sourceId: (name: string) => string;
  opacity: number;
}

export function createInfoPointLayers(options: LayerDefinitionOptions): AddLayerObject[] {
  return [
    {
      id: options.layerId("info-point", "circle"),
      type: "circle",
      source: options.sourceId("info-point"),
      paint: {
        "circle-color": "rgb(255, 195, 195)",
        "circle-radius": 18,
        "circle-stroke-color": "#000000",
        "circle-stroke-width": 2,
        "circle-opacity": options.opacity,
      },
    },
    {
      id: options.layerId("info-point", "label"),
      type: "symbol",
      source: options.sourceId("info-point"),
      layout: {
        "text-field": ["get", "label"],
        "text-size": 18,
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#000000",
        "text-opacity": options.opacity,
      },
    },
  ];
}

export function createRoomLayers(options: LayerDefinitionOptions): AddLayerObject[] {
  return [
    {
      id: options.layerId("rooms", "fill"),
      type: "fill",
      source: options.sourceId("rooms"),
      paint: {
        "fill-color": ["coalesce", ["get", "fillColor"], "#ffffff"],
        "fill-opacity": getOpacityExpression("fillOpacity", options.opacity),
      },
    },
    {
      id: options.layerId("rooms", "pattern"),
      type: "fill",
      source: options.sourceId("rooms"),
      filter: ["has", "patternImageId"],
      paint: {
        "fill-pattern": getPatternExpression("patternImageId"),
        "fill-opacity": getOpacityExpression("fillOpacity", options.opacity),
      },
    },
    {
      id: options.layerId("rooms", "line"),
      type: "line",
      source: options.sourceId("rooms"),
      paint: {
        "line-color": ["coalesce", ["get", "lineColor"], "#000000"],
        "line-width": ["coalesce", ["get", "lineWidth"], 1],
        "line-opacity": getOpacityExpression("lineOpacity", options.opacity),
      },
    },
  ];
}

export function createDoorLayers(options: LayerDefinitionOptions): AddLayerObject[] {
  return [
    {
      id: options.layerId("doors", "line"),
      type: "line",
      source: options.sourceId("doors"),
      layout: {
        "line-cap": "butt",
        "line-join": "miter",
      },
      paint: {
        "line-color": ["coalesce", ["get", "lineColor"], "#ffffff"],
        "line-width": ["coalesce", ["get", "lineWidth"], 1],
        "line-opacity": getOpacityExpression("lineOpacity", options.opacity),
      },
    },
  ];
}

export function createTactilePavingLayers(options: LayerDefinitionOptions): AddLayerObject[] {
  return [
    {
      id: options.layerId("tactile-paving", "line"),
      type: "line",
      source: options.sourceId("tactile-paving"),
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": ["coalesce", ["get", "lineColor"], "#000000"],
        "line-width": ["coalesce", ["get", "lineWidth"], 1],
        "line-opacity": getOpacityExpression("lineOpacity", options.opacity),
        "line-dasharray": ["coalesce", ["get", "lineDasharray"], ["literal", [10, 10]]],
      },
    },
  ];
}

export function createRoomNumberLayers(options: LayerDefinitionOptions): AddLayerObject[] {
  return [
    {
      id: options.layerId("room-numbers", "label"),
      type: "symbol",
      source: options.sourceId("room-numbers"),
      minzoom: ROOM_NUMBER_FADE_START_ZOOM,
      layout: {
        "icon-image": ROOM_NUMBER_BACKGROUND_IMAGE_ID,
        "icon-text-fit": "both",
        "icon-text-fit-padding": [4, 7, 4, 7],
        "icon-allow-overlap": true,
        "text-field": ["get", "label"],
        "text-size": 14,
        "text-anchor": "center",
        "text-justify": "center",
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#000000",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1,
        "text-opacity": getZoomOpacityExpression(options.opacity),
        "icon-opacity": getZoomOpacityExpression(options.opacity),
      },
    },
  ];
}
