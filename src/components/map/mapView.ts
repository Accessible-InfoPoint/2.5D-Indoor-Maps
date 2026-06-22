import { IndoorLevelView, IndoorLevelViewEvents } from "../indoorLevel/indoorLevelView";
import { MapCamera } from "./mapCamera";

export interface MapView {
  camera: MapCamera;
  createIndoorLevelView(
    level: number,
    altitude: number,
    events: IndoorLevelViewEvents
  ): IndoorLevelView;
  setBaseLayerOpacity(opacity: number): void;
  setSaturation(saturation: number): void;
}
