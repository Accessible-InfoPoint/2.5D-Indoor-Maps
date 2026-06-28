export interface DoorOrientationDebugData {
  previous: GeoJSON.Position;
  door: GeoJSON.Position;
  after: GeoJSON.Position;
  previousDistanceM: number;
  afterDistanceM: number;
  widthM: number;
  calculatedPrevious: GeoJSON.Position;
  calculatedAfter: GeoJSON.Position;
}

export interface DoorDataInterface {
  coord: GeoJSON.Position;
  rooms: GeoJSON.Feature[];
  levels: Set<number>;
  orientation?: [GeoJSON.Position, GeoJSON.Position];
  orientationDebug?: DoorOrientationDebugData;
  properties: Record<string, any>; // from GeoJSON properties
}
