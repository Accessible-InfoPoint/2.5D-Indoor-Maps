export interface StyledFeatureRenderItem {
  feature: GeoJSON.Feature;
  style: Record<string, unknown>;
}

export interface RoomRenderItem extends StyledFeatureRenderItem {
  isSelected: boolean;
  isVisibleIn3D: boolean;
  label?: string;
  selectedPositionMarker?: PositionMarkerRenderItem;
}

export interface InfoPointRenderItem {
  feature: GeoJSON.Feature;
  levels: number[];
}

export interface PositionMarkerRenderItem {
  feature: GeoJSON.Feature;
  label: string;
}

export interface StaircaseRenderModel {
  doorCoordinates: GeoJSON.Position[];
  lowestPoints: GeoJSON.Feature[];
  pathways: GeoJSON.Feature[];
  allNodes: GeoJSON.Feature[];
  simpleFeatures: GeoJSON.Feature[];
  complexFeatures: GeoJSON.Feature[];
}

export interface IndoorLevelRenderModel {
  outlineCoordinates: number[][];
  infoPoint?: InfoPointRenderItem;
  rooms: RoomRenderItem[];
  tactilePaving: StyledFeatureRenderItem[];
  pointMarkerFeatures: GeoJSON.Feature[];
  staircase: StaircaseRenderModel;
}
