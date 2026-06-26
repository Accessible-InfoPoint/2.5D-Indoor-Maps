import { IndoorLevelView, IndoorLevelViewEvents } from "../indoorLevel/indoorLevelView";
import { MapCamera } from "./mapCamera";

export interface MapBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface MapViewportPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface MapView {
  camera: MapCamera;
  createIndoorLevelView(
    level: number,
    altitude: number,
    events: IndoorLevelViewEvents
  ): IndoorLevelView;
  setMaxBounds(bounds: MapBounds): void;
  setViewportPadding(padding: MapViewportPadding): void;
  setBaseLayerOpacity(opacity: number): void;
  setSaturation(saturation: number): void;
}
