export interface BuildingInterface {
  /**
   * Stable OSM element key, e.g. "way/123" or "relation/456".
   */
  id: string;
  tags: Record<string, unknown>;
  /**
   * Array of coordinates in the order [West, South, East, North].
   */
  boundingBox: number[];
  outlineGeometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}
