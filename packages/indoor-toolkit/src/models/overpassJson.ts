/** Minimal raw Overpass JSON shape consumed by the parser. */
export interface OverpassJson {
  /** Optional Overpass response version. */
  version?: number;
  /** Optional Overpass generator string. */
  generator?: string;
  /** Optional Overpass metadata block, preserved but not interpreted. */
  osm3s?: unknown;
  /** Raw OSM elements returned by Overpass. */
  elements: OverpassElement[];
}

/** Raw OSM element supported by Overpass JSON. */
export type OverpassElement = OverpassNode | OverpassWay | OverpassRelation;

/** Raw OSM node with geographic coordinates. */
export interface OverpassNode extends OverpassElementBase {
  type: "node";
  /** Latitude in WGS84 degrees. */
  lat: number;
  /** Longitude in WGS84 degrees. */
  lon: number;
}

/** Raw OSM way represented by ordered node ids. */
export interface OverpassWay extends OverpassElementBase {
  type: "way";
  /** Ordered node ids referenced by the way. */
  nodes: number[];
}

/** Raw OSM relation represented by typed members. */
export interface OverpassRelation extends OverpassElementBase {
  type: "relation";
  /** Relation members in authored order. */
  members: OverpassRelationMember[];
}

/** Shared raw OSM element properties. */
export interface OverpassElementBase {
  /** Numeric OSM id within the element type. */
  id: number;
  /** Raw OSM tags, if present. */
  tags?: Record<string, string>;
}

/** Raw OSM relation member reference. */
export interface OverpassRelationMember {
  /** Referenced OSM element type. */
  type: "node" | "way" | "relation";
  /** Referenced OSM id. */
  ref: number;
  /** Relation role, for example `outer` or `inner`. */
  role: string;
}
