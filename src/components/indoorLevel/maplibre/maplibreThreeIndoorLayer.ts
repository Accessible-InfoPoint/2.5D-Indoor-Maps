import maplibregl from "maplibre-gl";
import type {
  CustomLayerInterface,
  CustomRenderMethodInput,
  Map as MapLibreMap,
} from "maplibre-gl";
import * as THREE from "three";
import {
  createMercatorOrigin,
  createPolygonSlabGeometry,
  getOpenRing,
} from "./maplibreThreeGeometry";

const OUTLINE_THICKNESS_METERS = 0.08;
const OUTLINE_FILL_OPACITY = 0.8;
const OUTLINE_EDGE_OPACITY = 0.85;

export class MapLibreThreeIndoorLayer implements CustomLayerInterface {
  readonly type = "custom";
  readonly renderingMode = "3d";

  private readonly rootGroup = new THREE.Group();
  private readonly surfacesGroup = new THREE.Group();
  private readonly markersGroup = new THREE.Group();
  private readonly staircasesGroup = new THREE.Group();
  private readonly modelMatrix = new THREE.Matrix4();
  private readonly cameraMatrix = new THREE.Matrix4();
  private readonly outlineFillMaterial = new THREE.MeshBasicMaterial({
    color: 0x4d4d4d,
    opacity: OUTLINE_FILL_OPACITY,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  private readonly outlineEdgeMaterial = new THREE.LineBasicMaterial({
    color: 0x111827,
    opacity: OUTLINE_EDGE_OPACITY,
    transparent: true,
  });

  private map?: MapLibreMap;
  private camera?: THREE.Camera;
  private scene?: THREE.Scene;
  private renderer?: THREE.WebGLRenderer;
  private origin?: maplibregl.MercatorCoordinate;
  private outlineCoordinates: GeoJSON.Position[] = [];
  private altitudeMeters = 0;
  private opacity = 1;

  constructor(readonly id: string) {
    this.rootGroup.add(this.surfacesGroup, this.markersGroup, this.staircasesGroup);
  }

  onAdd(map: MapLibreMap, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    this.map = map;
    this.camera = new THREE.Camera();
    this.scene = new THREE.Scene();
    this.scene.add(this.rootGroup);
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true,
    });
    this.renderer.autoClear = false;

    this.rebuildOutline();
  }

  render(
    _gl: WebGLRenderingContext | WebGL2RenderingContext,
    { defaultProjectionData }: CustomRenderMethodInput
  ): void {
    if (!this.camera || !this.renderer || !this.scene) {
      return;
    }

    this.camera.projectionMatrix = this.cameraMatrix
      .fromArray(defaultProjectionData.mainMatrix)
      .multiply(this.modelMatrix);
    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
  }

  onRemove(): void {
    this.disposeObject(this.rootGroup);
    this.outlineFillMaterial.dispose();
    this.outlineEdgeMaterial.dispose();
    this.renderer?.dispose();
    this.map = undefined;
    this.camera = undefined;
    this.scene = undefined;
    this.renderer = undefined;
  }

  setOutline(outlineCoordinates: GeoJSON.Position[]): void {
    this.outlineCoordinates = outlineCoordinates;
    this.rebuildOutline();
  }

  setAltitudeAndOpacity(altitudeMeters: number, opacity: number): void {
    this.altitudeMeters = altitudeMeters;
    this.opacity = opacity;
    this.applyAltitude();
    this.applyOpacity();
    this.map?.triggerRepaint();
  }

  animateAltitude(
    start: number,
    end: number,
    opacityStart: number,
    opacityEnd: number,
    duration = 0.5
  ): Promise<void> {
    return new Promise((resolve) => {
      let startTime: number | undefined;

      const animate = (time: number) => {
        startTime ??= time;
        const elapsed = (time - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);

        this.setAltitudeAndOpacity(
          start + (end - start) * easedProgress,
          opacityStart + (opacityEnd - opacityStart) * progress
        );

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  clear(): void {
    this.outlineCoordinates = [];
    this.clearGroup(this.surfacesGroup);
    this.map?.triggerRepaint();
  }

  private rebuildOutline(): void {
    this.clearGroup(this.surfacesGroup);

    const ring = getOpenRing(this.outlineCoordinates);

    if (!this.scene || ring.length < 3) {
      return;
    }

    this.origin = createMercatorOrigin(ring);
    this.modelMatrix.makeTranslation(this.origin.x, this.origin.y, this.origin.z);
    this.applyAltitude();

    const geometry = createPolygonSlabGeometry(
      this.origin,
      ring,
      OUTLINE_THICKNESS_METERS
    );
    const outline = new THREE.Mesh(geometry, this.outlineFillMaterial);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      this.outlineEdgeMaterial
    );

    this.surfacesGroup.add(outline, edges);
    this.applyOpacity();
    this.map?.triggerRepaint();
  }

  private applyAltitude(): void {
    if (!this.origin) {
      return;
    }

    this.rootGroup.position.z =
      this.altitudeMeters * this.origin.meterInMercatorCoordinateUnits();
  }

  private applyOpacity(): void {
    this.outlineFillMaterial.opacity = OUTLINE_FILL_OPACITY * this.opacity;
    this.outlineEdgeMaterial.opacity = OUTLINE_EDGE_OPACITY * this.opacity;
  }

  private clearGroup(group: THREE.Group): void {
    group.children.slice().forEach((child) => {
      group.remove(child);
      this.disposeObject(child);
    });
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh | THREE.LineSegments;
      const geometry = mesh.geometry;

      if (geometry instanceof THREE.BufferGeometry) {
        geometry.dispose();
      }
    });
  }
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}
