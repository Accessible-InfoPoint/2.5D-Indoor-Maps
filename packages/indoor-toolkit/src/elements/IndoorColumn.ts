import { OverpassElement } from "../models/overpassJson";
import { IndoorDiagnostics } from "../diagnostics";
import { OsmGraph } from "../overpass/OsmGraph";
import CoordinateHelpers from "../utils/coordinateHelpers";
import { nodeToPosition } from "../utils/overpassJsonHelpers";
import { parsePositiveMeters } from "../utils/tagValueHelpers";
import { getRelationAreaGeometry, getWayPolygonGeometry } from "../indoorAreaGeometry";
import { isRawIndoorColumnElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

const DEFAULT_COLUMN_DIAMETER_METERS = 0.5;
const COLUMN_CIRCLE_SEGMENTS = 24;

/**
 * Indoor column parsed from `indoor=column`.
 *
 * Node columns are approximated as circular polygons. Way and relation columns
 * use their authored area geometry.
 */
export class IndoorColumn extends IndoorElement {
  /** Collect all raw column nodes, ways, and relations from a graph. */
  static collectFromGraph(
    graph: OsmGraph,
    diagnostics?: IndoorDiagnostics,
    nonExistentLevels: number[] = [],
  ): IndoorColumn[] {
    return graph.elements
      .filter(isRawIndoorColumnElement)
      .map((element) => new IndoorColumn(graph, element, diagnostics, nonExistentLevels));
  }

  constructor(
    graph: OsmGraph,
    sourceElement: OverpassElement,
    diagnostics?: IndoorDiagnostics,
    nonExistentLevels: number[] = [],
  ) {
    super(graph, sourceElement, diagnostics, { nonExistentLevels });
  }

  /** Polygon geometry for node/way columns or multipolygon geometry for relation columns. */
  get geometry(): GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined {
    return this.toGeometry();
  }

  private toGeometry(): GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined {
    switch (this.sourceElement.type) {
      case "node":
        return CoordinateHelpers.createCoordinateCirclePolygon(
          nodeToPosition(this.sourceElement),
          getColumnDiameterMeters(this.tags) / 2,
          COLUMN_CIRCLE_SEGMENTS,
        );
      case "way":
        return getWayPolygonGeometry(this.sourceElement, this.getAreaGeometryOptions());
      case "relation":
        return getRelationAreaGeometry(this.sourceElement, this.getAreaGeometryOptions());
    }
  }

  private getAreaGeometryOptions() {
    return {
      graph: this.graph,
      elementId: this.id,
      elementKind: "column",
      warningPrefix: "IndoorColumn",
      emittedWarnings: this.emittedGeometryWarnings,
      diagnostics: this.diagnostics,
      elementRef: this.ref,
      sourceElement: this.sourceElement,
    };
  }
}

function getColumnDiameterMeters(tags: Record<string, string>): number {
  return (
    parsePositiveMeters(tags.diameter) ??
    parsePositiveMeters(tags.width) ??
    DEFAULT_COLUMN_DIAMETER_METERS
  );
}
