import type { Map as MapLibreMap } from "maplibre-gl";
import { getMarkerImageId } from "./maplibreIndoorLevelTypes";

const ROOM_NUMBER_BACKGROUND_IMAGE_ID = "room-number-background";
const ROOM_NUMBER_BACKGROUND_SIZE = 10;
const ROOM_NUMBER_BACKGROUND_BORDER = 4;
const ACCESSIBILITY_MARKER_IMAGE_SIZE = 48;

export { ROOM_NUMBER_BACKGROUND_IMAGE_ID };

export function registerRoomNumberBackgroundImage(map: MapLibreMap): void {
  if (map.hasImage(ROOM_NUMBER_BACKGROUND_IMAGE_ID)) {
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = ROOM_NUMBER_BACKGROUND_SIZE;
  canvas.height = ROOM_NUMBER_BACKGROUND_SIZE;

  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255, 255, 255, 0.9)";
  context.strokeStyle = "rgba(0, 0, 0, 0.75)";
  context.lineWidth = 2;
  drawRoundedRectangle(
    context,
    1,
    1,
    canvas.width - 2,
    canvas.height - 2,
    ROOM_NUMBER_BACKGROUND_BORDER
  );
  context.fill();
  context.stroke();

  map.addImage(
    ROOM_NUMBER_BACKGROUND_IMAGE_ID,
    context.getImageData(0, 0, canvas.width, canvas.height),
    {
      content: [
        ROOM_NUMBER_BACKGROUND_BORDER,
        ROOM_NUMBER_BACKGROUND_BORDER,
        canvas.width - ROOM_NUMBER_BACKGROUND_BORDER,
        canvas.height - ROOM_NUMBER_BACKGROUND_BORDER,
      ],
      stretchX: [[ROOM_NUMBER_BACKGROUND_BORDER, canvas.width - ROOM_NUMBER_BACKGROUND_BORDER]],
      stretchY: [[ROOM_NUMBER_BACKGROUND_BORDER, canvas.height - ROOM_NUMBER_BACKGROUND_BORDER]],
    }
  );
}

export function registerMarkerImage(
  map: MapLibreMap,
  markerFile: string,
  loadingMarkerImageIds: Set<string>
): void {
  const imageId = getMarkerImageId(markerFile);

  if (map.hasImage(imageId) || loadingMarkerImageIds.has(imageId)) {
    return;
  }

  loadingMarkerImageIds.add(imageId);
  loadMarkerImage(markerFile)
    .then((imageData) => {
      if (!map.hasImage(imageId)) {
        map.addImage(imageId, imageData);
        map.triggerRepaint();
      }
    })
    .catch((error: unknown) => {
      console.warn(`Could not load MapLibre marker image "${markerFile}".`, error);
    })
    .finally(() => {
      loadingMarkerImageIds.delete(imageId);
    });
}

function loadMarkerImage(markerFile: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = ACCESSIBILITY_MARKER_IMAGE_SIZE;
      canvas.height = ACCESSIBILITY_MARKER_IMAGE_SIZE;

      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Could not create marker image canvas context."));
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(context.getImageData(0, 0, canvas.width, canvas.height));
    };
    image.onerror = () => reject(new Error(`Could not decode marker image "${markerFile}".`));
    image.src = markerFile;
  });
}

function drawRoundedRectangle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}
