import { DoorDataInterface } from "../models/doorDataInterface";
import CoordinateHelpers from "../utils/coordinateHelpers";
import { DOOR_MATCH_TOLERANCE_M } from "../../public/strings/settings.json";
import { calculateOpeningOrientationGeometry } from "../indoor/openingOrientation";

const doorIndex = new Map<string, DoorDataInterface[]>();

function coordKey(coord: GeoJSON.Position): string {
  return coord.join(",");
}

function findDoorByCoordinate(
  coord: GeoJSON.Position,
  levels: number[] = [],
): DoorDataInterface | null {
  const exactMatches = doorIndex.get(coordKey(coord)) ?? [];
  const exactMatch = findBestLevelMatch(exactMatches, levels);

  if (exactMatch) return exactMatch;

  let nearestDoor: DoorDataInterface | null = null;
  let nearestDistance = DOOR_MATCH_TOLERANCE_M;

  getAllDoors().forEach((door) => {
    const distance = CoordinateHelpers.getDistanceBetweenCoordinatesInM(coord, door.coord);

    if (distance <= nearestDistance && hasSharedDoorLevel(door, levels)) {
      nearestDoor = door;
      nearestDistance = distance;
    }
  });

  return nearestDoor;
}

function clearDoorIndex() {
  doorIndex.clear();
}

function addDoor(coord: GeoJSON.Position, levels: Set<number>, geojsonProps: Record<string, any>) {
  const key = coordKey(coord);
  const doors = doorIndex.get(key) ?? [];
  const existingDoor = doors.find((door) => hasSameLevelSet(door.levels, levels));

  if (!existingDoor) {
    const door: DoorDataInterface = {
      coord,
      rooms: [],
      levels: levels,
      properties: { ...geojsonProps },
    };
    doorIndex.set(key, [...doors, door]);
  } else {
    console.info("duplicate door", coord, levels, geojsonProps, existingDoor);
  }
}

function checkIfDoorExists(doorCoord: GeoJSON.Position): boolean {
  return findDoorByCoordinate(doorCoord) !== null;
}

function addRoomToDoor(
  doorCoord: GeoJSON.Position,
  roomFeature: GeoJSON.Feature,
  levels: number[] = [],
) {
  const door = findDoorByCoordinate(doorCoord, levels);

  if (door) door.rooms.push(roomFeature);
}

function calculateDoorOrientation(
  doorCoord: GeoJSON.Position,
  previous: GeoJSON.Position,
  after: GeoJSON.Position,
  levels: number[] = [],
) {
  const door = findDoorByCoordinate(doorCoord, levels);

  if (door && door.orientation == undefined) {
    const matchedDoorCoord = door.coord;
    const doorWidth = door.properties.width ?? 1; // in meters
    const orientationGeometry = calculateOpeningOrientationGeometry(
      matchedDoorCoord,
      previous,
      after,
      doorWidth,
    );

    if (orientationGeometry === undefined) {
      return;
    }

    door.orientation = orientationGeometry.orientation;
    door.orientationDebug = orientationGeometry.debug;
  }
}

function getDoorsByLevel(level: number): DoorDataInterface[] {
  return getAllDoors().filter((door) => door.levels.has(level));
}

function getAllDoors(): DoorDataInterface[] {
  return Array.from(doorIndex.values()).flat();
}

function findBestLevelMatch(
  doors: DoorDataInterface[],
  levels: number[],
): DoorDataInterface | undefined {
  if (levels.length == 0) {
    return doors[0];
  }

  return doors.find((door) => hasSharedDoorLevel(door, levels));
}

function hasSharedDoorLevel(door: DoorDataInterface, levels: number[]): boolean {
  return levels.length == 0 || levels.some((level) => door.levels.has(level));
}

function hasSameLevelSet(a: Set<number>, b: Set<number>): boolean {
  return a.size == b.size && Array.from(a).every((level) => b.has(level));
}

export default {
  clearDoorIndex,
  addDoor,
  checkIfDoorExists,
  addRoomToDoor,
  calculateDoorOrientation,
  getDoorsByLevel,
  findDoorByCoordinate,
};
