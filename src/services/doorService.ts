import { DoorDataInterface } from "../models/doorDataInterface";
import CoordinateHelpers from "../utils/coordinateHelpers";
import ColorService from "../services/colorService";
import FeatureService from "../services/featureService";
import { DOOR_MATCH_TOLERANCE_M } from "../../public/strings/settings.json";
import { getRequiredFeatureId, getRequiredFeatureProperties } from "../utils/geoJsonHelpers";

const doorIndex = new Map<string, DoorDataInterface[]>();

export interface DoorRenderData {
  coordinates: GeoJSON.Position[];
  symbol: {
    lineColor: string;
    lineWidth: number;
  };
}

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
    // door should be scaled to common width
    const prevDist = CoordinateHelpers.getDistanceBetweenCoordinatesInM(previous, matchedDoorCoord);
    const afterDist = CoordinateHelpers.getDistanceBetweenCoordinatesInM(after, matchedDoorCoord);
    const doorWidth = door.properties.width ?? 1; // in meters
    // we need to take spherical earth into account, therefore we must project into mercator, then calculate the door and project back
    const prevDoorCoord = [
      matchedDoorCoord[0] + ((previous[0] - matchedDoorCoord[0]) * doorWidth) / (2 * prevDist),
      CoordinateHelpers.y2lat(
        CoordinateHelpers.lat2y(matchedDoorCoord[1]) +
          ((CoordinateHelpers.lat2y(previous[1]) - CoordinateHelpers.lat2y(matchedDoorCoord[1])) *
            doorWidth) /
            (2 * prevDist),
      ),
    ];
    const afterDoorCoord = [
      matchedDoorCoord[0] + ((after[0] - matchedDoorCoord[0]) * doorWidth) / (2 * afterDist),
      CoordinateHelpers.y2lat(
        CoordinateHelpers.lat2y(matchedDoorCoord[1]) +
          ((CoordinateHelpers.lat2y(after[1]) - CoordinateHelpers.lat2y(matchedDoorCoord[1])) *
            doorWidth) /
            (2 * afterDist),
      ),
    ];

    door.orientation = [prevDoorCoord, afterDoorCoord];
    door.orientationDebug = {
      previous,
      door: matchedDoorCoord,
      after,
      previousDistanceM: prevDist,
      afterDistanceM: afterDist,
      widthM: doorWidth,
      calculatedPrevious: prevDoorCoord,
      calculatedAfter: afterDoorCoord,
    };
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

function getRenderData(door: DoorDataInterface, selectedFeatureIds: string[]): DoorRenderData[] {
  // TODO: other types of doors need different visualizations, especially revolving doors
  const renderData: DoorRenderData[] = [];

  // linear door (e.g. hinged, sliding, opening etc)
  let color: string;

  if (
    door.rooms.every((feature) => {
      const properties = getRequiredFeatureProperties(feature);

      return ["corridor", "area"].includes(properties.indoor) && properties.stairs !== "yes";
    })
  )
    color = FeatureService.getFeatureStyle(door.rooms[0])["polygonFill"]; // if every room connected is a corridor or an area (for rooms bordering an area, and it is not a free standing staircase), we draw it in corridor color
  else
    color = FeatureService.getFeatureStyle(
      door.rooms.filter((feature) => {
        const properties = getRequiredFeatureProperties(feature);

        return !(["corridor", "area"].includes(properties.indoor) && properties.stairs !== "yes");
      })[0],
    )["polygonFill"]; // else we draw it in the color of the not-corridor (or not-area)

  if (door.rooms.some((feature) => selectedFeatureIds.includes(getRequiredFeatureId(feature))))
    color = ColorService.getCurrentColors().roomColorS; // at least one room is selected, color door in selected room color

  if (!door.orientation) return renderData;

  renderData.push({
    coordinates: door.orientation,
    symbol: {
      lineColor: color,
      lineWidth: FeatureService.getFeatureStyle(Array.from(door.rooms)[0])["lineWidth"],
    },
  });

  return renderData;
}

export default {
  clearDoorIndex,
  addDoor,
  checkIfDoorExists,
  addRoomToDoor,
  calculateDoorOrientation,
  getDoorsByLevel,
  getRenderData,
  findDoorByCoordinate,
};
