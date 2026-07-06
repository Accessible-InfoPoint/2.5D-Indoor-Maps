import maplibregl from "maplibre-gl";
import type {
  LngLat,
  Map as MapLibreMap,
  StyleSpecification,
  TransformConstrainFunction,
} from "maplibre-gl";
import constants from "../../../public/strings/constants.json";
import {
  MAP_START_LAT,
  MAP_START_LNG,
} from "../../../public/strings/settings.json";
import { IndoorLevelView, IndoorLevelViewEvents } from "../indoorLevel/indoorLevelView";
import { MapLibreIndoorLevelView } from "../indoorLevel/maplibreIndoorLevelView";
import { getRequiredElement } from "../../utils/domHelpers";
import CoordinateHelpers from "../../utils/coordinateHelpers";
import { MapCamera } from "./mapCamera";
import { MapLibreMapCamera } from "./maplibreMapCamera";
import { MapBounds, MapCenterConstraint, MapView, MapViewportPadding } from "./mapView";

const MAX_PITCH = 85;
const DEFAULT_MIN_ZOOM = -2;
const DEFAULT_MAX_ZOOM = 22;
const {
  CARTO_ATTRIBUTION,
  CARTO_TILE_SERVER,
  CARTO_TILE_SUBDOMAINS,
  MAPLIBRE_ATTRIBUTION,
} = constants;

interface MapLibreMapViewOptions {
  configMode: boolean;
  standardZoom: number;
  maxZoom: number;
  minZoom: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
}

interface ProjectedCenterConstraint {
  center: ProjectedPoint;
  radius: number;
}

interface ZoomBounds {
  min: number;
  max: number;
}

export class MapLibreMapView implements MapView {
  readonly camera: MapCamera;
  private readonly map: MapLibreMap;
  private readonly zoomBounds: ZoomBounds;
  private baseLayerOpacity = 1;
  private centerConstraint?: ProjectedCenterConstraint;

  constructor(options: MapLibreMapViewOptions) {
    this.zoomBounds = {
      min: options.configMode ? DEFAULT_MIN_ZOOM : options.minZoom,
      max: options.configMode ? DEFAULT_MAX_ZOOM : options.maxZoom,
    };

    this.map = new maplibregl.Map({
      container: "map",
      style: this.createStyle(),
      center: [parseFloat(MAP_START_LNG), parseFloat(MAP_START_LAT)],
      zoom: options.standardZoom,
      maxZoom: this.zoomBounds.max,
      minZoom: this.zoomBounds.min,
      maxPitch: MAX_PITCH,
      pitchWithRotate: options.configMode,
      dragRotate: options.configMode,
      canvasContextAttributes: {
        antialias: true,
      },
      attributionControl: false,
    });
    this.map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: MAPLIBRE_ATTRIBUTION,
      }),
      "top-right"
    );

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
    void bounds;
    this.map.setMaxBounds(null);
  }

  setCenterConstraint(constraint?: MapCenterConstraint): void {
    this.centerConstraint = constraint
      ? {
          center: this.projectCenter(constraint.center),
          radius: constraint.radius,
        }
      : undefined;

    this.map.setTransformConstrain(
      this.centerConstraint
        ? this.constrainTransform
        : null
    );
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

  onceIdle(callback: () => void): void {
    this.map.once("idle", callback);
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

  private readonly constrainTransform: TransformConstrainFunction = (lngLat, zoom) => {
    const projectedCenter = this.projectLngLat(lngLat);
    const constrainedCenter = this.getConstrainedCenter(projectedCenter);

    return {
      center: this.unprojectCenter(constrainedCenter),
      zoom: this.getConstrainedZoom(zoom),
    };
  };

  private getConstrainedCenter(projectedCenter: ProjectedPoint): ProjectedPoint {
    const constraint = this.centerConstraint;

    if (!constraint) {
      return projectedCenter;
    }

    const offset = {
      x: projectedCenter.x - constraint.center.x,
      y: projectedCenter.y - constraint.center.y,
    };
    const distance = Math.hypot(offset.x, offset.y);

    if (distance <= constraint.radius) {
      return projectedCenter;
    }

    const scale = constraint.radius / distance;

    return {
      x: constraint.center.x + offset.x * scale,
      y: constraint.center.y + offset.y * scale,
    };
  }

  private projectCenter(center: { x: number; y: number }): ProjectedPoint {
    return {
      x: center.x,
      y: CoordinateHelpers.lat2y(center.y),
    };
  }

  private projectLngLat(lngLat: LngLat): ProjectedPoint {
    return {
      x: lngLat.lng,
      y: CoordinateHelpers.lat2y(lngLat.lat),
    };
  }

  private unprojectCenter(center: ProjectedPoint): LngLat {
    return new maplibregl.LngLat(
      center.x,
      CoordinateHelpers.y2lat(center.y)
    );
  }

  private getConstrainedZoom(zoom: number): number {
    return Math.max(
      this.zoomBounds.min,
      Math.min(this.zoomBounds.max, zoom)
    );
  }

  private syncDebugLogging(configMode: boolean): void {
    if (!configMode) {
      return;
    }

    this.map.on("zoomend", () => console.log("zoom", this.map.getZoom()));
    this.map.on("rotateend", () => console.log("bearing", this.map.getBearing()));
    this.map.on("pitchend", () => console.log("pitch", this.map.getPitch()));
    this.map.on("moveend", () => console.log("position", this.map.getCenter()));
  }
}
