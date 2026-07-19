import { OverpassElement } from "../../models/overpassJson";
import { OsmGraph } from "../../overpass/OsmGraph";
import CoordinateHelpers from "../../utils/coordinateHelpers";
import { nodeToPosition } from "../../utils/overpassJsonHelpers";
import { getRelationAreaGeometry, getWayPolygonGeometry } from "../indoorAreaGeometry";
import { isRawIndoorColumnElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

const DEFAULT_COLUMN_DIAMETER_METERS = 0.5;
const COLUMN_CIRCLE_SEGMENTS = 24;

export class IndoorColumn extends IndoorElement {
  private static readonly emittedWarnings = new Set<string>();

  static collectFromGraph(graph: OsmGraph): IndoorColumn[] {
    return graph.elements
      .filter(isRawIndoorColumnElement)
      .map((element) => new IndoorColumn(graph, element));
  }

  constructor(graph: OsmGraph, sourceElement: OverpassElement) {
    super(graph, sourceElement);
  }

  toGeoJsonFeature(): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | undefined {
    const geometry = this.toGeoJsonGeometry();

    if (geometry === undefined) {
      return undefined;
    }

    return {
      type: "Feature",
      id: this.id,
      properties: { ...this.tags },
      geometry,
    };
  }

  private toGeoJsonGeometry(): GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined {
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
      emittedWarnings: IndoorColumn.emittedWarnings,
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

function parsePositiveMeters(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = parseFloat(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
