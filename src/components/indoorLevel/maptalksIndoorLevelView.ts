import * as Maptalks from "maptalks";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import PolygonCenter from "geojson-polygon-center";
import { BaseObject, ThreeLayer } from "maptalks.three";
import { DoubleSide, MeshBasicMaterial, Plane, Vector3 } from "three";
import { MARKERS_IMG_DIR, ICONS } from "../../../public/strings/constants.json";
import {
  LEVEL_HEIGHT,
  STAIRCASE_OPACITY,
  STAIRCASE_OUTLINE_OPACITY,
} from "../../../public/strings/settings.json";
import { colors } from "../../services/colorService";
import DoorService from "../../services/doorService";
import FeatureService from "../../services/featureService";
import { DoorDataInterface } from "../../models/doorDataInterface";
import { MarkerClusterLayer } from "../markerClusterLayer";
import { complexStaircase, filterConnectedPathways } from "../threejs/complexStaircase";
import { simpleStaircase } from "../threejs/simpleStaircase";
import {
  IndoorLevelRenderModel,
  PositionMarkerRenderItem,
  RoomRenderItem,
} from "./indoorLevelRenderModel";

type FeatureClickHandler = (feature: GeoJSON.Feature) => void;

export class MaptalksIndoorLevelView {
  private readonly roomsInstance: Maptalks.VectorLayer;
  private readonly roomNumbersInstance: Maptalks.VectorLayer;
  private readonly doorsInstance: Maptalks.VectorLayer;
  private readonly outlineInstance: Maptalks.VectorLayer;
  private readonly positionLayer: Maptalks.VectorLayer;
  private readonly markers: MarkerClusterLayer;
  private threeLayer: ThreeLayer;
  private meshes: BaseObject[] = [];
  private altitude: number;

  private readonly staircaseMaterial = new MeshBasicMaterial({
    color: colors.stairsColor,
    opacity: STAIRCASE_OPACITY,
    transparent: true,
    side: DoubleSide,
  });
  private readonly staircaseOutlineMaterial = new MeshBasicMaterial({
    color: colors.stairsColor,
    opacity: STAIRCASE_OUTLINE_OPACITY,
    transparent: true,
    side: DoubleSide,
  });
  private readonly staircaseSelectedMaterial = new MeshBasicMaterial({
    color: colors.roomColorS,
    opacity: STAIRCASE_OPACITY,
    transparent: true,
    side: DoubleSide,
  });
  private readonly staircaseSelectedOutlineMaterial = new MeshBasicMaterial({
    color: colors.roomColorS,
    opacity: STAIRCASE_OUTLINE_OPACITY,
    transparent: true,
    side: DoubleSide,
  });

  constructor(
    private readonly level: number,
    altitude: number,
    private readonly map: Maptalks.Map,
    private readonly onFeatureClick: FeatureClickHandler
  ) {
    this.altitude = altitude;

    this.roomsInstance = new Maptalks.VectorLayer("indoor" + level, undefined, {
      enableAltitude: true,
    }).addTo(map);
    this.roomNumbersInstance = new Maptalks.VectorLayer(
      "roomNumbers" + level,
      undefined,
      {
        enableAltitude: true,
        altitude: altitude,
        minZoom: 20.5,
      }
    ).addTo(map);
    this.doorsInstance = new Maptalks.VectorLayer("doors" + level, undefined, {
      enableAltitude: true,
      altitude: altitude,
    }).addTo(map);
    this.outlineInstance = new Maptalks.VectorLayer(
      "outline" + level,
      undefined,
      {
        enableAltitude: true,
        altitude: altitude,
      }
    ).addTo(map);
    this.threeLayer = new ThreeLayer("stairs" + level, {
      forceRenderOnMoving: true,
      forceRenderOnRotating: true,
    }).addTo(map);
    this.markers = new MarkerClusterLayer(
      "markerCluster" + level,
      onFeatureClick,
      undefined,
      {
        symbol: {
          markerFile: MARKERS_IMG_DIR + ICONS.ADDITIONAL,
          markerWidth: 48,
          markerHeight: 48,
          markerHorizontalAlignment: "middle",
          markerVerticalAlignment: "middle",
        },
      },
      {
        enableAltitude: true,
        altitude: altitude,
      }
    ).addTo(map);
    this.positionLayer = new Maptalks.VectorLayer(
      "positionLayer" + level,
      undefined,
      {
        enableAltitude: true,
        altitude: altitude,
      }
    ).addTo(map);
  }

  clear(): void {
    this.roomsInstance.clear();
    this.roomNumbersInstance.clear();
    this.doorsInstance.clear();
    this.markers.clear();
    this.positionLayer.clear();
    this.outlineInstance.clear();
    const tempVisibility = this.threeLayer.isVisible();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.map.removeLayer(this.threeLayer);
    this.threeLayer = new ThreeLayer("stairs" + this.level, {
      forceRenderOnMoving: true,
      forceRenderOnRotating: true,
    });
    if (!tempVisibility) {
      this.threeLayer.hide();
    }
    this.threeLayer = this.threeLayer.addTo(this.map);
  }

  render(renderModel: IndoorLevelRenderModel, selectedFeatureIds: string[]): void {
    this.markers.clear();
    this.renderOutline(renderModel.outlineCoordinates);

    if (renderModel.infoPoint) {
      this.renderInfoPoint(renderModel.infoPoint.feature);
    }

    renderModel.rooms.forEach((item) => this.renderRoom(item));
    renderModel.tactilePaving.forEach((item) => {
      const geo = Maptalks.GeoJSON.toGeometry(item.feature);
      geo.updateSymbol(item.style);
      this.roomsInstance.addGeometry(geo);
    });
    renderModel.pointMarkerFeatures.forEach((feature) => {
      this.addMarker(feature);
    });
    this.markers.updateMarkers();

    this.renderStaircases(renderModel, selectedFeatureIds);
  }

  drawDoors(doors: DoorDataInterface[]): void {
    doors.forEach(door => {
      if (door.rooms.length == 0) {
        console.log("empty door", door);
        return;
      }

      this.doorsInstance.addGeometry(DoorService.getVisualization(door));
    });
  }

  hideAll(): void {
    this.threeLayer.hide();
    this.outlineInstance.hide();
    this.doorsInstance.hide();
    this.markers.getLayer().hide();
    this.roomNumbersInstance.hide();
    this.roomsInstance.hide();
    this.positionLayer.hide();
    this.setAltitudeAndOpacity(0, 1);
  }

  showAll(): void {
    this.threeLayer.show();
    this.outlineInstance.show();
    this.doorsInstance.show();
    this.markers.getLayer().show();
    this.roomNumbersInstance.show();
    this.roomsInstance.show();
    this.positionLayer.show();
    this.setAltitudeAndOpacity(0, 1);
  }

  hide3D(): void {
    this.threeLayer.hide();
    this.outlineInstance.hide();
    this.doorsInstance.show();
    this.markers.getLayer().show();
    this.roomNumbersInstance.show();
    this.roomsInstance.show();
    this.positionLayer.show();
    this.setAltitudeAndOpacity(0, 1);
  }

  show3D(): void {
    this.threeLayer.show();
    this.outlineInstance.show();
    this.doorsInstance.hide();
    this.markers.getLayer().hide();
    this.roomNumbersInstance.hide();
    this.roomsInstance.hide();
    this.positionLayer.show();
    this.setAltitudeAndOpacity(0, 0);
  }

  async animateAltitude(
    start: number,
    end: number,
    opacityStart: number,
    opacityEnd: number,
    duration = 0.5
  ): Promise<void> {
    let startTime: number | null = null;
    const layers = [
      this.positionLayer,
      this.outlineInstance,
    ];
    const threelayer = this.threeLayer;
    const meshes = this.meshes;
    const material1 = this.staircaseMaterial;
    const material2 = this.staircaseOutlineMaterial;
    const selectedMaterial1 = this.staircaseSelectedMaterial;
    const selectedMaterial2 = this.staircaseSelectedOutlineMaterial;
    this.altitude = end;

    function easeOutCubic(x: number): number {
      return 1 - Math.pow(1 - x, 3);
    }

    function animate(time: number) {
      if (!startTime) startTime = time;
      const elapsed = (time - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);

      const altitude = start + easeOutCubic(progress) * (end - start);
      const opacity = opacityStart + progress * (opacityEnd - opacityStart);

      layers.forEach((l) => l.setOptions({ altitude, opacity }));
      meshes.forEach((mesh) => {
        mesh.setAltitude(altitude);
      });
      threelayer.renderScene();
      material1.opacity = opacity * STAIRCASE_OPACITY;
      material2.opacity = opacity * STAIRCASE_OUTLINE_OPACITY;
      selectedMaterial1.opacity = opacity * STAIRCASE_OPACITY;
      selectedMaterial2.opacity = opacity * STAIRCASE_OUTLINE_OPACITY;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame((time) => {
        startTime = time;
        animate(time);
        setTimeout(resolve, duration * 1000);
      });
    });
  }

  setAltitudeAndOpacity(altitude: number, opacity: number): void {
    [this.roomsInstance, this.roomNumbersInstance, this.doorsInstance, this.markers.getLayer()].forEach((l) => l.setOptions({ altitude, opacity }));
  }

  private renderOutline(outlineCoordinates: number[][]): void {
    const outlineGeo = new Maptalks.Polygon(outlineCoordinates);
    outlineGeo.updateSymbol({ polygonFill: "#4d4d4d", polygonOpacity : 0.8});
    this.outlineInstance.addGeometry(outlineGeo);
  }

  private renderRoom(item: RoomRenderItem): void {
    const geo = Maptalks.GeoJSON.toGeometry(item.feature);
    geo.updateSymbol(item.style);

    if (item.selectedPositionMarker) {
      this.renderSelectedPositionMarker(item.selectedPositionMarker);
    }
    if (item.isVisibleIn3D) {
      this.outlineInstance.addGeometry(geo.copy());
    }
    geo.on("click", () => this.onFeatureClick(item.feature));
    this.roomsInstance.addGeometry(geo);
    this.showRoomNumber(item);
    this.addMarker(item.feature);
  }

  private renderInfoPoint(feature: GeoJSON.Feature): void {
    new Maptalks.Marker((feature.geometry as GeoJSON.Point).coordinates, {
      properties: {
        name: "i",
      },
      symbol: [
        {
          markerType: "pin",
          markerFill: "rgb(255, 195, 195)",
          markerLineColor: "#000000",
          markerLineWidth: 2,
          markerWidth: 80,
          markerHeight: 70,
        },
        {
          textFaceName: "sans-serif",
          textName: "{name}",
          textSize: 18,
          textDy: -35,
        } as Maptalks.TextSymbol,
      ],
    }).addTo(this.positionLayer);
  }

  private renderSelectedPositionMarker(marker: PositionMarkerRenderItem): void {
    new Maptalks.Marker(PolygonCenter(marker.feature.geometry).coordinates, {
      properties: { name: marker.label },
      symbol: [
        {
          markerType: "pin",
          markerFill: "rgb(195, 255, 195)",
          markerLineColor: "#000000",
          markerLineWidth: 2,
          markerWidth: 80,
          markerHeight: 70,
        },
        {
          textFaceName: "sans-serif",
          textName: "{name}",
          textSize: 18,
          textDy: -35,
        } as Maptalks.TextSymbol,
      ],
    }).addTo(this.positionLayer);
  }

  private addMarker(feature: GeoJSON.Feature<any, any>): void {
    const marker = FeatureService.getAccessibilityMarker(feature);
    if (marker) {
      marker.setId(feature.id.toString());
      this.markers.addMarkers({ marker: marker, feature: feature });
    }
  }

  private showRoomNumber(item: RoomRenderItem): void {
    if (!item.label)
      return;

    new Maptalks.Marker(PolygonCenter(item.feature.geometry).coordinates, {
      symbol: {
        textName: item.label,
        textHorizontalAlignment: "middle",
        textVerticalAlignment: "middle",
        textFill: "#000",
        textOpacity: 1,
        textHaloFill: "#fff",
        textHaloRadius: 5,
      } as Maptalks.TextSymbol,
    }).addTo(this.roomNumbersInstance);
  }

  private renderStaircases(renderModel: IndoorLevelRenderModel, selectedFeatureIds: string[]): void {
    const meshes: BaseObject[] = [];
    const material1 = this.staircaseMaterial;
    const material2 = this.staircaseOutlineMaterial;
    const selectedMaterial1 = this.staircaseSelectedMaterial;
    const selectedMaterial2 = this.staircaseSelectedOutlineMaterial;
    const altitude = this.altitude;
    const level = this.level;
    const staircase = renderModel.staircase;
    const onclick = (feature: GeoJSON.Feature) => this.onFeatureClick(feature);

    this.threeLayer.prepareToDraw = function() {
      this.getRenderer().context.clippingPlanes = [new Plane(new Vector3(0, 0, -1), this.altitudeToVector3(2.25 * LEVEL_HEIGHT, 2.25 * LEVEL_HEIGHT).x)];

      meshes.push(
        ...staircase.simpleFeatures.flatMap(feature =>
          simpleStaircase(
            (feature.geometry as GeoJSON.Polygon).coordinates[0],
            altitude,
            selectedFeatureIds.includes(feature.id.toString()) ? selectedMaterial1 : material1,
            selectedFeatureIds.includes(feature.id.toString()) ? selectedMaterial2 : material2,
            this,
            () => onclick(feature)
          )
        )
      );
      staircase.complexFeatures.forEach(feature => {
        meshes.push(
          ...complexStaircase(
            filterConnectedPathways(feature, staircase.doorCoordinates, staircase.lowestPoints, staircase.pathways, level),
            staircase.allNodes,
            altitude,
            selectedFeatureIds.includes(feature.id.toString()) ? selectedMaterial1 : material1,
            this,
            () => onclick(feature)
          )
        );
      });
      this.addMesh(meshes);
    };

    this.meshes = meshes;
    this.meshes.forEach((mesh) => mesh.setAltitude(altitude));
  }
}
