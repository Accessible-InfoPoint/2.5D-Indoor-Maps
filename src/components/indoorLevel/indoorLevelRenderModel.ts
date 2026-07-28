import { IndoorElementRef } from "../../models/indoorElementRef";
import { AccessibilityMarkerData } from "../../services/featureService";
import { OpeningOrientationDebugData } from "../../indoor";

export interface StyledFeatureRenderItem {
  feature: GeoJSON.Feature;
  style: Record<string, unknown>;
}

export interface RoomRenderItem extends StyledFeatureRenderItem {
  elementRef: IndoorElementRef;
  isSelected: boolean;
  isVisibleIn3D: boolean;
  label?: string;
  selectedPositionMarker?: PositionMarkerRenderItem;
}

export interface InfoPointRenderItem {
  feature: GeoJSON.Feature;
  elementRef: IndoorElementRef;
  levels: number[];
}

export interface PositionMarkerRenderItem {
  feature: GeoJSON.Feature;
  label: string;
}

export interface AccessibilityMarkerRenderItem {
  id: string | number;
  elementRef: IndoorElementRef;
  sourceFeature: GeoJSON.Feature;
  markerData: AccessibilityMarkerData;
}

export interface OpeningRenderItem {
  kind?: "door" | "opening";
  coordinates: [GeoJSON.Position, GeoJSON.Position, GeoJSON.Position];
  symbol: {
    lineColor: string;
    lineWidth: number;
  };
  debug?: OpeningOrientationDebugData;
}

export interface StyledStaircaseRenderItem {
  item: StaircaseRenderItem;
  color: string;
}

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

export type StaircaseRenderItem = StaircasePrismRenderItem | StaircaseCylinderRenderItem;

export type IndoorLevelOutlineGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon;

export interface IndoorLevelRenderModel {
  outlineGeometry: IndoorLevelOutlineGeometry;
  infoPoint?: InfoPointRenderItem;
  rooms: RoomRenderItem[];
  openings: OpeningRenderItem[];
  walls: StyledFeatureRenderItem[];
  tactilePaving: StyledFeatureRenderItem[];
  accessibilityMarkers: AccessibilityMarkerRenderItem[];
  staircase: StyledStaircaseRenderItem[];
}
