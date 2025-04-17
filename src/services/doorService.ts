import { DoorDataInterface } from "../models/doorDataInterface";
import CoordinateHelpers from "../utils/coordinateHelpers";

const doorIndex = new Map<string, DoorDataInterface>();

function coordKey(coord: GeoJSON.Position): string {
  return coord.join(',');
}

function clearDoorIndex() {
  doorIndex.clear();
}

function addDoor(
  coord: GeoJSON.Position,
  levels: Set<number>,
  geojsonProps: Record<string, any>
) {
  const key = coordKey(coord);
  let door = doorIndex.get(key);

  if (!door) {
    door = {
      coord,
      rooms: [],
      levels: levels,
      properties: { ...geojsonProps }
    };
    doorIndex.set(key, door);
  }
}

function checkIfDoorExists(doorCoord: GeoJSON.Position): boolean {
  return doorIndex.has(coordKey(doorCoord))
}

function addRoomToDoor(
  doorCoord: GeoJSON.Position,
  roomFeature: GeoJSON.Feature
) {
  const door = doorIndex.get(coordKey(doorCoord));

  if (door)
    door.rooms.push(roomFeature);
}

function calculateDoorOrientation(
  doorCoord: GeoJSON.Position,
  previous: GeoJSON.Position,
  after: GeoJSON.Position
) {
  const door = doorIndex.get(coordKey(doorCoord));

  if (door && door.orientation == undefined) {
    // door should be scaled to common width
    const prevDist = CoordinateHelpers.getDistanceBetweenCoordinatesInM(previous, doorCoord);
    const afterDist = CoordinateHelpers.getDistanceBetweenCoordinatesInM(after, doorCoord);
    const doorWidth = door.properties.width ?? 1; // in meters
    // we need to take spherical earth into account, therefore we must project into mercator, then calculate the door and project back
    const prevDoorCoord = [
      doorCoord[0] + ((previous[0] - doorCoord[0]) * doorWidth) / (2 * prevDist),
      CoordinateHelpers.y2lat(
        CoordinateHelpers.lat2y(doorCoord[1]) +
          ((CoordinateHelpers.lat2y(previous[1]) -
            CoordinateHelpers.lat2y(doorCoord[1])) *
            doorWidth) /
            (2 * prevDist)
      ),
    ];
    const afterDoorCoord = [
      doorCoord[0] + ((after[0] - doorCoord[0]) * doorWidth) / (2 * afterDist),
      CoordinateHelpers.y2lat(
        CoordinateHelpers.lat2y(doorCoord[1]) +
          ((CoordinateHelpers.lat2y(after[1]) -
            CoordinateHelpers.lat2y(doorCoord[1])) *
            doorWidth) /
            (2 * afterDist)
      ),
    ];

    door.orientation = [prevDoorCoord, afterDoorCoord];
  }
}

function getDoorsByLevel(level: number): DoorDataInterface[] {
  return Array.from(doorIndex.values()).filter(door => door.levels.has(level));
}

export default {
  clearDoorIndex,
  addDoor,
  checkIfDoorExists,
  addRoomToDoor,
  calculateDoorOrientation,
  getDoorsByLevel
}