import * as Maptalks from "maptalks";
import {
  CARTO_ATTRIBUTION,
  CARTO_TILE_SERVER,
  CARTO_TILE_SUBDOMAINS,
} from "../../../public/strings/constants.json";
import {
  MAP_START_LAT,
  MAP_START_LNG,
} from "../../../public/strings/settings.json";
import { MaptalksIndoorLevelView } from "../indoorLevel/maptalksIndoorLevelView";
import { IndoorLevelView, IndoorLevelViewEvents } from "../indoorLevel/indoorLevelView";
import { MapCamera } from "./mapCamera";
import { MaptalksMapCamera } from "./maptalksMapCamera";
import { MapBounds, MapView } from "./mapView";
import { getRequiredElement } from "../../utils/domHelpers";

interface MaptalksMapViewOptions {
  configMode: boolean;
  standardZoom: number;
  maxZoom: number;
  minZoom: number;
}

export class MaptalksMapView implements MapView {
  readonly camera: MapCamera;
  private readonly map: Maptalks.Map;
  private readonly flatMap: Maptalks.Map;

  constructor(options: MaptalksMapViewOptions) {
    this.map = new Maptalks.Map("map", {
      center: [parseFloat(MAP_START_LNG), parseFloat(MAP_START_LAT)],
      zoom: options.standardZoom,
      maxZoom: options.configMode ? undefined : options.maxZoom,
      minZoom: options.configMode ? undefined : options.minZoom,
      dragRotate: options.configMode,
      dragPitch: options.configMode,
      baseLayer: this.createBaseLayer(),
    });

    this.camera = new MaptalksMapCamera(this.map);

    this.flatMap = new Maptalks.Map("flatMap", {
      center: [parseFloat(MAP_START_LNG), parseFloat(MAP_START_LAT)],
      zoom: options.standardZoom,
      maxZoom: options.maxZoom,
      minZoom: options.minZoom,
      baseLayer: this.createBaseLayer(),
    });

    this.syncFlatMap(options.configMode);
  }

  createIndoorLevelView(
    level: number,
    altitude: number,
    events: IndoorLevelViewEvents
  ): IndoorLevelView {
    return new MaptalksIndoorLevelView(
      level,
      altitude,
      {
        map: this.map,
        markerProjectionMap: this.flatMap,
      },
      events
    );
  }

  setBaseLayerOpacity(opacity: number): void {
    this.map.getBaseLayer().setOpacity(opacity);
  }

  setMaxBounds(bounds: MapBounds): void {
    const extent = new Maptalks.Extent(
      bounds.west,
      bounds.south,
      bounds.east,
      bounds.north
    );
    this.map.setMaxExtent(extent);
    this.flatMap.setMaxExtent(extent);
  }

  setCenterConstraint(): void {}

  setViewportPadding(): void {}

  setSaturation(saturation: number): void {
    getRequiredElement("map").style.filter = `saturate(${saturation})`;
  }

  private createBaseLayer(): Maptalks.TileLayer {
    return new Maptalks.TileLayer("carto", {
      urlTemplate: CARTO_TILE_SERVER,
      subdomains: CARTO_TILE_SUBDOMAINS,
      attribution: CARTO_ATTRIBUTION,
    });
  }

  private syncFlatMap(configMode: boolean): void {
    this.map.on("moving moveend", () => {
      this.flatMap.setCenter(this.map.getCenter());
    });

    this.map.on("zooming zoomend", () => {
      if (configMode)
        console.log("zoom", this.map.getZoom());
      this.flatMap.setCenterAndZoom(
        this.map.getCenter(),
        this.map.getZoom()
      );
    });

    this.map.on("rotate", () => {
      if (configMode)
        console.log("bearing", this.map.getBearing());
      this.flatMap.setBearing(this.map.getBearing());
    });

    this.map.on("pitch", () => {
      if (configMode)
        console.log("pitch", this.map.getPitch());
    });
  }
}
