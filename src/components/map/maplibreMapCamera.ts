import type { Map as MapLibreMap } from "maplibre-gl";
import {
  MapCamera,
  MapCameraPosition,
  MapCenter,
  MapInteractionOptions,
} from "./mapCamera";
import { MapLibreLeftButtonRotateHandler } from "./maplibreLeftButtonRotateHandler";
import { prefersReducedMotion } from "../../utils/motionPreferences";

export class MapLibreMapCamera implements MapCamera {
  private readonly leftButtonRotateHandler: MapLibreLeftButtonRotateHandler;

  constructor(
    private readonly map: MapLibreMap,
    private readonly configMode: boolean
  ) {
    this.leftButtonRotateHandler = new MapLibreLeftButtonRotateHandler(
      map,
      configMode
    );
  }

  getPosition(): MapCameraPosition {
    const center = this.map.getCenter();

    return {
      center: {
        x: center.lng,
        y: center.lat,
      },
      bearing: this.map.getBearing(),
      pitch: this.map.getPitch(),
      zoom: this.map.getZoom(),
    };
  }

  setInteractionOptions(options: MapInteractionOptions): void {
    this.setHandlerState(this.map.dragRotate, options.dragRotate);
    this.setHandlerState(this.map.dragPan, options.dragPan);
    this.setHandlerState(this.leftButtonRotateHandler, options.switchDragButton);

    if (options.dragRotate === false) {
      this.map.touchZoomRotate.disableRotation();
      this.map.touchPitch.disable();
    } else if (options.dragRotate === true) {
      this.map.touchZoomRotate.enableRotation();

      if (this.configMode) {
        this.map.touchPitch.enable();
      } else {
        this.map.touchPitch.disable();
      }
    }
  }

  setBearing(bearing: number): void {
    this.map.setBearing(bearing);
  }

  setPitch(pitch: number): void {
    this.map.setPitch(pitch);
  }

  setCenterAndZoom(center: MapCenter, zoom: number): void {
    this.map.jumpTo({
      center: [center.x, center.y],
      zoom,
    });
  }

  setZoom(zoom: number): void {
    this.map.setZoom(zoom);
  }

  zoomBy(delta: number): void {
    const zoom = this.map.getZoom() + delta;

    if (prefersReducedMotion()) {
      this.map.setZoom(zoom);
      return;
    }

    this.map.zoomTo(zoom);
  }

  animateToCenter(center: MapCenter, duration: number): void {
    this.map.easeTo({
      center: [center.x, center.y],
      duration,
    });
  }

  animateToZoom(zoom: number, duration: number): void {
    this.map.easeTo({
      zoom,
      duration,
    });
  }

  private setHandlerState(
    handler: { enable: () => void; disable: () => void },
    enabled: boolean | undefined
  ): void {
    if (enabled === true) {
      handler.enable();
    } else if (enabled === false) {
      handler.disable();
    }
  }
}
