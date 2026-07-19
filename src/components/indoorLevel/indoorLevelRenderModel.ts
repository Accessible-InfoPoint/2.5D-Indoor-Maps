import { DoorOrientationDebugData } from "../../models/doorDataInterface";
import { AccessibilityMarkerData } from "../../services/featureService";

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

export interface AccessibilityMarkerRenderItem {
  id: string | number;
  sourceFeature: GeoJSON.Feature;
  markerData: AccessibilityMarkerData;
}

export interface DoorRenderItem {
  coordinates: [GeoJSON.Position, GeoJSON.Position];
  symbol: {
    lineColor: string;
    lineWidth: number;
  };
  debug?: DoorOrientationDebugData;
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
  doors: DoorRenderItem[];
  walls: StyledFeatureRenderItem[];
  tactilePaving: StyledFeatureRenderItem[];
  accessibilityMarkers: AccessibilityMarkerRenderItem[];
  staircase: StaircaseRenderModel;
}
