import { IndoorLevelView, IndoorLevelViewEvents } from "../indoorLevel/indoorLevelView";
import { MapCamera, MapCenter } from "./mapCamera";

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

export interface MapCenterConstraint {
  center: MapCenter;
  radius: number;
}

export interface MapView {
  camera: MapCamera;
  createIndoorLevelView(
    level: number,
    altitude: number,
    events: IndoorLevelViewEvents
  ): IndoorLevelView;
  setMaxBounds(bounds: MapBounds): void;
  setCenterConstraint(constraint?: MapCenterConstraint): void;
  setViewportPadding(padding: MapViewportPadding): void;
  setBaseLayerOpacity(opacity: number): void;
  setSaturation(saturation: number): void;
  onceIdle(callback: () => void): void;
}
