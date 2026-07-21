import { OpeningOrientationDebugData } from "../../models/doorDataInterface";
import { IndoorElementRef } from "../../models/indoorElementRef";
import { AccessibilityMarkerData } from "../../services/featureService";
import { StaircaseRenderItem } from "../staircase/staircaseRenderModel";

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

export interface StaircaseRenderModel {
  renderItems: StyledStaircaseRenderItem[];
  doorCoordinates: GeoJSON.Position[];
  lowestPoints: GeoJSON.Feature[];
  pathways: GeoJSON.Feature[];
  allNodes: GeoJSON.Feature[];
  simpleFeatures: GeoJSON.Feature[];
  complexFeatures: GeoJSON.Feature[];
}

export interface StyledStaircaseRenderItem {
  item: StaircaseRenderItem;
  color: string;
}

export type IndoorLevelOutlineGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon;

export interface IndoorLevelRenderModel {
  outlineGeometry: IndoorLevelOutlineGeometry;
  infoPoint?: InfoPointRenderItem;
  rooms: RoomRenderItem[];
  openings: OpeningRenderItem[];
  walls: StyledFeatureRenderItem[];
  tactilePaving: StyledFeatureRenderItem[];
  accessibilityMarkers: AccessibilityMarkerRenderItem[];
  staircase: StaircaseRenderModel;
}
