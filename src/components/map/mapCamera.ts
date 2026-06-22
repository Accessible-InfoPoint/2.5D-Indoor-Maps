export interface MapCenter {
  x: number;
  y: number;
}

export interface MapCameraPosition {
  center: MapCenter;
  bearing: number;
  pitch: number;
  zoom: number;
}

export interface MapInteractionOptions {
  dragRotate?: boolean;
  dragPan?: boolean;
  switchDragButton?: boolean;
  zoomInCenter?: boolean;
}

export interface MapCamera {
  getPosition(): MapCameraPosition;
  setInteractionOptions(options: MapInteractionOptions): void;
  setBearing(bearing: number): void;
  setPitch(pitch: number): void;
  setCenterAndZoom(center: MapCenter, zoom: number): void;
  setZoom(zoom: number): void;
  zoomBy(delta: number): void;
  animateToCenter(center: MapCenter, duration: number): void;
  animateToZoom(zoom: number, duration: number): void;
}
