export interface DoorDataInterface {
  coord: GeoJSON.Position;
  rooms: GeoJSON.Feature[];
  levels: Set<number>;
  orientation?: [GeoJSON.Position, GeoJSON.Position];
  properties: Record<string, any>; // from GeoJSON properties
}