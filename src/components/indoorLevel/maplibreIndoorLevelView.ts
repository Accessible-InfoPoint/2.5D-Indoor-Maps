import type {
  AddLayerObject,
  GeoJSONSource,
  Map as MapLibreMap,
  MapLayerMouseEvent,
} from "maplibre-gl";
import { DoorDataInterface } from "../../models/doorDataInterface";
import DoorService from "../../services/doorService";
import {
  IndoorLevelRenderModel,
  RoomRenderItem,
  StyledFeatureRenderItem,
} from "./indoorLevelRenderModel";
import { IndoorLevelView, IndoorLevelViewEvents } from "./indoorLevelView";
import { MapLibreAccessibilityMarkerRenderer } from "./maplibre/maplibreAccessibilityMarkerRenderer";
import {
  buildMapLibreDoorDebugFeatures,
  buildMapLibreDoorFeature,
  buildMapLibreRoomFeature,
  buildMapLibreRoomNumberFeature,
  buildMapLibreStyledLineFeature,
  getRoomPatternFile,
} from "./maplibre/maplibreFeatureConverters";
import {
  createLayerSet as createMapLibreLayerSet,
  getLayerId as getMapLibreLayerId,
  getSourceId as getMapLibreSourceId,
  getPatternImageId,
  LayerVisibility,
  MapLibreIndoorLevelLayerSet,
} from "./maplibre/maplibreIndoorLevelTypes";
import { registerRoomNumberBackgroundImage } from "./maplibre/maplibreImageRegistry";
import {
  getOpacityExpression,
  getZoomOpacityExpression,
} from "./maplibre/maplibreStyleHelpers";
import {
  createInfoPointLayers,
  createDoorDebugLayers,
  createDoorLayers,
  createRoomLayers,
  createRoomNumberLayers,
  createTactilePavingLayers,
} from "./maplibre/maplibreLayerDefinitions";

const SHOW_DOOR_ORIENTATION_DEBUG = false;

export class MapLibreIndoorLevelView implements IndoorLevelView {
  private readonly infoPoint: MapLibreIndoorLevelLayerSet;
  private readonly rooms: MapLibreIndoorLevelLayerSet;
  private readonly doors: MapLibreIndoorLevelLayerSet;
  private readonly doorDebug: MapLibreIndoorLevelLayerSet;
  private readonly tactilePaving: MapLibreIndoorLevelLayerSet;
  private readonly roomNumbers: MapLibreIndoorLevelLayerSet;
  private readonly accessibilityMarkers: MapLibreIndoorLevelLayerSet;
  private readonly accessibilityMarkerRenderer: MapLibreAccessibilityMarkerRenderer;
  private pendingRenderModel?: IndoorLevelRenderModel;
  private readonly roomFeaturesById = new Map<string, GeoJSON.Feature>();
  private readonly loadingPatternImageIds = new Set<string>();
  private readonly pendingLayerOperations: (() => void)[] = [];
  private visibleLayerIds = new Set<string>();
  private layersInitialized = false;
  private opacity = 1;

  constructor(
    private readonly level: number,
    private readonly map: MapLibreMap,
    private readonly events: IndoorLevelViewEvents
  ) {
    this.infoPoint = this.createLayerSet("info-point", ["circle", "label"]);
    this.rooms = this.createLayerSet("rooms", ["fill", "pattern", "line"]);
    this.doors = this.createLayerSet("doors", ["line"]);
    this.doorDebug = this.createLayerSet("door-debug", [
      "wall-context",
      "calculated-door",
      "previous-point",
      "door-point",
      "after-point",
      "label",
    ]);
    this.tactilePaving = this.createLayerSet("tactile-paving", ["line"]);
    this.roomNumbers = this.createLayerSet("room-numbers", ["label"]);
    this.accessibilityMarkers = this.createLayerSet("accessibility-markers", ["icon"]);
    this.accessibilityMarkerRenderer = new MapLibreAccessibilityMarkerRenderer(
      this.map,
      this.accessibilityMarkers.sourceId,
      getMapLibreLayerId(this.level, "accessibility-markers", "icon"),
      events
    );

    this.whenMapStyleReady(() => this.initializeLayers());
  }

  // ===== Public lifecycle ====================================================

  clear(): void {
    this.whenLayersInitialized(() => {
      this.roomFeaturesById.clear();
      this.accessibilityMarkerRenderer.clear();
      this.setSourceData(this.infoPoint.sourceId, this.emptyFeatureCollection());
      this.setSourceData(this.rooms.sourceId, this.emptyFeatureCollection());
      this.setSourceData(this.doors.sourceId, this.emptyFeatureCollection());
      this.setSourceData(this.doorDebug.sourceId, this.emptyFeatureCollection());
      this.setSourceData(this.tactilePaving.sourceId, this.emptyFeatureCollection());
      this.setSourceData(this.roomNumbers.sourceId, this.emptyFeatureCollection());
    });
  }

  render(renderModel: IndoorLevelRenderModel, selectedFeatureIds: string[]): void {
    void selectedFeatureIds;
    this.pendingRenderModel = renderModel;

    this.whenLayersInitialized(() => {
      if (this.pendingRenderModel) {
        this.renderLayerData(this.pendingRenderModel);
      }
    });
  }

  drawDoors(doors: DoorDataInterface[], selectedFeatureIds: string[]): void {
    this.whenLayersInitialized(() => {
      this.setSourceData(this.doors.sourceId, {
        type: "FeatureCollection",
        features: doors
          .filter((door) => door.rooms.length > 0)
          .flatMap((door) => DoorService.getRenderData(door, selectedFeatureIds))
          .map((doorRenderData) => buildMapLibreDoorFeature(doorRenderData)),
      });

      this.setSourceData(this.doorDebug.sourceId, {
        type: "FeatureCollection",
        features: SHOW_DOOR_ORIENTATION_DEBUG
          ? doors.flatMap((door) => buildMapLibreDoorDebugFeatures(door))
          : [],
      });
    });
  }

  hideAll(): void {
    this.visibleLayerIds.clear();
    this.setLayerSetsVisibility("none");
    this.setAltitudeAndOpacity(0, 1);
  }

  showAll(): void {
    this.setVisibleLayerSets([
      this.infoPoint,
      this.rooms,
      this.doors,
      ...(SHOW_DOOR_ORIENTATION_DEBUG ? [this.doorDebug] : []),
      this.tactilePaving,
      this.roomNumbers,
      this.accessibilityMarkers,
    ]);
    this.setAltitudeAndOpacity(0, 1);
  }

  show2DView(): void {
    this.setVisibleLayerSets([
      this.infoPoint,
      this.rooms,
      this.doors,
      ...(SHOW_DOOR_ORIENTATION_DEBUG ? [this.doorDebug] : []),
      this.tactilePaving,
      this.roomNumbers,
      this.accessibilityMarkers,
    ]);
    this.setAltitudeAndOpacity(0, 1);
  }

  show3DView(): void {
    this.setVisibleLayerSets([
      this.infoPoint,
    ]);
    this.setAltitudeAndOpacity(0, 1);
  }

  animateAltitude(
    _start: number,
    _end: number,
    _opacityStart: number,
    opacityEnd: number
  ): Promise<void> {
    this.setAltitudeAndOpacity(0, opacityEnd);
    return Promise.resolve();
  }

  setAltitudeAndOpacity(_altitude: number, opacity: number): void {
    this.opacity = opacity;
    this.whenLayersInitialized(() => this.applyOpacity());
  }

  // ===== Layer setup =========================================================

  private initializeLayers(): void {
    if (this.layersInitialized) {
      return;
    }

    this.addGeoJsonSource(this.infoPoint.sourceId);
    this.addGeoJsonSource(this.rooms.sourceId);
    this.addGeoJsonSource(this.doors.sourceId);
    this.addGeoJsonSource(this.doorDebug.sourceId);
    this.addGeoJsonSource(this.tactilePaving.sourceId);
    this.addGeoJsonSource(this.roomNumbers.sourceId);
    this.addGeoJsonSource(this.accessibilityMarkers.sourceId);

    registerRoomNumberBackgroundImage(this.map);
    this.addRoomLayers();
    this.addDoorLayers();
    this.addDoorDebugLayers();
    this.addTactilePavingLayers();
    this.addRoomNumberLayers();
    this.addAccessibilityMarkerLayers();
    this.addInfoPointLayers();

    this.applyOpacity();
    this.setLayerSetsVisibility("none");
    this.applyVisibleLayers();
    this.layersInitialized = true;

    this.flushPendingLayerOperations();
  }

  private addInfoPointLayers(): void {
    this.addLayers(createInfoPointLayers(this.getLayerDefinitionOptions()));
  }

  private addRoomLayers(): void {
    this.addLayers(createRoomLayers(this.getLayerDefinitionOptions()));
    this.bindRoomEvents();
  }

  private addDoorLayers(): void {
    this.addLayers(createDoorLayers(this.getLayerDefinitionOptions()));
  }

  private addDoorDebugLayers(): void {
    this.addLayers(createDoorDebugLayers(this.getLayerDefinitionOptions()));
  }

  private addTactilePavingLayers(): void {
    this.addLayers(createTactilePavingLayers(this.getLayerDefinitionOptions()));
  }

  private addRoomNumberLayers(): void {
    this.addLayers(createRoomNumberLayers(this.getLayerDefinitionOptions()));
  }

  private addAccessibilityMarkerLayers(): void {
    this.addLayer(this.accessibilityMarkerRenderer.createLayer());
    this.accessibilityMarkerRenderer.bindEvents();
  }

  // ===== Render pipelines ===================================================

  private renderLayerData(renderModel: IndoorLevelRenderModel): void {
    this.renderOutline(renderModel.outlineCoordinates);
    this.renderInfoPoint(renderModel);
    this.renderRooms(renderModel.rooms);
    this.renderTactilePaving(renderModel.tactilePaving);
    this.renderRoomNumbers(renderModel.rooms);
    this.renderAccessibilityMarkers(renderModel);
  }

  private renderOutline(outlineCoordinates: number[][]): void {
    void outlineCoordinates;
  }

  private renderInfoPoint(renderModel: IndoorLevelRenderModel): void {
    this.setSourceData(
      this.infoPoint.sourceId,
      renderModel.infoPoint
        ? {
            type: "FeatureCollection",
            features: [
              {
                ...renderModel.infoPoint.feature,
                properties: {
                  ...renderModel.infoPoint.feature.properties,
                  label: "i",
                },
              },
            ],
          }
        : this.emptyFeatureCollection()
    );
  }

  private renderRooms(rooms: RoomRenderItem[]): void {
    this.roomFeaturesById.clear();
    this.registerRoomPatternImages(rooms);
    const roomFeatures = rooms.map((room) => buildMapLibreRoomFeature(room));
    roomFeatures.forEach((roomFeature) => {
      this.roomFeaturesById.set(roomFeature.featureId, roomFeature.sourceFeature);
    });
    this.setSourceData(this.rooms.sourceId, {
      type: "FeatureCollection",
      features: roomFeatures.map((roomFeature) => roomFeature.feature),
    });
  }

  private renderTactilePaving(items: StyledFeatureRenderItem[]): void {
    this.setSourceData(this.tactilePaving.sourceId, {
      type: "FeatureCollection",
      features: items.map((item) => buildMapLibreStyledLineFeature(item)),
    });
  }

  private renderRoomNumbers(rooms: RoomRenderItem[]): void {
    this.setSourceData(this.roomNumbers.sourceId, {
      type: "FeatureCollection",
      features: rooms
        .map((room) => buildMapLibreRoomNumberFeature(room))
        .filter((feature): feature is GeoJSON.Feature<GeoJSON.Point> => feature != undefined),
    });
  }

  private renderAccessibilityMarkers(renderModel: IndoorLevelRenderModel): void {
    this.accessibilityMarkerRenderer.render(renderModel);
  }

  // ===== MapLibre sources and layers ========================================

  private addGeoJsonSource(sourceId: string): void {
    if (this.map.getSource(sourceId)) {
      return;
    }

    this.map.addSource(sourceId, {
      type: "geojson",
      data: this.emptyFeatureCollection(),
    });
  }

  private addLayer(layer: AddLayerObject): void {
    if (!this.map.getLayer(layer.id)) {
      this.map.addLayer(layer);
    }
  }

  private addLayers(layers: AddLayerObject[]): void {
    layers.forEach((layer) => this.addLayer(layer));
  }

  private getLayerDefinitionOptions() {
    return {
      layerId: (name: string, layerName: string) => this.getLayerId(name, layerName),
      sourceId: (name: string) => getMapLibreSourceId(this.level, name),
      opacity: this.opacity,
    };
  }

  private setSourceData(sourceId: string, data: GeoJSON.FeatureCollection): void {
    const source = this.map.getSource(sourceId) as GeoJSONSource | undefined;

    if (source) {
      source.setData(data);
    }
  }

  // ===== Visibility and opacity =============================================

  private setVisibleLayerSets(layerSets: MapLibreIndoorLevelLayerSet[]): void {
    this.visibleLayerIds = new Set(layerSets.flatMap((layerSet) => layerSet.layerIds));
    this.setLayerSetsVisibility("none");

    layerSets.forEach((layerSet) => {
      layerSet.layerIds.forEach((layerId) => this.setLayerVisibility(layerId, "visible"));
    });
  }

  private applyVisibleLayers(): void {
    this.visibleLayerIds.forEach((layerId) => this.setLayerVisibility(layerId, "visible"));
  }

  private setLayerSetsVisibility(visibility: LayerVisibility): void {
    [
      this.infoPoint,
      this.rooms,
      this.doors,
      this.doorDebug,
      this.tactilePaving,
      this.roomNumbers,
      this.accessibilityMarkers,
    ].forEach((layerSet) => {
      layerSet.layerIds.forEach((layerId) => this.setLayerVisibility(layerId, visibility));
    });
  }

  private setLayerVisibility(layerId: string, visibility: LayerVisibility): void {
    if (this.map.getLayer(layerId)) {
      this.map.setLayoutProperty(layerId, "visibility", visibility);
    }
  }

  private applyOpacity(): void {
    this.setPaintProperty(this.getLayerId("info-point", "circle"), "circle-opacity", this.opacity);
    this.setPaintProperty(this.getLayerId("info-point", "label"), "text-opacity", this.opacity);
    this.setPaintProperty(this.getLayerId("rooms", "fill"), "fill-opacity", getOpacityExpression("fillOpacity", this.opacity));
    this.setPaintProperty(this.getLayerId("rooms", "pattern"), "fill-opacity", getOpacityExpression("fillOpacity", this.opacity));
    this.setPaintProperty(this.getLayerId("rooms", "line"), "line-opacity", getOpacityExpression("lineOpacity", this.opacity));
    this.setPaintProperty(this.getLayerId("doors", "line"), "line-opacity", getOpacityExpression("lineOpacity", this.opacity));
    this.setPaintProperty(this.getLayerId("door-debug", "wall-context"), "line-opacity", this.opacity);
    this.setPaintProperty(this.getLayerId("door-debug", "calculated-door"), "line-opacity", this.opacity);
    this.setPaintProperty(this.getLayerId("door-debug", "previous-point"), "circle-opacity", this.opacity);
    this.setPaintProperty(this.getLayerId("door-debug", "previous-point"), "circle-stroke-opacity", this.opacity);
    this.setPaintProperty(this.getLayerId("door-debug", "door-point"), "circle-opacity", this.opacity);
    this.setPaintProperty(this.getLayerId("door-debug", "door-point"), "circle-stroke-opacity", this.opacity);
    this.setPaintProperty(this.getLayerId("door-debug", "after-point"), "circle-opacity", this.opacity);
    this.setPaintProperty(this.getLayerId("door-debug", "after-point"), "circle-stroke-opacity", this.opacity);
    this.setPaintProperty(this.getLayerId("door-debug", "label"), "text-opacity", this.opacity);
    this.setPaintProperty(this.getLayerId("tactile-paving", "line"), "line-opacity", getOpacityExpression("lineOpacity", this.opacity));
    this.setPaintProperty(this.getLayerId("room-numbers", "label"), "text-opacity", getZoomOpacityExpression(this.opacity));
    this.setPaintProperty(this.getLayerId("room-numbers", "label"), "icon-opacity", getZoomOpacityExpression(this.opacity));
    this.accessibilityMarkerRenderer.applyOpacity(this.opacity);
  }

  private setPaintProperty(layerId: string, property: string, value: unknown): void {
    if (this.map.getLayer(layerId)) {
      this.map.setPaintProperty(layerId, property, value);
    }
  }

  // ===== Feature assets ======================================================

  private createLayerSet(name: string, layerNames: string[]): MapLibreIndoorLevelLayerSet {
    return createMapLibreLayerSet(this.level, name, layerNames);
  }

  private registerRoomPatternImages(rooms: RoomRenderItem[]): void {
    rooms
      .map((room) => getRoomPatternFile(room))
      .filter((patternFile) => patternFile.length > 0)
      .forEach((patternFile) => this.registerPatternImage(patternFile));
  }

  private registerPatternImage(patternFile: string): void {
    const imageId = getPatternImageId(patternFile);

    if (this.map.hasImage(imageId) || this.loadingPatternImageIds.has(imageId)) {
      return;
    }

    this.loadingPatternImageIds.add(imageId);
    this.map.loadImage(patternFile)
      .then((image) => {
        if (!this.map.hasImage(imageId)) {
          this.map.addImage(imageId, image.data);
          this.map.triggerRepaint();
        }
      })
      .catch((error: unknown) => {
        console.warn(`Could not load MapLibre fill pattern "${patternFile}".`, error);
      })
      .finally(() => {
        this.loadingPatternImageIds.delete(imageId);
      });
  }

  // ===== Interaction =========================================================

  private bindRoomEvents(): void {
    const fillLayerId = this.getLayerId("rooms", "fill");

    this.map.on("click", fillLayerId, (event) => this.handleRoomClick(event));
    this.map.on("mouseenter", fillLayerId, () => {
      this.map.getCanvas().style.cursor = "pointer";
    });
    this.map.on("mouseleave", fillLayerId, () => {
      this.map.getCanvas().style.cursor = "";
    });
  }

  private handleRoomClick(event: MapLayerMouseEvent): void {
    if (this.hasAccessibilityMarkerAtClickPoint(event)) {
      return;
    }

    const featureId = event.features?.[0]?.properties?.__featureId;

    if (typeof featureId != "string") {
      return;
    }

    const feature = this.roomFeaturesById.get(featureId);

    if (feature) {
      this.events.onFeatureSelected(feature);
    }
  }

  private hasAccessibilityMarkerAtClickPoint(event: MapLayerMouseEvent): boolean {
    return this.accessibilityMarkerRenderer.hasMarkerAtClickPoint(event);
  }

  // ===== Id helpers ==========================================================

  private getLayerId(name: string, layerName: string): string {
    return getMapLibreLayerId(this.level, name, layerName);
  }

  private emptyFeatureCollection(): GeoJSON.FeatureCollection {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  // ===== Map style readiness =================================================

  private whenMapStyleReady(callback: () => void): void {
    if (this.map.isStyleLoaded()) {
      callback();
    } else {
      this.map.once("load", callback);
    }
  }

  private whenLayersInitialized(callback: () => void): void {
    if (this.layersInitialized) {
      callback();
      return;
    }

    this.pendingLayerOperations.push(callback);
  }

  private flushPendingLayerOperations(): void {
    this.pendingLayerOperations.splice(0).forEach((operation) => operation());
  }
}
