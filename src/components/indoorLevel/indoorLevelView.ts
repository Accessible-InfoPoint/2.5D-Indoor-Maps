import { DoorDataInterface } from "../../models/doorDataInterface";
import { IndoorLevelRenderModel } from "./indoorLevelRenderModel";

export interface IndoorLevelViewEvents {
  onFeatureSelected: (feature: GeoJSON.Feature) => void;
}

export interface IndoorLevelView {
  clear(): void;
  render(renderModel: IndoorLevelRenderModel, selectedFeatureIds: string[]): void;
  drawDoors(doors: DoorDataInterface[]): void;
  hideAll(): void;
  showAll(): void;
  show2DView(): void;
  show3DView(): void;
  animateAltitude(
    start: number,
    end: number,
    opacityStart: number,
    opacityEnd: number,
    duration?: number
  ): Promise<void>;
  setAltitudeAndOpacity(altitude: number, opacity: number): void;
}
