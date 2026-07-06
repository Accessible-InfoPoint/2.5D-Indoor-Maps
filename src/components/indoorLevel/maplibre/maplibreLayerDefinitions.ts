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
        "circle-color": ["coalesce", ["get", "fillColor"], "#ffffff"],
        "circle-radius": 18,
        "circle-stroke-color": ["coalesce", ["get", "strokeColor"], "#000000"],
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
        "text-color": ["coalesce", ["get", "textColor"], "#000000"],
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

export function createDoorDebugLayers(options: LayerDefinitionOptions): AddLayerObject[] {
  return [
    {
      id: options.layerId("door-debug", "wall-context"),
      type: "line",
      source: options.sourceId("door-debug"),
      filter: ["==", ["get", "debugType"], "wall-context"],
      paint: {
        "line-color": "#ef4444",
        "line-width": 1.5,
        "line-opacity": options.opacity,
        "line-dasharray": [2, 1],
      },
    },
    {
      id: options.layerId("door-debug", "calculated-door"),
      type: "line",
      source: options.sourceId("door-debug"),
      filter: ["==", ["get", "debugType"], "calculated-door"],
      paint: {
        "line-color": "#22c55e",
        "line-width": 4,
        "line-opacity": options.opacity,
      },
    },
    {
      id: options.layerId("door-debug", "previous-point"),
      type: "circle",
      source: options.sourceId("door-debug"),
      filter: ["==", ["get", "debugType"], "previous"],
      paint: {
        "circle-color": "#2563eb",
        "circle-radius": 5,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-opacity": options.opacity,
        "circle-stroke-opacity": options.opacity,
      },
    },
    {
      id: options.layerId("door-debug", "door-point"),
      type: "circle",
      source: options.sourceId("door-debug"),
      filter: ["==", ["get", "debugType"], "door"],
      paint: {
        "circle-color": "#111827",
        "circle-radius": 6,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-opacity": options.opacity,
        "circle-stroke-opacity": options.opacity,
      },
    },
    {
      id: options.layerId("door-debug", "after-point"),
      type: "circle",
      source: options.sourceId("door-debug"),
      filter: ["==", ["get", "debugType"], "after"],
      paint: {
        "circle-color": "#f97316",
        "circle-radius": 5,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-opacity": options.opacity,
        "circle-stroke-opacity": options.opacity,
      },
    },
    {
      id: options.layerId("door-debug", "label"),
      type: "symbol",
      source: options.sourceId("door-debug"),
      filter: ["has", "label"],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 12,
        "text-offset": [0, -1],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": "#000000",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.5,
        "text-opacity": options.opacity,
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
        "icon-text-fit-padding": [2, 4, 2, 4],
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
