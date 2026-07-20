export interface OpeningOrientationDebugData {
  previous: GeoJSON.Position;
  opening: GeoJSON.Position;
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
  orientation?: [GeoJSON.Position, GeoJSON.Position, GeoJSON.Position];
  orientationDebug?: OpeningOrientationDebugData;
  properties: Record<string, any>; // from GeoJSON properties
}
