import * as Maptalks from "maptalks";
import { geoMap } from "../main";
import { MARKERS_IMG_DIR, ICONS } from "../../public/strings/constants.json";
import { IndoorLayer } from "./indoorLayer";

export interface MarkerClusterLayerOptions {
    'maxClusterRadius'?: number,
    'sameSymbolClusterRadius'?: number,
    'symbol'?: Record<string, unknown>,
    'combineSameSymbol'?: boolean,
    'ignorePitch'?: boolean,
}

const defaultOptions: MarkerClusterLayerOptions = {
    'maxClusterRadius': 30,
    'sameSymbolClusterRadius': 70,
    'symbol': null,
    'combineSameSymbol': true,
    'ignorePitch': true,
}

export interface FeatureMarker {
    marker: Maptalks.Marker,
    feature: GeoJSON.Feature
}

export class MarkerClusterLayer {
    private markers: FeatureMarker[];
    private readonly layerInstance: Maptalks.VectorLayer;
    private readonly options = defaultOptions;
    private readonly indoorLayer: IndoorLayer;

    constructor(id: string, indoorLayer: IndoorLayer, markers?: FeatureMarker[], clusteringOptions?: MarkerClusterLayerOptions, vectorLayerOptions?: any) {
        this.layerInstance = new Maptalks.VectorLayer(id, undefined, vectorLayerOptions);
        Maptalks.Util.extend(this.options, clusteringOptions);
        this.markers = markers ?? [];
        console.log(this.options.symbol);
        this.indoorLayer = indoorLayer;
    }

    addTo(map: Maptalks.Map): this {
        map.addLayer(this.layerInstance);
        map.on("zooming dragrotating", () => {this.updateMarkers()});
        return this;
    }

    updateMarkers(): void {
        this.layerInstance.clear();
        const map = this.options.ignorePitch ? geoMap.flatMapInstance : this.layerInstance.getMap();
        if (map) {
            let todo = this.markers.map((marker) => {
                return {
                    center: marker.marker.getCenter(),
                    id: marker.marker.getId(),
                    symbol: marker.marker.getSymbol()
                }
            });
            const clusters = [];
            while (todo.length) {
                const next = todo.pop();
                const newCluster = [next];
                const noCluster = []
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                todo.sort((a, b) => Number(b.symbol["markerFile"] == next.symbol["markerFile"]) - Number(a.symbol["markerFile"] == next.symbol["markerFile"])) // sort so that same symbol is first
                while (todo.length) {
                    const toCheck = todo.pop();
                    if (newCluster.some((inCluster) => {
                        const d = map.coordinateToContainerPoint(toCheck.center).distanceTo(map.coordinateToContainerPoint(inCluster.center));
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        return d < this.options.maxClusterRadius || (toCheck.symbol["markerFile"] == inCluster.symbol["markerFile"] && d < this.options.sameSymbolClusterRadius);
                    })) {
                        newCluster.push(toCheck);
                    } else {
                        noCluster.push(toCheck);
                    }
                }
                todo = noCluster;
                clusters.push(newCluster);
            }
            this.layerInstance.addGeometry(clusters.map((cluster) => {
                const eqSet = (xs: Set<string>, ys: Set<string>) => xs.size === ys.size && [...xs].every((x) => ys.has(x));
                const center = centerOfCluster(cluster);
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const sameSymbol = new Set(cluster.map((marker) => marker.symbol["markerFile"])).size == 1;
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const wheelchairToilet = eqSet(new Set(cluster.map((marker) => marker.symbol["markerFile"])), new Set([MARKERS_IMG_DIR + ICONS.TOILETS_WHEELCHAIR, MARKERS_IMG_DIR + ICONS.WHEELCHAIR]));
                let symbol;
                if (sameSymbol && this.options.combineSameSymbol) {
                    symbol = cluster[0].symbol;
                } else if (wheelchairToilet && this.options.combineSameSymbol) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    symbol = cluster.find((obj) => obj.symbol["markerFile"] == MARKERS_IMG_DIR + ICONS.TOILETS_WHEELCHAIR).symbol;
                } else {
                    symbol = this.options.symbol;
                }
                const marker = new Maptalks.Marker(center, {
                    symbol: symbol
                });
                marker.on("click", () => this.handleClick(cluster))
                return marker;
            }));
        }
    }

    handleClick(cluster: { center: Maptalks.Coordinate; id: string | number; symbol: object; }[]): void {
        const map = this.layerInstance.getMap();
        if (cluster.length > 1) {
            console.log(cluster);
            if (map) {
                const extent = new Maptalks.Extent(cluster[0].center, cluster[1].center);
                for (let i = 2; i < cluster.length; i++) {
                    extent.combine(cluster[i].center);
                }
                map.animateTo({center: extent.getCenter()}, {duration: 350});
                setTimeout(() => {
                    map.animateTo({zoom: map.getFitZoom(extent, true)}, {duration: 350});
                }, 350);
            }
        } else {
            const marker = this.markers.find((fm) => fm.marker.getId() == cluster[0].id);
            this.indoorLayer.handleClick(marker.feature);
        }
    }

    clear(): void {
        this.markers = [];
        this.layerInstance.clear();
    }

    addMarkers(markers: FeatureMarker | FeatureMarker[]): void {
        if (!Array.isArray(markers)) {
            this.markers.push(markers);
        } else {
            this.markers.push(...markers);
        }
    }

    getLayer(): Maptalks.VectorLayer {
        return this.layerInstance;
    }
}

function centerOfCluster(cluster: { center: Maptalks.Coordinate; id: string | number; symbol: object; }[]) : Maptalks.Coordinate {
    return new Maptalks.Coordinate(
        cluster.map((marker) => marker.center.x).reduce((prev, val) => prev + val, 0) / cluster.length,
        cluster.map((marker) => marker.center.y).reduce((prev, val) => prev + val, 0) / cluster.length
    )
}
