import type { Map as MapLibreMap } from "maplibre-gl";

const LEFT_MOUSE_BUTTON = 0;
const CLICK_TOLERANCE_PX = 3;
const ROTATE_DEGREES_PER_PIXEL = 0.8;
const PITCH_DEGREES_PER_PIXEL = -0.5;

export class MapLibreLeftButtonRotateHandler {
  private enabled = false;
  private dragState:
    | {
        lastX: number;
        lastY: number;
        startX: number;
        startY: number;
        moved: boolean;
        cursor: string;
      }
    | undefined;

  constructor(
    private readonly map: MapLibreMap,
    private readonly allowPitch: boolean,
  ) {}

  enable(): void {
    if (this.enabled) {
      return;
    }

    this.enabled = true;
    this.map.getCanvasContainer().addEventListener("mousedown", this.handleMouseDown);
  }

  disable(): void {
    if (!this.enabled) {
      return;
    }

    this.enabled = false;
    this.map.getCanvasContainer().removeEventListener("mousedown", this.handleMouseDown);
    this.endDrag();
  }

  private handleMouseDown = (event: MouseEvent): void => {
    if (event.button !== LEFT_MOUSE_BUTTON || event.ctrlKey) {
      return;
    }

    const canvas = this.map.getCanvas();
    this.dragState = {
      lastX: event.clientX,
      lastY: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      cursor: canvas.style.cursor,
    };
    canvas.style.cursor = "grabbing";
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mouseup", this.handleMouseUp);
  };

  private handleMouseMove = (event: MouseEvent): void => {
    if (!this.dragState) {
      return;
    }

    const deltaFromStart = Math.hypot(
      event.clientX - this.dragState.startX,
      event.clientY - this.dragState.startY,
    );

    if (!this.dragState.moved && deltaFromStart < CLICK_TOLERANCE_PX) {
      return;
    }

    event.preventDefault();
    this.dragState.moved = true;

    const deltaX = event.clientX - this.dragState.lastX;
    const deltaY = event.clientY - this.dragState.lastY;
    this.dragState.lastX = event.clientX;
    this.dragState.lastY = event.clientY;

    this.map.setBearing(this.map.getBearing() + deltaX * ROTATE_DEGREES_PER_PIXEL);

    if (this.allowPitch) {
      this.map.setPitch(this.map.getPitch() + deltaY * PITCH_DEGREES_PER_PIXEL);
    }
  };

  private handleMouseUp = (): void => {
    if (this.dragState?.moved) {
      this.preventNextClick();
    }

    this.endDrag();
  };

  private endDrag(): void {
    if (!this.dragState) {
      return;
    }

    this.map.getCanvas().style.cursor = this.dragState.cursor;
    this.dragState = undefined;
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);
  }

  private preventNextClick(): void {
    this.map.getCanvasContainer().addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
      },
      { capture: true, once: true },
    );
  }
}
