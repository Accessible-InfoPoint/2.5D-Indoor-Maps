import type { Map as MapLibreMap } from "maplibre-gl";

const LEFT_MOUSE_BUTTON = 0;
const CLICK_TOLERANCE_PX = 3;
const ROTATE_DEGREES_PER_PIXEL = 0.8;
const PITCH_DEGREES_PER_PIXEL = -0.5;

export class MapLibreLeftButtonRotateHandler {
  private enabled = false;
  private dragState:
    | {
        pointerId: number;
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
    const canvas = this.map.getCanvas();
    // MapLibre's touch-action CSS permits native single-finger panning whenever its
    // own touch-drag-pan handler is off (as it is here). Override it so a touch drag
    // reaches our pointermove listener instead of being consumed as a native scroll.
    canvas.style.touchAction = "none";
    this.map.getCanvasContainer().addEventListener("pointerdown", this.handlePointerDown);
  }

  disable(): void {
    if (!this.enabled) {
      return;
    }

    this.enabled = false;
    this.map.getCanvas().style.removeProperty("touch-action");
    this.map.getCanvasContainer().removeEventListener("pointerdown", this.handlePointerDown);
    this.endDrag();
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (this.dragState || event.button !== LEFT_MOUSE_BUTTON || event.ctrlKey) {
      return;
    }

    const canvas = this.map.getCanvas();
    this.dragState = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      cursor: canvas.style.cursor,
    };
    canvas.style.cursor = "grabbing";
    // Keeps receiving pointermove/pointerup for this contact even if the finger/
    // cursor leaves the canvas mid-drag.
    this.map.getCanvasContainer().setPointerCapture(event.pointerId);
    window.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("pointerup", this.handlePointerUp);
    window.addEventListener("pointercancel", this.handlePointerUp);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
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

  private handlePointerUp = (event: PointerEvent): void => {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
      return;
    }

    if (this.dragState.moved) {
      this.preventNextClick();
    }

    this.endDrag();
  };

  private endDrag(): void {
    if (!this.dragState) {
      return;
    }

    const canvasContainer = this.map.getCanvasContainer();
    if (canvasContainer.hasPointerCapture(this.dragState.pointerId)) {
      canvasContainer.releasePointerCapture(this.dragState.pointerId);
    }
    this.map.getCanvas().style.cursor = this.dragState.cursor;
    this.dragState = undefined;
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerup", this.handlePointerUp);
    window.removeEventListener("pointercancel", this.handlePointerUp);
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
