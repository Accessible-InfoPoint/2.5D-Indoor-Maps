import * as Maptalks from "maptalks";
import {
    buildMarkerClusters,
    ClusterableMarker,
    getMarkerFile,
    MarkerCluster,
    MarkerClusterOptions,
    MarkerSymbol,
    ResolvedMarkerClusterOptions,
    resolveMarkerClusterOptions,
} from "./markerClusterModel";

export type MaptalksMarkerClusterLayerOptions = MarkerClusterOptions;

export interface MaptalksFeatureMarker {
    marker: Maptalks.Marker,
    feature: GeoJSON.Feature
}

type FeatureClickHandler = (feature: GeoJSON.Feature) => void;
type ProjectionMapProvider = () => Maptalks.Map;

export class MaptalksMarkerClusterLayer {
    private markers: MaptalksFeatureMarker[];
    private readonly layerInstance: Maptalks.VectorLayer;
    private readonly options: ResolvedMarkerClusterOptions;
    private readonly handleFeatureClick: FeatureClickHandler;
    private readonly getProjectionMap: ProjectionMapProvider;

    constructor(
        id: string,
        handleFeatureClick: FeatureClickHandler,
        getProjectionMap: ProjectionMapProvider,
        markers?: MaptalksFeatureMarker[],
        clusteringOptions?: MaptalksMarkerClusterLayerOptions,
        vectorLayerOptions?: Record<string, unknown>
    ) {
        this.layerInstance = new Maptalks.VectorLayer(id, undefined, vectorLayerOptions as any);
        this.options = resolveMarkerClusterOptions(clusteringOptions);
        this.markers = markers ?? [];
        this.handleFeatureClick = handleFeatureClick;
        this.getProjectionMap = getProjectionMap;
    }

    addTo(map: Maptalks.Map): this {
        map.addLayer(this.layerInstance);
        map.on("zooming dragrotating", () => {this.updateMarkers()});
        return this;
    }

    updateMarkers(): void {
        this.layerInstance.clear();
        const map = this.options.ignorePitch ? this.getProjectionMap() : this.layerInstance.getMap();
        if (map) {
            const clusters = buildMarkerClusters(
                this.markers.map((marker) => toClusterableMarker(marker, map)),
                this.options
            );

            this.layerInstance.addGeometry(clusters.map((cluster) => this.renderCluster(cluster)));
        }
    }

    handleClick(cluster: MarkerCluster): void {
        const map = this.layerInstance.getMap();
        if (cluster.markers.length > 1) {
            if (map) {
                const extent = new Maptalks.Extent(
                    toCoordinate(cluster.markers[0].center),
                    toCoordinate(cluster.markers[1].center)
                );
                for (let i = 2; i < cluster.markers.length; i++) {
                    extent.combine(toCoordinate(cluster.markers[i].center));
                }
                map.animateTo({center: extent.getCenter()}, {duration: 350});
                setTimeout(() => {
                    map.animateTo({zoom: map.getFitZoom(extent, true)}, {duration: 350});
                }, 350);
            }
        } else {
            const marker = this.markers.find((fm) => fm.marker.getId() === cluster.markers[0].id);
            if (marker) {
                this.handleFeatureClick(marker.feature);
            }
        }
    }

    clear(): void {
        this.markers = [];
        this.layerInstance.clear();
    }

    addMarkers(markers: MaptalksFeatureMarker | MaptalksFeatureMarker[]): void {
        if (!Array.isArray(markers)) {
            this.markers.push(markers);
        } else {
            this.markers.push(...markers);
        }
    }

    getLayer(): Maptalks.VectorLayer {
        return this.layerInstance;
    }

    private renderCluster(cluster: MarkerCluster): Maptalks.Marker {
        const marker = new Maptalks.Marker(toCoordinate(cluster.center), {
            symbol: toMaptalksSymbol(cluster.symbol)
        });
        marker.on("click", () => this.handleClick(cluster));
        return marker;
    }
}

function toClusterableMarker(featureMarker: MaptalksFeatureMarker, map: Maptalks.Map): ClusterableMarker {
    const center = featureMarker.marker.getCenter();
    const projectedCenter = map.coordinateToContainerPoint(center);
    const symbol = toMarkerSymbol(featureMarker.marker.getSymbol());

    return {
        center: {
            x: center.x,
            y: center.y,
        },
        projectedCenter: {
            x: projectedCenter.x,
            y: projectedCenter.y,
        },
        id: featureMarker.marker.getId(),
        symbol,
        markerFile: getMarkerFile(symbol),
    };
}

function toCoordinate(point: { x: number; y: number }): Maptalks.Coordinate {
    return new Maptalks.Coordinate(point.x, point.y);
}

function toMarkerSymbol(symbol: unknown): MarkerSymbol {
    if (Array.isArray(symbol)) {
        return symbol.filter(isSymbolRecord);
    }

    return isSymbolRecord(symbol) ? symbol : null;
}

function toMaptalksSymbol(symbol: MarkerSymbol): MarkerSymbol {
    return symbol;
}

function isSymbolRecord(symbol: unknown): symbol is Record<string, unknown> {
    return typeof symbol === "object" && symbol !== null && !Array.isArray(symbol);
}
