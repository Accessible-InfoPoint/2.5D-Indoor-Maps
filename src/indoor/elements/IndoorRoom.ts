import { OverpassElement } from "../../models/overpassJson";
import { OsmGraph } from "../../overpass/OsmGraph";
import { getRelationAreaGeometry, getWayPolygonGeometry } from "../indoorAreaGeometry";
import { isRawIndoorRoomElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

/**
 * Handles all rooms and areas:
 * - regular rooms
 * - corridor
 * - area (e.g. foyer)
 * - special rooms (toilets, staircases)
 * - this does not handle 3D visualizations of staircases and 2D stairs (which are different from staircases: LINK) # TODO
 *
 * Styling of elements is done in rawIndoorLevelRenderBuilder.ts
 */
export class IndoorRoom extends IndoorElement {
  private static readonly emittedWarnings = new Set<string>();

  static collectFromGraph(graph: OsmGraph): IndoorRoom[] {
    return graph.elements
      .filter(isRawIndoorRoomElement)
      .map((element) => new IndoorRoom(graph, element));
  }

  constructor(graph: OsmGraph, sourceElement: OverpassElement) {
    super(graph, sourceElement);
  }

  get indoorKind(): string | undefined {
    return this.tags.indoor;
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
      case "way":
        return getWayPolygonGeometry(this.sourceElement, this.getAreaGeometryOptions());
      case "relation":
        return getRelationAreaGeometry(this.sourceElement, this.getAreaGeometryOptions());
      case "node":
        return undefined;
    }
  }

  private getAreaGeometryOptions() {
    return {
      graph: this.graph,
      elementId: this.id,
      elementKind: "room",
      warningPrefix: "IndoorRoom",
      emittedWarnings: IndoorRoom.emittedWarnings,
    };
  }
}
