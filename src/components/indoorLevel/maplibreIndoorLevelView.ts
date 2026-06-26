import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import {
  IndoorLevelRenderModel,
  RoomRenderItem,
  StyledFeatureRenderItem,
} from "./indoorLevelRenderModel";
import { IndoorLevelView, IndoorLevelViewEvents } from "./indoorLevelView";

type LayerVisibility = "visible" | "none";

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
  private visibleLayerIds = new Set<string>();
  private opacity = 1;

  constructor(
    private readonly level: number,
    private readonly map: MapLibreMap,
    private readonly events: IndoorLevelViewEvents
  ) {
    this.infoPoint = this.createLayerSet("info-point", ["circle", "label"]);
    this.rooms = this.createLayerSet("rooms", ["fill", "line"]);
    this.tactilePaving = this.createLayerSet("tactile-paving", ["line"]);
    this.roomNumbers = this.createLayerSet("room-numbers", ["label"]);
    this.accessibilityMarkers = this.createLayerSet("accessibility-markers", ["icon"]);

    this.whenStyleLoaded(() => this.initializeLayers());
  }

  clear(): void {
    this.setSourceData(this.infoPoint.sourceId, this.emptyFeatureCollection());
    this.setSourceData(this.rooms.sourceId, this.emptyFeatureCollection());
    this.setSourceData(this.tactilePaving.sourceId, this.emptyFeatureCollection());
    this.setSourceData(this.roomNumbers.sourceId, this.emptyFeatureCollection());
    this.setSourceData(this.accessibilityMarkers.sourceId, this.emptyFeatureCollection());
  }

  render(renderModel: IndoorLevelRenderModel): void {
    this.pendingRenderModel = renderModel;

    this.whenStyleLoaded(() => {
      this.renderOutline(renderModel.outlineCoordinates);
      this.renderInfoPoint(renderModel);
      this.renderRooms(renderModel.rooms);
      this.renderTactilePaving(renderModel.tactilePaving);
      this.renderRoomNumbers(renderModel.rooms);
      this.renderAccessibilityMarkers(renderModel);
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
    this.whenStyleLoaded(() => this.applyOpacity());
  }

  private initializeLayers(): void {
    this.addGeoJsonSource(this.infoPoint.sourceId);
    this.addGeoJsonSource(this.rooms.sourceId);
    this.addGeoJsonSource(this.tactilePaving.sourceId);
    this.addGeoJsonSource(this.roomNumbers.sourceId);
    this.addGeoJsonSource(this.accessibilityMarkers.sourceId);

    this.addInfoPointLayers();
    this.addRoomLayers();
    this.addTactilePavingLayers();
    this.addRoomNumberLayers();
    this.addAccessibilityMarkerLayers();

    this.applyOpacity();
    this.setLayerSetsVisibility("none");
    this.applyVisibleLayers();

    if (this.pendingRenderModel) {
      this.render(this.pendingRenderModel);
    }
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
        "fill-color": "#ffffff",
        "fill-opacity": 0,
      },
    });
    this.addLayer({
      id: this.getLayerId("rooms", "line"),
      type: "line",
      source: this.rooms.sourceId,
      paint: {
        "line-color": "#000000",
        "line-opacity": 0,
      },
    });
  }

  private addTactilePavingLayers(): void {
    this.addLayer({
      id: this.getLayerId("tactile-paving", "line"),
      type: "line",
      source: this.tactilePaving.sourceId,
      paint: {
        "line-color": "#000000",
        "line-opacity": 0,
      },
    });
  }

  private addRoomNumberLayers(): void {
    this.addLayer({
      id: this.getLayerId("room-numbers", "label"),
      type: "symbol",
      source: this.roomNumbers.sourceId,
      layout: {
        "text-field": ["get", "label"],
        "text-size": 14,
      },
      paint: {
        "text-color": "#000000",
        "text-opacity": 0,
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
    void rooms;
    this.setSourceData(this.rooms.sourceId, this.emptyFeatureCollection());
  }

  private renderTactilePaving(items: StyledFeatureRenderItem[]): void {
    void items;
    this.setSourceData(this.tactilePaving.sourceId, this.emptyFeatureCollection());
  }

  private renderRoomNumbers(rooms: RoomRenderItem[]): void {
    void rooms;
    this.setSourceData(this.roomNumbers.sourceId, this.emptyFeatureCollection());
  }

  private renderAccessibilityMarkers(renderModel: IndoorLevelRenderModel): void {
    void renderModel;
    this.setSourceData(this.accessibilityMarkers.sourceId, this.emptyFeatureCollection());
  }

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
  }

  private setPaintProperty(layerId: string, property: string, value: unknown): void {
    if (this.map.getLayer(layerId)) {
      this.map.setPaintProperty(layerId, property, value);
    }
  }

  private createLayerSet(name: string, layerNames: string[]): MapLibreIndoorLevelLayerSet {
    return {
      sourceId: this.getSourceId(name),
      layerIds: layerNames.map((layerName) => this.getLayerId(name, layerName)),
    };
  }

  private getSourceId(name: string): string {
    return `indoor-level-${this.level}-${name}`;
  }

  private getLayerId(name: string, layerName: string): string {
    return `${this.getSourceId(name)}-${layerName}`;
  }

  private emptyFeatureCollection(): GeoJSON.FeatureCollection {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  private whenStyleLoaded(callback: () => void): void {
    if (this.map.isStyleLoaded()) {
      callback();
    } else {
      this.map.once("load", callback);
    }
  }
}
