import { MARKERS_IMG_DIR, ICONS } from "../../public/strings/constants.json";
import {
  buildMarkerClusters,
  ClusterableMarker,
  resolveMarkerClusterOptions,
} from "../../src/components/markerCluster/markerClusterModel";

function marker(
  id: string,
  x: number,
  y: number,
  projectedX: number,
  projectedY: number,
  markerFile?: string
): ClusterableMarker {
  const symbol = markerFile ? { markerFile } : undefined;

  return {
    id,
    center: { x, y },
    projectedCenter: { x: projectedX, y: projectedY },
    symbol,
    markerFile,
  };
}

describe("buildMarkerClusters", () => {
  it("clusters markers within the max cluster radius", () => {
    const clusters = buildMarkerClusters(
      [
        marker("a", 0, 0, 0, 0),
        marker("b", 2, 2, 20, 0),
        marker("c", 10, 10, 80, 0),
      ],
      resolveMarkerClusterOptions({
        maxClusterRadius: 30,
        sameSymbolClusterRadius: 30,
      })
    );

    expect(clusters).toHaveLength(2);
    expect(clusters.map((cluster) => cluster.markers.map((item) => item.id).sort())).toEqual([
      ["c"],
      ["a", "b"],
    ]);
  });

  it("uses the larger same-symbol radius for matching marker files", () => {
    const markerFile = "/same.svg";
    const clusters = buildMarkerClusters(
      [
        marker("a", 0, 0, 0, 0, markerFile),
        marker("b", 2, 2, 60, 0, markerFile),
      ],
      resolveMarkerClusterOptions({
        maxClusterRadius: 30,
        sameSymbolClusterRadius: 70,
      })
    );

    expect(clusters).toHaveLength(1);
    expect(clusters[0].markers).toHaveLength(2);
  });

  it("uses the marker symbol for clusters containing only one marker file", () => {
    const markerFile = "/same.svg";
    const clusters = buildMarkerClusters(
      [
        marker("a", 0, 0, 0, 0, markerFile),
        marker("b", 2, 2, 20, 0, markerFile),
      ],
      resolveMarkerClusterOptions({ symbol: { markerFile: "/cluster.svg" } })
    );

    expect(clusters[0].symbol).toEqual({ markerFile });
  });

  it("uses the fallback symbol for mixed marker clusters", () => {
    const clusters = buildMarkerClusters(
      [
        marker("a", 0, 0, 0, 0, "/a.svg"),
        marker("b", 2, 2, 20, 0, "/b.svg"),
      ],
      resolveMarkerClusterOptions({ symbol: { markerFile: "/cluster.svg" } })
    );

    expect(clusters[0].symbol).toEqual({ markerFile: "/cluster.svg" });
  });

  it("prefers the wheelchair toilet marker for wheelchair plus toilet clusters", () => {
    const wheelchairToilet = MARKERS_IMG_DIR + ICONS.TOILETS_WHEELCHAIR;
    const wheelchair = MARKERS_IMG_DIR + ICONS.WHEELCHAIR;
    const clusters = buildMarkerClusters(
      [
        marker("a", 0, 0, 0, 0, wheelchairToilet),
        marker("b", 2, 2, 20, 0, wheelchair),
      ],
      resolveMarkerClusterOptions({ symbol: { markerFile: "/cluster.svg" } })
    );

    expect(clusters[0].symbol).toEqual({ markerFile: wheelchairToilet });
  });

  it("returns the fallback symbol when same-symbol combining is disabled", () => {
    const clusters = buildMarkerClusters(
      [
        marker("a", 0, 0, 0, 0, "/same.svg"),
        marker("b", 2, 2, 20, 0, "/same.svg"),
      ],
      resolveMarkerClusterOptions({
        combineSameSymbol: false,
        symbol: { markerFile: "/cluster.svg" },
      })
    );

    expect(clusters[0].symbol).toEqual({ markerFile: "/cluster.svg" });
  });
});
