import type {
  AddLayerObject,
  GeoJSONSource,
  Map as MapLibreMap,
  MapLayerMouseEvent,
} from "maplibre-gl";
import { ICONS, MARKERS_IMG_DIR } from "../../../../public/strings/constants.json";
import FeatureService from "../../../services/featureService";
import { getRequiredFeatureId } from "../../../utils/geoJsonHelpers";
import {
  buildMarkerClusters,
  ClusterableMarker,
  getMarkerFile,
  MarkerCluster,
  MarkerSymbol,
  ResolvedMarkerClusterOptions,
  resolveMarkerClusterOptions,
} from "../../markerCluster/markerClusterModel";
import { IndoorLevelRenderModel } from "../indoorLevelRenderModel";
import { IndoorLevelViewEvents } from "../indoorLevelView";
import { getMarkerImageId } from "./maplibreIndoorLevelTypes";
import { registerMarkerImage } from "./maplibreImageRegistry";
import { getMotionDuration } from "../../../utils/motionPreferences";

interface AccessibilityMarkerCluster extends MarkerCluster {
  id: number;
}

export class MapLibreAccessibilityMarkerRenderer {
  private readonly markerFeaturesById = new Map<string | number, GeoJSON.Feature>();
  private readonly clustersById = new Map<number, AccessibilityMarkerCluster>();
  private readonly clusterOptions: ResolvedMarkerClusterOptions;
  private readonly loadingMarkerImageIds = new Set<string>();
  private markerItems: ClusterableMarker[] = [];
  private pendingClusterFrame?: number;
  private opacity = 1;

  constructor(
    private readonly map: MapLibreMap,
    private readonly sourceId: string,
    private readonly layerId: string,
    private readonly events: IndoorLevelViewEvents
  ) {
    this.clusterOptions = resolveMarkerClusterOptions({
      symbol: {
        markerFile: MARKERS_IMG_DIR + ICONS.ADDITIONAL,
      },
    });
  }

  createLayer(): AddLayerObject {
    return {
      id: this.layerId,
      type: "symbol",
      source: this.sourceId,
      layout: {
        "icon-image": ["get", "iconImageId"],
        "icon-size": ["coalesce", ["get", "iconScale"], 1],
        "icon-allow-overlap": true,
        "icon-anchor": "center",
      },
      paint: {
        "icon-opacity": this.opacity,
      },
    };
  }

  bindEvents(): void {
    this.map.on("move", () => this.scheduleClusterUpdate());
    this.map.on("click", this.layerId, (event) => this.handleClick(event));
    this.map.on("mouseenter", this.layerId, () => {
      this.map.getCanvas().style.cursor = "pointer";
    });
    this.map.on("mouseleave", this.layerId, () => {
      this.map.getCanvas().style.cursor = "";
    });
  }

  clear(): void {
    this.markerFeaturesById.clear();
    this.clustersById.clear();
    this.markerItems = [];
    this.setSourceData(this.emptyFeatureCollection());
  }

  render(renderModel: IndoorLevelRenderModel): void {
    this.markerFeaturesById.clear();
    this.clustersById.clear();
    this.markerItems = [
      ...renderModel.rooms.map((room) => room.feature),
      ...renderModel.pointMarkerFeatures,
    ]
      .map((feature) => this.buildMarkerItem(feature))
      .filter((marker): marker is ClusterableMarker => marker != undefined);

    this.registerMarkerImages(this.markerItems);
    this.updateClusters();
  }

  applyOpacity(opacity: number): void {
    this.opacity = opacity;

    if (this.map.getLayer(this.layerId)) {
      this.map.setPaintProperty(this.layerId, "icon-opacity", this.opacity);
    }
  }

  hasMarkerAtClickPoint(event: MapLayerMouseEvent): boolean {
    return this.map.queryRenderedFeatures(event.point, {
      layers: [this.layerId],
    }).length > 0;
  }

  private buildMarkerItem(feature: GeoJSON.Feature): ClusterableMarker | undefined {
    const markerData = FeatureService.getAccessibilityMarkerData(feature);

    if (!markerData) {
      return undefined;
    }

    const id = getRequiredFeatureId(feature);
    const symbol: MarkerSymbol = markerData.symbol;

    this.markerFeaturesById.set(id, feature);

    return {
      id,
      center: {
        x: markerData.coordinates[0],
        y: markerData.coordinates[1],
      },
      projectedCenter: {
        x: 0,
        y: 0,
      },
      symbol,
      markerFile: getMarkerFile(symbol),
    };
  }

  private updateClusters(): void {
    this.clustersById.clear();

    const clusters = buildMarkerClusters(
      this.markerItems.map((marker) => ({
        ...marker,
        projectedCenter: this.projectMarkerCenter(marker.center),
      })),
      this.clusterOptions
    ).map((cluster, index) => ({
      ...cluster,
      id: index,
    }));

    clusters.forEach((cluster) => {
      this.clustersById.set(cluster.id, cluster);
    });

    this.registerClusterImages(clusters);
    this.setSourceData({
      type: "FeatureCollection",
      features: clusters.map((cluster) => this.buildClusterFeature(cluster)),
    });
  }

  private buildClusterFeature(
    cluster: AccessibilityMarkerCluster
  ): GeoJSON.Feature<GeoJSON.Point> {
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [
          cluster.center.x,
          cluster.center.y,
        ],
      },
      properties: {
        clusterId: cluster.id,
        iconImageId: getMarkerImageId(this.getClusterMarkerFile(cluster)),
        iconScale: 1,
      },
    };
  }

  private projectMarkerCenter(center: { x: number; y: number }): { x: number; y: number } {
    const point = this.map.project([center.x, center.y]);

    return {
      x: point.x,
      y: point.y,
    };
  }

  private registerMarkerImages(markers: ClusterableMarker[]): void {
    markers
      .map((marker) => marker.markerFile)
      .filter((markerFile): markerFile is string => markerFile != undefined)
      .forEach((markerFile) => this.registerMarkerImage(markerFile));
    this.registerMarkerImage(MARKERS_IMG_DIR + ICONS.ADDITIONAL);
  }

  private registerClusterImages(clusters: AccessibilityMarkerCluster[]): void {
    clusters.forEach((cluster) => this.registerMarkerImage(this.getClusterMarkerFile(cluster)));
  }

  private registerMarkerImage(markerFile: string): void {
    registerMarkerImage(this.map, markerFile, this.loadingMarkerImageIds);
  }

  private getClusterMarkerFile(cluster: MarkerCluster): string {
    return getMarkerFile(cluster.symbol) ?? MARKERS_IMG_DIR + ICONS.ADDITIONAL;
  }

  private handleClick(event: MapLayerMouseEvent): void {
    const clusterId = this.getNumberProperty(event.features?.[0]?.properties?.clusterId);

    if (clusterId == undefined) {
      return;
    }

    const cluster = this.clustersById.get(clusterId);

    if (!cluster) {
      return;
    }

    if (cluster.markers.length > 1) {
      this.fitMapToCluster(cluster);
      return;
    }

    const feature = this.markerFeaturesById.get(cluster.markers[0].id);

    if (feature) {
      this.events.onFeatureSelected(feature);
    }
  }

  private fitMapToCluster(cluster: MarkerCluster): void {
    const bounds = this.getClusterBounds(cluster);

    if (!bounds) {
      return;
    }

    const [[west, south], [east, north]] = bounds;

    if (west == east && south == north) {
      this.map.easeTo({
        center: [west, south],
        zoom: this.map.getZoom() + 1,
        bearing: this.map.getBearing(),
        pitch: this.map.getPitch(),
        duration: getMotionDuration(350),
      });
      return;
    }

    this.map.fitBounds(bounds, {
      bearing: this.map.getBearing(),
      duration: getMotionDuration(350),
      padding: 80,
      pitch: this.map.getPitch(),
    });
  }

  private getClusterBounds(
    cluster: MarkerCluster
  ): [[number, number], [number, number]] | undefined {
    if (cluster.markers.length == 0) {
      return undefined;
    }

    const bounds = cluster.markers.reduce(
      (currentBounds, marker) => ({
        west: Math.min(currentBounds.west, marker.center.x),
        south: Math.min(currentBounds.south, marker.center.y),
        east: Math.max(currentBounds.east, marker.center.x),
        north: Math.max(currentBounds.north, marker.center.y),
      }),
      {
        west: cluster.markers[0].center.x,
        south: cluster.markers[0].center.y,
        east: cluster.markers[0].center.x,
        north: cluster.markers[0].center.y,
      }
    );

    return [
      [bounds.west, bounds.south],
      [bounds.east, bounds.north],
    ];
  }

  private scheduleClusterUpdate(): void {
    if (this.pendingClusterFrame != undefined) {
      return;
    }

    this.pendingClusterFrame = requestAnimationFrame(() => {
      this.pendingClusterFrame = undefined;
      this.updateClusters();
    });
  }

  private setSourceData(data: GeoJSON.FeatureCollection): void {
    const source = this.map.getSource(this.sourceId) as GeoJSONSource | undefined;

    if (source) {
      source.setData(data);
    }
  }

  private getNumberProperty(value: unknown): number | undefined {
    if (typeof value == "number") {
      return value;
    }

    if (typeof value != "string") {
      return undefined;
    }

    const parsedValue = Number(value);

    return Number.isNaN(parsedValue) ? undefined : parsedValue;
  }

  private emptyFeatureCollection(): GeoJSON.FeatureCollection {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }
}
