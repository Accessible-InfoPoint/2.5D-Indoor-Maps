import maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import {
  CARTO_ATTRIBUTION,
  CARTO_TILE_SERVER,
  CARTO_TILE_SUBDOMAINS,
} from "../../../public/strings/constants.json";
import {
  MAP_START_LAT,
  MAP_START_LNG,
} from "../../../public/strings/settings.json";
import { IndoorLevelView, IndoorLevelViewEvents } from "../indoorLevel/indoorLevelView";
import { MapLibreIndoorLevelView } from "../indoorLevel/maplibreIndoorLevelView";
import { getRequiredElement } from "../../utils/domHelpers";
import { MapCamera } from "./mapCamera";
import { MapLibreMapCamera } from "./maplibreMapCamera";
import { MapBounds, MapView, MapViewportPadding } from "./mapView";

const MAX_PITCH = 85;

interface MapLibreMapViewOptions {
  configMode: boolean;
  standardZoom: number;
  maxZoom: number;
  minZoom: number;
}

export class MapLibreMapView implements MapView {
  readonly camera: MapCamera;
  private readonly map: MapLibreMap;
  private baseLayerOpacity = 1;

  constructor(options: MapLibreMapViewOptions) {
    this.map = new maplibregl.Map({
      container: "map",
      style: this.createStyle(),
      center: [parseFloat(MAP_START_LNG), parseFloat(MAP_START_LAT)],
      zoom: options.standardZoom,
      maxZoom: options.configMode ? undefined : options.maxZoom,
      minZoom: options.configMode ? undefined : options.minZoom,
      maxPitch: MAX_PITCH,
      pitchWithRotate: options.configMode,
      dragRotate: options.configMode,
      attributionControl: {},
    });

    this.camera = new MapLibreMapCamera(this.map, options.configMode);
    this.syncDebugLogging(options.configMode);
  }

  createIndoorLevelView(
    level: number,
    _altitude: number,
    events: IndoorLevelViewEvents
  ): IndoorLevelView {
    return new MapLibreIndoorLevelView(level, this.map, events);
  }

  setMaxBounds(bounds: MapBounds): void {
    this.map.setMaxBounds([
      [bounds.west, bounds.south],
      [bounds.east, bounds.north],
    ]);
  }

  setViewportPadding(padding: MapViewportPadding): void {
    this.map.setPadding(padding);
  }

  setBaseLayerOpacity(opacity: number): void {
    this.baseLayerOpacity = opacity;

    if (this.map.isStyleLoaded()) {
      this.applyBaseLayerOpacity();
    } else {
      this.map.once("load", () => this.applyBaseLayerOpacity());
    }
  }

  setSaturation(saturation: number): void {
    getRequiredElement("map").style.filter = `saturate(${saturation})`;
  }

  private createStyle(): StyleSpecification {
    return {
      version: 8,
      sources: {
        carto: {
          type: "raster",
          tiles: CARTO_TILE_SUBDOMAINS.map((subdomain) =>
            CARTO_TILE_SERVER.replace("{s}", subdomain)
          ),
          tileSize: 256,
          attribution: CARTO_ATTRIBUTION,
        },
      },
      layers: [
        {
          id: "carto",
          type: "raster",
          source: "carto",
          paint: {
            "raster-opacity": this.baseLayerOpacity,
          },
        },
      ],
    };
  }

  private applyBaseLayerOpacity(): void {
    this.map.setPaintProperty("carto", "raster-opacity", this.baseLayerOpacity);
  }

  private syncDebugLogging(configMode: boolean): void {
    if (!configMode) {
      return;
    }

    this.map.on("zoomend", () => console.log("zoom", this.map.getZoom()));
    this.map.on("rotateend", () => console.log("bearing", this.map.getBearing()));
    this.map.on("pitchend", () => console.log("pitch", this.map.getPitch()));
  }
}
