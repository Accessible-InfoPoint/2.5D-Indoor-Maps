import * as Maptalks from "maptalks";
import {
  MapCamera,
  MapCameraPosition,
  MapCenter,
  MapInteractionOptions,
} from "./mapCamera";

export class MaptalksMapCamera implements MapCamera {
  constructor(private readonly map: Maptalks.Map) {}

  getPosition(): MapCameraPosition {
    const center = this.map.getCenter();

    return {
      center: {
        x: center.x,
        y: center.y,
      },
      bearing: this.map.getBearing(),
      pitch: this.map.getPitch(),
      zoom: this.map.getZoom(),
    };
  }

  setInteractionOptions(options: MapInteractionOptions): void {
    this.map.setOptions(options);
  }

  setBearing(bearing: number): void {
    this.map.setBearing(bearing);
  }

  setPitch(pitch: number): void {
    this.map.setPitch(pitch);
  }

  setCenterAndZoom(center: MapCenter, zoom: number): void {
    this.map.setCenterAndZoom(new Maptalks.Coordinate(center.x, center.y), zoom);
  }

  setZoom(zoom: number): void {
    this.map.setZoom(zoom);
  }

  zoomBy(delta: number): void {
    this.map.setZoom(this.map.getZoom() + delta);
  }
}
