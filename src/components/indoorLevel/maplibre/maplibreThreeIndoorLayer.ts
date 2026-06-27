import maplibregl from "maplibre-gl";
import type {
  CustomLayerInterface,
  CustomRenderMethodInput,
  Map as MapLibreMap,
} from "maplibre-gl";
import * as THREE from "three";
import {
  InfoPointRenderItem,
  RoomRenderItem,
} from "../indoorLevelRenderModel";
import {
  createLocalMercatorVector,
  createMercatorOrigin,
  createPolygonSlabGeometry,
  createPolygonSurfaceGeometry,
  getOpenRing,
} from "./maplibreThreeGeometry";
import { getGeometryLabelCenter } from "./maplibreGeometryHelpers";
import {
  getStyleNumber,
  getStyleString,
} from "./maplibreStyleHelpers";
import {
  createMapLibreThreeMarker,
  getMapLibreThreeMarkerElevationMeters,
  getMapLibreThreeMaterialTexture,
  MAPLIBRE_THREE_INFO_POINT_FILL,
  MAPLIBRE_THREE_SELECTED_POSITION_FILL,
  updateMapLibreThreeMarkerViewport,
} from "./maplibreThreeMarkers";

const OUTLINE_THICKNESS_METERS = 0.08;
const ROOM_BASE_ELEVATION_METERS = 0.1;
const OUTLINE_FILL_OPACITY = 0.8;
const OUTLINE_EDGE_OPACITY = 0.85;
const ROOM_EDGE_OPACITY = 0.9;

export class MapLibreThreeIndoorLayer implements CustomLayerInterface {
  readonly type = "custom";
  readonly renderingMode = "3d";

  private readonly rootGroup = new THREE.Group();
  private readonly surfacesGroup = new THREE.Group();
  private readonly outlineGroup = new THREE.Group();
  private readonly roomsGroup = new THREE.Group();
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
  private rooms: RoomRenderItem[] = [];
  private infoPoint?: InfoPointRenderItem;
  private altitudeMeters = 0;
  private opacity = 1;

  constructor(readonly id: string) {
    this.markersGroup.renderOrder = 1000;
    this.surfacesGroup.add(this.outlineGroup, this.roomsGroup);
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
    this.updateMarkerViewport();
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
    this.rebuildRooms();
    this.rebuildMarkers();
  }

  setRooms(rooms: RoomRenderItem[]): void {
    this.rooms = rooms;
    this.rebuildRooms();
    this.rebuildMarkers();
  }

  setInfoPoint(infoPoint: InfoPointRenderItem | undefined): void {
    this.infoPoint = infoPoint;
    this.rebuildMarkers();
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
    this.rooms = [];
    this.infoPoint = undefined;
    this.clearGroup(this.outlineGroup);
    this.clearGroup(this.roomsGroup);
    this.clearGroup(this.markersGroup);
    this.map?.triggerRepaint();
  }

  private rebuildOutline(): void {
    this.clearGroup(this.outlineGroup);

    const ring = getOpenRing(this.outlineCoordinates);

    if (!this.scene || ring.length < 3) {
      return;
    }

    this.origin = createMercatorOrigin(ring);
    this.modelMatrix.makeTranslation(this.origin.x, this.origin.y, this.origin.z);
    this.applyAltitude();

    const geometry = createPolygonSlabGeometry(
      this.origin,
      [ring],
      OUTLINE_THICKNESS_METERS
    );
    const outline = new THREE.Mesh(geometry, this.outlineFillMaterial);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      this.outlineEdgeMaterial
    );

    this.outlineGroup.add(outline, edges);
    this.applyOpacity();
    this.map?.triggerRepaint();
  }

  private rebuildRooms(): void {
    this.clearGroup(this.roomsGroup);

    if (!this.scene || !this.origin) {
      return;
    }

    this.rooms
      .filter((room) => room.isVisibleIn3D)
      .forEach((room) => this.addRoom(room));

    this.applyOpacity();
    this.map?.triggerRepaint();
  }

  private addRoom(room: RoomRenderItem): void {
    if (!this.origin || room.feature.geometry.type != "Polygon") {
      return;
    }

    const rings = room.feature.geometry.coordinates;
    const geometry = createPolygonSurfaceGeometry(
      this.origin,
      rings,
      ROOM_BASE_ELEVATION_METERS
    );
    const material = createDisposableMeshMaterial(
      getStyleString(room.style, "polygonFill", "#ffffff"),
      getStyleNumber(room.style, "polygonOpacity", 1)
    );
    const edgeMaterial = createDisposableLineMaterial(
      getStyleString(room.style, "lineColor", "#000000")
    );
    const mesh = new THREE.Mesh(geometry, material);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      edgeMaterial
    );

    this.roomsGroup.add(mesh, edges);
  }

  private rebuildMarkers(): void {
    this.clearGroup(this.markersGroup);

    if (!this.scene || !this.origin) {
      return;
    }

    this.addInfoPointMarker();
    this.addSelectedPositionMarkers();
    this.applyOpacity();
    this.map?.triggerRepaint();
  }

  private addInfoPointMarker(): void {
    if (!this.origin || !this.infoPoint || this.infoPoint.feature.geometry.type != "Point") {
      return;
    }

    this.addMarker(
      this.infoPoint.feature.geometry.coordinates,
      "i",
      MAPLIBRE_THREE_INFO_POINT_FILL
    );
  }

  private addSelectedPositionMarkers(): void {
    this.rooms
      .filter((room) => room.isSelected || room.selectedPositionMarker != undefined)
      .forEach((room) => {
        const marker = room.selectedPositionMarker;
        const coordinates = getGeometryLabelCenter(
          marker?.feature.geometry ?? room.feature.geometry
        );

        if (coordinates) {
          this.addMarker(
            coordinates,
            marker?.label ?? "",
            MAPLIBRE_THREE_SELECTED_POSITION_FILL
          );
        }
      });
  }

  private addMarker(
    coordinates: GeoJSON.Position,
    label: string,
    fillColor: string
  ): void {
    if (!this.origin) {
      return;
    }

    const position = createLocalMercatorVector(
      this.origin,
      coordinates,
      getMapLibreThreeMarkerElevationMeters()
    );
    const marker = createMapLibreThreeMarker({
      label,
      fillColor,
      origin: this.origin,
      anisotropy: this.renderer?.capabilities.getMaxAnisotropy() ?? 1,
    });

    marker.position.copy(position);
    this.markersGroup.add(marker);
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
    this.applyGroupOpacity(this.roomsGroup);
    this.applyGroupOpacity(this.markersGroup);
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
      const material = mesh.material;

      if (geometry instanceof THREE.BufferGeometry) {
        geometry.dispose();
      }

      if (material instanceof THREE.Material && material.userData.disposeWithObject) {
        const texture = getMapLibreThreeMaterialTexture(material);

        if (texture instanceof THREE.Texture) {
          texture.dispose();
        }

        material.dispose();
      }
    });
  }

  private applyGroupOpacity(group: THREE.Group): void {
    group.traverse((child) => {
      const material = (child as THREE.Mesh | THREE.LineSegments).material;

      if (material instanceof THREE.Material && typeof material.userData.baseOpacity == "number") {
        const opacity = material.userData.baseOpacity * this.opacity;
        const transparent = material.userData.alwaysTransparent === true || opacity < 1;

        material.opacity = opacity;

        if (material instanceof THREE.ShaderMaterial) {
          const opacityUniform = material.uniforms.opacity;

          if (opacityUniform) {
            opacityUniform.value = opacity;
          }
        }

        if (material.transparent != transparent) {
          material.transparent = transparent;
          material.needsUpdate = true;
        }
      }
    });
  }

  private updateMarkerViewport(): void {
    const canvas = this.map?.getCanvas();

    if (!canvas) {
      return;
    }

    updateMapLibreThreeMarkerViewport(this.markersGroup, canvas);
  }
}

function createDisposableMeshMaterial(
  color: string,
  baseOpacity: number
): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({
    color: createColor(color),
    opacity: baseOpacity,
    transparent: baseOpacity < 1,
    side: THREE.DoubleSide,
    depthWrite: true,
  });

  material.userData.baseOpacity = baseOpacity;
  material.userData.disposeWithObject = true;

  return material;
}

function createDisposableLineMaterial(color: string): THREE.LineBasicMaterial {
  const material = new THREE.LineBasicMaterial({
    color: createColor(color),
    opacity: ROOM_EDGE_OPACITY,
    transparent: true,
  });

  material.userData.baseOpacity = ROOM_EDGE_OPACITY;
  material.userData.disposeWithObject = true;

  return material;
}

function createColor(color: string): THREE.Color {
  try {
    return new THREE.Color(color);
  } catch {
    return new THREE.Color("#ffffff");
  }
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}
