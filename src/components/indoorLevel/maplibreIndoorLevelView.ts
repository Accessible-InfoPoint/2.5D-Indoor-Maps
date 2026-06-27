import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapLayerMouseEvent,
} from "maplibre-gl";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import polygonCenter from "geojson-polygon-center";
import { getRequiredFeatureId } from "../../utils/geoJsonHelpers";
import {
  IndoorLevelRenderModel,
  RoomRenderItem,
  StyledFeatureRenderItem,
} from "./indoorLevelRenderModel";
import { IndoorLevelView, IndoorLevelViewEvents } from "./indoorLevelView";

type LayerVisibility = "visible" | "none";
type OpacityExpression = ["*", ["coalesce", ["get", string], number], number];
type PatternExpression = ["get", string];
type ZoomOpacityExpression = [
  "interpolate",
  ["linear"],
  ["zoom"],
  number,
  number,
  number,
  number
];

const ROOM_NUMBER_FADE_START_ZOOM = 19.8;
const ROOM_NUMBER_FADE_END_ZOOM = 20.3;
const ROOM_NUMBER_BACKGROUND_IMAGE_ID = "room-number-background";
const ROOM_NUMBER_BACKGROUND_SIZE = 24;
const ROOM_NUMBER_BACKGROUND_BORDER = 6;

interface MapLibreIndoorLevelLayerSet {
  sourceId: string;
  layerIds: string[];
}

export class MapLibreIndoorLevelView implements IndoorLevelView {
  private readonly infoPoint: MapLibreIndoorLevelLayerSet;
  private readonly rooms: MapLibreIndoorLevelLayerSet;
  private readonly tactilePaving: MapLibreIndoorLevelLayerSet;
  private readonly roomNumbers: MapLibreIndoorLevelLayerSet;
  private readonly accessibilityMarkers: MapLibreIndoorLevelLayerSet;
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
    this.tactilePaving = this.createLayerSet("tactile-paving", ["line"]);
    this.roomNumbers = this.createLayerSet("room-numbers", ["label"]);
    this.accessibilityMarkers = this.createLayerSet("accessibility-markers", ["icon"]);

    this.whenMapStyleReady(() => this.initializeLayers());
  }

  // ===== Public lifecycle ====================================================

  clear(): void {
    this.whenLayersInitialized(() => {
      this.roomFeaturesById.clear();
      this.setSourceData(this.infoPoint.sourceId, this.emptyFeatureCollection());
      this.setSourceData(this.rooms.sourceId, this.emptyFeatureCollection());
      this.setSourceData(this.tactilePaving.sourceId, this.emptyFeatureCollection());
      this.setSourceData(this.roomNumbers.sourceId, this.emptyFeatureCollection());
      this.setSourceData(this.accessibilityMarkers.sourceId, this.emptyFeatureCollection());
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

  drawDoors(): void {}

  hideAll(): void {
    this.visibleLayerIds.clear();
    this.setLayerSetsVisibility("none");
    this.setAltitudeAndOpacity(0, 1);
  }

  showAll(): void {
    this.setVisibleLayerSets([
      this.infoPoint,
      this.rooms,
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
    this.addGeoJsonSource(this.tactilePaving.sourceId);
    this.addGeoJsonSource(this.roomNumbers.sourceId);
    this.addGeoJsonSource(this.accessibilityMarkers.sourceId);

    this.registerRoomNumberBackgroundImage();
    this.addRoomLayers();
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
    this.addLayer({
      id: this.getLayerId("info-point", "circle"),
      type: "circle",
      source: this.infoPoint.sourceId,
      paint: {
        "circle-color": "rgb(255, 195, 195)",
        "circle-radius": 18,
        "circle-stroke-color": "#000000",
        "circle-stroke-width": 2,
        "circle-opacity": this.opacity,
      },
    });
    this.addLayer({
      id: this.getLayerId("info-point", "label"),
      type: "symbol",
      source: this.infoPoint.sourceId,
      layout: {
        "text-field": ["get", "label"],
        "text-size": 18,
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#000000",
        "text-opacity": this.opacity,
      },
    });
  }

  private addRoomLayers(): void {
    this.addLayer({
      id: this.getLayerId("rooms", "fill"),
      type: "fill",
      source: this.rooms.sourceId,
      paint: {
        "fill-color": ["coalesce", ["get", "fillColor"], "#ffffff"],
        "fill-opacity": this.getOpacityExpression("fillOpacity"),
      },
    });
    this.addLayer({
      id: this.getLayerId("rooms", "pattern"),
      type: "fill",
      source: this.rooms.sourceId,
      filter: ["has", "patternImageId"],
      paint: {
        "fill-pattern": this.getPatternExpression("patternImageId"),
        "fill-opacity": this.getOpacityExpression("fillOpacity"),
      },
    });
    this.addLayer({
      id: this.getLayerId("rooms", "line"),
      type: "line",
      source: this.rooms.sourceId,
      paint: {
        "line-color": ["coalesce", ["get", "lineColor"], "#000000"],
        "line-width": ["coalesce", ["get", "lineWidth"], 1],
        "line-opacity": this.getOpacityExpression("lineOpacity"),
      },
    });
    this.bindRoomEvents();
  }

  private addTactilePavingLayers(): void {
    this.addLayer({
      id: this.getLayerId("tactile-paving", "line"),
      type: "line",
      source: this.tactilePaving.sourceId,
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": ["coalesce", ["get", "lineColor"], "#000000"],
        "line-width": ["coalesce", ["get", "lineWidth"], 1],
        "line-opacity": this.getOpacityExpression("lineOpacity"),
        "line-dasharray": ["coalesce", ["get", "lineDasharray"], ["literal", [10, 10]]],
      },
    });
  }

  private addRoomNumberLayers(): void {
    this.addLayer({
      id: this.getLayerId("room-numbers", "label"),
      type: "symbol",
      source: this.roomNumbers.sourceId,
      minzoom: ROOM_NUMBER_FADE_START_ZOOM,
      layout: {
        "icon-image": ROOM_NUMBER_BACKGROUND_IMAGE_ID,
        "icon-text-fit": "both",
        "icon-text-fit-padding": [4, 7, 4, 7],
        "icon-allow-overlap": true,
        "text-field": ["get", "label"],
        "text-size": 14,
        "text-anchor": "center",
        "text-justify": "center",
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#000000",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1,
        "text-opacity": this.getZoomOpacityExpression(),
        "icon-opacity": this.getZoomOpacityExpression(),
      },
    });
  }

  private addAccessibilityMarkerLayers(): void {
    this.addLayer({
      id: this.getLayerId("accessibility-markers", "icon"),
      type: "circle",
      source: this.accessibilityMarkers.sourceId,
      paint: {
        "circle-color": "#ffffff",
        "circle-radius": 0,
        "circle-opacity": 0,
      },
    });
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
    this.setSourceData(this.rooms.sourceId, {
      type: "FeatureCollection",
      features: rooms.map((room) => this.buildRoomFeature(room)),
    });
  }

  private renderTactilePaving(items: StyledFeatureRenderItem[]): void {
    this.setSourceData(this.tactilePaving.sourceId, {
      type: "FeatureCollection",
      features: items.map((item) => this.buildStyledLineFeature(item)),
    });
  }

  private renderRoomNumbers(rooms: RoomRenderItem[]): void {
    this.setSourceData(this.roomNumbers.sourceId, {
      type: "FeatureCollection",
      features: rooms
        .map((room) => this.buildRoomNumberFeature(room))
        .filter((feature): feature is GeoJSON.Feature<GeoJSON.Point> => feature != undefined),
    });
  }

  private renderAccessibilityMarkers(renderModel: IndoorLevelRenderModel): void {
    void renderModel;
    this.setSourceData(this.accessibilityMarkers.sourceId, this.emptyFeatureCollection());
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

  private addLayer(layer: maplibregl.AddLayerObject): void {
    if (!this.map.getLayer(layer.id)) {
      this.map.addLayer(layer);
    }
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
    this.setPaintProperty(this.getLayerId("rooms", "fill"), "fill-opacity", this.getOpacityExpression("fillOpacity"));
    this.setPaintProperty(this.getLayerId("rooms", "pattern"), "fill-opacity", this.getOpacityExpression("fillOpacity"));
    this.setPaintProperty(this.getLayerId("rooms", "line"), "line-opacity", this.getOpacityExpression("lineOpacity"));
    this.setPaintProperty(this.getLayerId("tactile-paving", "line"), "line-opacity", this.getOpacityExpression("lineOpacity"));
    this.setPaintProperty(this.getLayerId("room-numbers", "label"), "text-opacity", this.getZoomOpacityExpression());
    this.setPaintProperty(this.getLayerId("room-numbers", "label"), "icon-opacity", this.getZoomOpacityExpression());
  }

  private setPaintProperty(layerId: string, property: string, value: unknown): void {
    if (this.map.getLayer(layerId)) {
      this.map.setPaintProperty(layerId, property, value);
    }
  }

  // ===== Feature conversion ==================================================

  private createLayerSet(name: string, layerNames: string[]): MapLibreIndoorLevelLayerSet {
    return {
      sourceId: this.getSourceId(name),
      layerIds: layerNames.map((layerName) => this.getLayerId(name, layerName)),
    };
  }

  private buildRoomFeature(item: RoomRenderItem): GeoJSON.Feature {
    const featureId = getRequiredFeatureId(item.feature);
    const patternFile = this.getStyleString(item.style, "polygonPatternFile", "");
    this.roomFeaturesById.set(featureId, item.feature);

    return {
      ...item.feature,
      properties: {
        ...item.feature.properties,
        __featureId: featureId,
        fillColor: this.getStyleString(item.style, "polygonFill", "#ffffff"),
        fillOpacity: this.getStyleNumber(item.style, "polygonOpacity", 1),
        lineColor: this.getStyleString(item.style, "lineColor", "#000000"),
        lineWidth: this.getStyleNumber(item.style, "lineWidth", 1),
        lineOpacity: this.getStyleNumber(item.style, "lineOpacity", 1),
        patternFile,
        ...(patternFile
          ? {
              patternImageId: this.getPatternImageId(patternFile),
            }
          : {}),
      },
    };
  }

  private buildRoomNumberFeature(item: RoomRenderItem): GeoJSON.Feature<GeoJSON.Point> | undefined {
    if (!item.label) {
      return undefined;
    }

    const coordinates = this.getGeometryLabelCenter(item.feature.geometry);

    if (!coordinates) {
      return undefined;
    }

    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates,
      },
      properties: {
        label: item.label,
      },
    };
  }

  private buildStyledLineFeature(item: StyledFeatureRenderItem): GeoJSON.Feature {
    return {
      ...item.feature,
      properties: {
        ...item.feature.properties,
        lineColor: this.getStyleString(item.style, "lineColor", "#000000"),
        lineWidth: this.getStyleNumber(item.style, "lineWidth", 1),
        lineOpacity: this.getStyleNumber(item.style, "lineOpacity", 1),
        lineDasharray: this.getStyleNumberArray(item.style, "lineDasharray", [10, 10]),
      },
    };
  }

  private getGeometryLabelCenter(geometry: GeoJSON.Geometry): GeoJSON.Position | undefined {
    if (geometry.type == "Polygon") {
      return this.getPolygonCenter(geometry);
    }

    if (geometry.type == "MultiPolygon") {
      const largestPolygonCoordinates = geometry.coordinates
        .map((coordinates) => ({
          coordinates,
          area: this.getBoundingBoxArea(coordinates[0] ?? []),
        }))
        .sort((a, b) => b.area - a.area)[0]?.coordinates;

      return largestPolygonCoordinates
        ? this.getPolygonCenter({
            type: "Polygon",
            coordinates: largestPolygonCoordinates,
          })
        : undefined;
    }

    return undefined;
  }

  private getPolygonCenter(geometry: GeoJSON.Polygon): GeoJSON.Position | undefined {
    const center = polygonCenter(geometry) as GeoJSON.Point;

    return center.coordinates;
  }

  private getBoundingBoxArea(positions: GeoJSON.Position[]): number {
    if (positions.length == 0) {
      return 0;
    }

    const bounds = positions.reduce(
      (currentBounds, position) => ({
        minX: Math.min(currentBounds.minX, position[0]),
        minY: Math.min(currentBounds.minY, position[1]),
        maxX: Math.max(currentBounds.maxX, position[0]),
        maxY: Math.max(currentBounds.maxY, position[1]),
      }),
      {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
      }
    );

    return (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
  }

  private registerRoomPatternImages(rooms: RoomRenderItem[]): void {
    rooms
      .map((room) => this.getStyleString(room.style, "polygonPatternFile", ""))
      .filter((patternFile) => patternFile.length > 0)
      .forEach((patternFile) => this.registerPatternImage(patternFile));
  }

  private registerPatternImage(patternFile: string): void {
    const imageId = this.getPatternImageId(patternFile);

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

  private registerRoomNumberBackgroundImage(): void {
    if (this.map.hasImage(ROOM_NUMBER_BACKGROUND_IMAGE_ID)) {
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
    this.drawRoundedRectangle(
      context,
      1,
      1,
      canvas.width - 2,
      canvas.height - 2,
      ROOM_NUMBER_BACKGROUND_BORDER
    );
    context.fill();
    context.stroke();

    this.map.addImage(
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
    const featureId = event.features?.[0]?.properties?.__featureId;

    if (typeof featureId != "string") {
      return;
    }

    const feature = this.roomFeaturesById.get(featureId);

    if (feature) {
      this.events.onFeatureSelected(feature);
    }
  }

  // ===== Style helpers =======================================================

  private getStyleString(
    style: Record<string, unknown>,
    key: string,
    fallback: string
  ): string {
    const value = style[key];

    return typeof value == "string" ? value : fallback;
  }

  private getStyleNumber(
    style: Record<string, unknown>,
    key: string,
    fallback: number
  ): number {
    const value = style[key];

    return typeof value == "number" ? value : fallback;
  }

  private getStyleNumberArray(
    style: Record<string, unknown>,
    key: string,
    fallback: number[]
  ): number[] {
    const value = style[key];

    return Array.isArray(value) && value.every((item) => typeof item == "number")
      ? value
      : fallback;
  }

  private getOpacityExpression(propertyName: string): OpacityExpression {
    return [
      "*",
      ["coalesce", ["get", propertyName], 1],
      this.opacity,
    ];
  }

  private getPatternExpression(propertyName: string): PatternExpression {
    return ["get", propertyName];
  }

  private getZoomOpacityExpression(): ZoomOpacityExpression {
    return [
      "interpolate",
      ["linear"],
      ["zoom"],
      ROOM_NUMBER_FADE_START_ZOOM,
      0,
      ROOM_NUMBER_FADE_END_ZOOM,
      this.opacity,
    ];
  }

  private drawRoundedRectangle(
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

  // ===== Id helpers ==========================================================

  private getSourceId(name: string): string {
    return `indoor-level-${this.level}-${name}`;
  }

  private getLayerId(name: string, layerName: string): string {
    return `${this.getSourceId(name)}-${layerName}`;
  }

  private getPatternImageId(patternFile: string): string {
    return `pattern-${patternFile.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
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
