import maplibregl from "maplibre-gl";
import * as THREE from "three";
import {
  STAIRCASE_OPACITY,
  STAIRCASE_OUTLINE_OPACITY,
} from "../../../../public/strings/settings.json";
import { StaircaseRenderItem } from "../../staircase/staircaseRenderModel";
import {
  createSlopedPrismGeometry,
  createVerticalCylinderGeometry,
} from "./maplibreThreeGeometry";

export interface MapLibreThreeStaircaseRenderItem {
  item: StaircaseRenderItem;
  color: string;
}

const STAIRCASE_MAIN_RENDER_ORDER = 20;
const STAIRCASE_OUTLINE_RENDER_ORDER = 21;

export function createMapLibreThreeStaircaseObjects(
  items: MapLibreThreeStaircaseRenderItem[],
  origin: maplibregl.MercatorCoordinate
): THREE.Object3D[] {
  return items.flatMap(({ item, color }) => {
    const geometry = createStaircaseGeometry(item, origin);

    if (!isRenderableGeometry(geometry)) {
      geometry.dispose();
      console.warn("Skipping invalid staircase geometry.", item);
      return [];
    }

    const material = createStaircaseMaterial(color, getBaseOpacity(item));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = item.materialRole == "outline"
      ? STAIRCASE_OUTLINE_RENDER_ORDER
      : STAIRCASE_MAIN_RENDER_ORDER;

    return [mesh];
  });
}

function createStaircaseGeometry(
  item: StaircaseRenderItem,
  origin: maplibregl.MercatorCoordinate
): THREE.BufferGeometry {
  return item.type == "prism"
    ? createSlopedPrismGeometry(
        origin,
        item.coordinates,
        item.height,
        item.altitude
      )
    : createVerticalCylinderGeometry(
        origin,
        item.coordinate,
        item.radius,
        item.height,
        item.altitude,
        item.radialSegments
      );
}

function isRenderableGeometry(geometry: THREE.BufferGeometry): boolean {
  const positions = geometry.getAttribute("position");

  if (!positions || positions.count == 0) {
    return false;
  }

  for (let i = 0; i < positions.count; i++) {
    if (
      !Number.isFinite(positions.getX(i)) ||
      !Number.isFinite(positions.getY(i)) ||
      !Number.isFinite(positions.getZ(i))
    ) {
      return false;
    }
  }

  return true;
}

function createStaircaseMaterial(
  color: string,
  baseOpacity: number
): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({
    color: createColor(color),
    opacity: baseOpacity,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
  });

  material.userData.baseOpacity = baseOpacity;
  material.userData.alwaysTransparent = true;
  material.userData.disposeWithObject = true;

  return material;
}

function getBaseOpacity(item: StaircaseRenderItem): number {
  return item.materialRole == "outline"
    ? STAIRCASE_OUTLINE_OPACITY
    : STAIRCASE_OPACITY;
}

function createColor(color: string): THREE.Color {
  try {
    return new THREE.Color(color);
  } catch {
    return new THREE.Color("#ffffff");
  }
}
