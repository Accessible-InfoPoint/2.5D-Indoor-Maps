export interface OverpassJson {
  version?: number;
  generator?: string;
  osm3s?: unknown;
  elements: OverpassElement[];
}

export type OverpassElement = OverpassNode | OverpassWay | OverpassRelation;

export interface OverpassNode extends OverpassElementBase {
  type: "node";
  lat: number;
  lon: number;
}

export interface OverpassWay extends OverpassElementBase {
  type: "way";
  nodes: number[];
}

export interface OverpassRelation extends OverpassElementBase {
  type: "relation";
  members: OverpassRelationMember[];
}

export interface OverpassElementBase {
  id: number;
  tags?: Record<string, string>;
}

export interface OverpassRelationMember {
  type: "node" | "way" | "relation";
  ref: number;
  role: string;
}
