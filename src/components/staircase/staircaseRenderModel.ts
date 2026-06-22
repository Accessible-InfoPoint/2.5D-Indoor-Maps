export type StaircaseMaterialRole = "main" | "outline";

export interface StaircasePrismRenderItem {
  type: "prism";
  coordinates: GeoJSON.Position[];
  height: number;
  altitude: number;
  materialRole: StaircaseMaterialRole;
}

export interface StaircaseCylinderRenderItem {
  type: "cylinder";
  coordinate: GeoJSON.Position;
  height: number;
  altitude: number;
  radius: number;
  radialSegments: number;
  materialRole: StaircaseMaterialRole;
}

export type StaircaseRenderItem =
  | StaircasePrismRenderItem
  | StaircaseCylinderRenderItem;
