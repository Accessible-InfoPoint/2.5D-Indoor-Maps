import doorService from "../../src/services/doorService";
import * as Maptalks from "maptalks";
import { DoorDataInterface } from "../../src/models/doorDataInterface";
import FeatureService from "../../src/services/featureService";
import { geoMap } from "../../src/main";

jest.mock("../../src/services/featureService", () => ({
  getFeatureStyle: jest.fn()
}));
jest.mock("../../src/main", () => ({
  geoMap: {
    selectedFeatures: [] as string[],
  },
}));
jest.mock("../../src/services/colorService", () => ({
  colors: {
    roomColorS: "#ff0000",
  },
}));
jest.mock("maptalks", () => {
  class MockLineString {
    coordinates: any;
    options: any;
    constructor(coordinates: any, options: any) {
      this.coordinates = coordinates;
      this.options = options;
    }

    getCoordinates() {
      return this.coordinates;
    }

    getSymbol() {
      return this.options?.symbol;
    }
  }

  return {
    LineString: MockLineString,
    // Mock other classes as no-op if needed
    // Map: jest.fn(),
    // Marker: jest.fn(),
    // etc...
  };
});


const sampleCoord: GeoJSON.Position = [10.0, 50.0];
const otherCoord: GeoJSON.Position = [10.1, 50.1];
const levelA = 0;
const levelB = 1;

const mockProps = { width: 2 };

describe('doorService', () => {
  describe('addDoor', () => {
    it('adds a new door to the index', () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      expect(doorService.checkIfDoorExists(sampleCoord)).toBe(true);
    });

    it('does not overwrite an existing door', () => {
      doorService.addDoor(sampleCoord, new Set([levelB]), { width: 5 });
      const doors = doorService.getDoorsByLevel(levelA);
      expect(doors[0].properties.width).toBe(2); // should not be overwritten
      expect(doors[0].levels.has(levelA)).toBe(true);
    });
  });

  describe('checkIfDoorExists', () => {
    beforeEach(() => doorService.clearDoorIndex());

    it('returns true for an existing door', () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      expect(doorService.checkIfDoorExists(sampleCoord)).toBe(true);
    });

    it('returns false for a non-existing door', () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      expect(doorService.checkIfDoorExists(otherCoord)).toBe(false);
    });
  });

  describe('addRoomToDoor', () => {
    beforeEach(() => doorService.clearDoorIndex());

    const roomFeature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]],
      },
      properties: { name: 'Room 1' }
    };

    it('adds a room to the door', () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      doorService.addRoomToDoor(sampleCoord, roomFeature);
      const door = doorService.getDoorsByLevel(levelA)[0];
      expect(door.rooms.length).toBe(1);
      expect(door.rooms[0].properties!.name).toBe('Room 1');
    });
  });

  describe('calculateDoorOrientation', () => {
    beforeEach(() => doorService.clearDoorIndex());

    // identity projection for lat2y/y2lat
    jest.mock('../../src/utils/coordinateHelpers', () => ({
      getDistanceBetweenCoordinatesInM: jest.fn(() => 1),
      lat2y: jest.fn(lat => lat),
      y2lat: jest.fn(y => y),
    }));

    const prev: GeoJSON.Position = [9.9, 50.0];
    const after: GeoJSON.Position = [10.1, 50.0];

    it('calculates orientation if not already set', () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      doorService.calculateDoorOrientation(sampleCoord, prev, after);
      const door = doorService.getDoorsByLevel(levelA)[0];
      expect(door.orientation).toBeDefined();
      expect(Array.isArray(door.orientation)).toBe(true);
      expect(door.orientation?.length).toBe(2);
    });

    it('calculates orientation with no width set', () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), {});
      doorService.calculateDoorOrientation(sampleCoord, prev, after);
      const door = doorService.getDoorsByLevel(levelA)[0];
      expect(door.orientation).toBeDefined();
      expect(Array.isArray(door.orientation)).toBe(true);
      expect(door.orientation?.length).toBe(2);
    });

    it('does not recalculate orientation if already set', () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      doorService.calculateDoorOrientation(sampleCoord, prev, after);
      const door = doorService.getDoorsByLevel(levelA)[0];
      const original = door.orientation;
      doorService.calculateDoorOrientation(sampleCoord, prev, after);
      expect(door.orientation).toBe(original); // still same reference
    });
  });

  describe('getDoorsByLevel', () => {
    it('returns only doors on the requested level', () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      doorService.addDoor(otherCoord, new Set([levelB]), { width: 3 });
      const levelADoors = doorService.getDoorsByLevel(levelA);
      const levelBDoors = doorService.getDoorsByLevel(levelB);

      expect(levelADoors.length).toBeGreaterThan(0);
      expect(levelBDoors.length).toBe(1);
      expect(levelBDoors[0].coord).toEqual(otherCoord);
    });
  });

  describe("getVisualization", () => {
    const createMockRoom = (id: string, indoorType: string) => ({
      id,
      properties: { indoor: indoorType },
      geometry: null as null,
      type: "Feature" as const
    });
  
    const mockOrientation: [GeoJSON.Position, GeoJSON.Position] = [
      [0, 0],
      [1, 1],
    ];
  
    beforeEach(() => {
      // Reset mock behavior before each test
      (FeatureService.getFeatureStyle as jest.Mock).mockReset();
      geoMap.selectedFeatures = [];
    });
  
    it("draws the door in corridor color when both rooms are corridors", () => {
      const room1 = createMockRoom("1", "corridor");
      const room2 = createMockRoom("2", "corridor");
  
      (FeatureService.getFeatureStyle as jest.Mock).mockReturnValue({
        polygonFill: "#cccccc",
        lineWidth: 3,
      });
  
      const door: DoorDataInterface = {
        coord: [0, 0],
        // geometry can be null, no idea why it breaks
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        rooms: [room1, room2],
        levels: new Set([1]),
        orientation: mockOrientation,
        properties: {},
      };
  
      const result = doorService.getVisualization(door);
      expect(result.length).toBe(1);
  
      const line = result[0] as Maptalks.LineString;
      expect(line.getCoordinates()).toEqual(mockOrientation);
      expect(line.getSymbol().lineColor).toBe("#cccccc");
      expect(line.getSymbol().lineWidth).toBe(3);
    });
  
    it("draws the door in the non-corridor room color if not all are corridors", () => {
      const room1 = createMockRoom("1", "room");
      const room2 = createMockRoom("2", "corridor");
  
      (FeatureService.getFeatureStyle as jest.Mock).mockImplementation(room => {
        return room.properties.indoor === "room"
          ? { polygonFill: "#123456", lineWidth: 4 }
          : { polygonFill: "#654321", lineWidth: 4 };
      });
  
      const door: DoorDataInterface = {
        coord: [0, 0],
        // geometry can be null, no idea why it breaks
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        rooms: [room1, room2],
        levels: new Set([1]),
        orientation: mockOrientation,
        properties: {},
      };
  
      const result = doorService.getVisualization(door);
      const line = result[0] as Maptalks.LineString;
  
      expect(line.getSymbol().lineColor).toBe("#123456");
      expect(line.getSymbol().lineWidth).toBe(4);
    });
  
    it("uses selected room color if any room is selected", () => {
      const room1 = createMockRoom("1", "room");
      const room2 = createMockRoom("2", "corridor");
  
      geoMap.selectedFeatures = ["1"];
  
      (FeatureService.getFeatureStyle as jest.Mock).mockReturnValue({
        polygonFill: "#abcdef",
        lineWidth: 5,
      });
  
      const door: DoorDataInterface = {
        coord: [0, 0],
        // geometry can be null, no idea why it breaks
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        rooms: [room1, room2],
        levels: new Set([1]),
        orientation: mockOrientation,
        properties: {},
      };
  
      const result = doorService.getVisualization(door);
      const line = result[0] as Maptalks.LineString;
  
      expect(line.getSymbol().lineColor).toBe("#ff0000"); // colors.roomColorS
      expect(line.getSymbol().lineWidth).toBe(5);
    });
  });
});
