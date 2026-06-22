import { MARKERS_IMG_DIR, ICONS } from "../../../public/strings/constants.json";

export interface ClusterPoint {
  x: number;
  y: number;
}

export type MarkerSymbol = Record<string, unknown> | Record<string, unknown>[];

export interface MarkerClusterOptions {
  maxClusterRadius?: number;
  sameSymbolClusterRadius?: number;
  symbol?: MarkerSymbol;
  combineSameSymbol?: boolean;
  ignorePitch?: boolean;
}

export interface ResolvedMarkerClusterOptions {
  maxClusterRadius: number;
  sameSymbolClusterRadius: number;
  symbol?: MarkerSymbol;
  combineSameSymbol: boolean;
  ignorePitch: boolean;
}

export interface ClusterableMarker {
  id: string | number;
  center: ClusterPoint;
  projectedCenter: ClusterPoint;
  symbol?: MarkerSymbol;
  markerFile?: string;
}

export interface MarkerCluster {
  markers: ClusterableMarker[];
  center: ClusterPoint;
  symbol?: MarkerSymbol;
}

export const defaultMarkerClusterOptions: ResolvedMarkerClusterOptions = {
  maxClusterRadius: 30,
  sameSymbolClusterRadius: 70,
  symbol: undefined,
  combineSameSymbol: true,
  ignorePitch: true,
};

export function resolveMarkerClusterOptions(
  options: MarkerClusterOptions = {}
): ResolvedMarkerClusterOptions {
  return {
    ...defaultMarkerClusterOptions,
    ...options,
  };
}

export function buildMarkerClusters(
  markers: ClusterableMarker[],
  options: ResolvedMarkerClusterOptions
): MarkerCluster[] {
  let remaining = [...markers];
  const clusters: MarkerCluster[] = [];

  while (remaining.length) {
    const next = remaining.pop();
    if (!next)
      break;

    const cluster = [next];
    const unclustered: ClusterableMarker[] = [];

    remaining.sort((a, b) =>
      Number(a.markerFile === next.markerFile) - Number(b.markerFile === next.markerFile)
    );

    while (remaining.length) {
      const candidate = remaining.pop();
      if (!candidate)
        break;

      if (cluster.some((clusterMarker) => belongsToCluster(candidate, clusterMarker, options))) {
        cluster.push(candidate);
      } else {
        unclustered.push(candidate);
      }
    }

    remaining = unclustered;
    clusters.push({
      markers: cluster,
      center: getClusterCenter(cluster),
      symbol: getClusterSymbol(cluster, options),
    });
  }

  return clusters;
}

export function getMarkerFile(symbol: MarkerSymbol | undefined): string | undefined {
  if (Array.isArray(symbol))
    return symbol.map(getMarkerFile).find((markerFile) => markerFile !== undefined);

  if (!symbol)
    return undefined;

  const markerFile = symbol.markerFile;
  return typeof markerFile === "string" ? markerFile : undefined;
}

function belongsToCluster(
  candidate: ClusterableMarker,
  clusterMarker: ClusterableMarker,
  options: ResolvedMarkerClusterOptions
): boolean {
  const distance = getDistance(candidate.projectedCenter, clusterMarker.projectedCenter);

  return distance < options.maxClusterRadius ||
    candidate.markerFile === clusterMarker.markerFile &&
    distance < options.sameSymbolClusterRadius;
}

function getClusterSymbol(
  cluster: ClusterableMarker[],
  options: ResolvedMarkerClusterOptions
): MarkerSymbol | undefined {
  if (!options.combineSameSymbol)
    return options.symbol;

  const markerFiles = new Set(cluster.map((marker) => marker.markerFile));

  if (markerFiles.size === 1)
    return cluster[0].symbol;

  if (hasExactlySameValues(
    markerFiles,
    new Set([MARKERS_IMG_DIR + ICONS.TOILETS_WHEELCHAIR, MARKERS_IMG_DIR + ICONS.WHEELCHAIR])
  )) {
    return cluster.find(
      (marker) => marker.markerFile === MARKERS_IMG_DIR + ICONS.TOILETS_WHEELCHAIR
    )?.symbol;
  }

  return options.symbol;
}

function getClusterCenter(cluster: ClusterableMarker[]): ClusterPoint {
  return {
    x: cluster.map((marker) => marker.center.x).reduce((previous, value) => previous + value, 0) / cluster.length,
    y: cluster.map((marker) => marker.center.y).reduce((previous, value) => previous + value, 0) / cluster.length,
  };
}

function getDistance(pointA: ClusterPoint, pointB: ClusterPoint): number {
  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
}

function hasExactlySameValues<T>(xs: Set<T>, ys: Set<T>): boolean {
  return xs.size === ys.size && [...xs].every((x) => ys.has(x));
}
