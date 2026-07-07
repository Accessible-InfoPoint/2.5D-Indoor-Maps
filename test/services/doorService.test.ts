import doorService from "../../src/services/doorService";
import { DoorDataInterface } from "../../src/models/doorDataInterface";
import FeatureService from "../../src/services/featureService";

jest.mock("../../src/services/featureService", () => ({
  getFeatureStyle: jest.fn(),
}));
jest.mock("../../src/services/colorService", () => ({
  getCurrentColors: () => ({
    roomColorS: "#ff0000",
  }),
  default: {
    getCurrentColors: () => ({
      roomColorS: "#ff0000",
    }),
  },
}));

const sampleCoord: GeoJSON.Position = [10.0, 50.0];
const nearSampleCoord: GeoJSON.Position = [10.000001, 50.0];
const farSampleCoord: GeoJSON.Position = [10.00001, 50.0];
const otherCoord: GeoJSON.Position = [10.1, 50.1];
const levelA = 0;
const levelB = 1;

const mockProps = { width: 2 };

describe("doorService", () => {
  beforeEach(() => doorService.clearDoorIndex());

  describe("addDoor", () => {
    it("adds a new door to the index", () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      expect(doorService.checkIfDoorExists(sampleCoord)).toBe(true);
    });

    it("stores same-coordinate doors on different levels separately", () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      doorService.addDoor(sampleCoord, new Set([levelB]), { width: 5 });
      const levelADoors = doorService.getDoorsByLevel(levelA);
      const levelBDoors = doorService.getDoorsByLevel(levelB);

      expect(levelADoors).toHaveLength(1);
      expect(levelBDoors).toHaveLength(1);
      expect(levelADoors[0].properties.width).toBe(2);
      expect(levelBDoors[0].properties.width).toBe(5);
    });
  });

  describe("checkIfDoorExists", () => {
    beforeEach(() => doorService.clearDoorIndex());

    it("returns true for an existing door", () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      expect(doorService.checkIfDoorExists(sampleCoord)).toBe(true);
    });

    it("returns true for a nearby door coordinate within tolerance", () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      expect(doorService.checkIfDoorExists(nearSampleCoord)).toBe(true);
    });

    it("returns false for a nearby door coordinate outside tolerance", () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      expect(doorService.checkIfDoorExists(farSampleCoord)).toBe(false);
    });

    it("returns false for a non-existing door", () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      expect(doorService.checkIfDoorExists(otherCoord)).toBe(false);
    });
  });

  describe("addRoomToDoor", () => {
    beforeEach(() => doorService.clearDoorIndex());

    const roomFeature: GeoJSON.Feature = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
      properties: { name: "Room 1" },
    };

    it("adds a room to the door", () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      doorService.addRoomToDoor(sampleCoord, roomFeature);
      const door = doorService.getDoorsByLevel(levelA)[0];
      expect(door.rooms.length).toBe(1);
      expect(door.rooms[0].properties!.name).toBe("Room 1");
    });

    it("adds a room to a nearby matching door", () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      doorService.addRoomToDoor(nearSampleCoord, roomFeature);
      const door = doorService.getDoorsByLevel(levelA)[0];
      expect(door.rooms.length).toBe(1);
      expect(door.rooms[0].properties!.name).toBe("Room 1");
    });

    it("adds a room to the same-coordinate door matching the room level", () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      doorService.addDoor(sampleCoord, new Set([levelB]), { width: 5 });

      doorService.addRoomToDoor(sampleCoord, roomFeature, [levelB]);

      expect(doorService.getDoorsByLevel(levelA)[0].rooms).toHaveLength(0);
      expect(doorService.getDoorsByLevel(levelB)[0].rooms).toHaveLength(1);
    });
  });

  describe("calculateDoorOrientation", () => {
    beforeEach(() => doorService.clearDoorIndex());

    // identity projection for lat2y/y2lat
    jest.mock("../../src/utils/coordinateHelpers", () => ({
      getDistanceBetweenCoordinatesInM: jest.fn(() => 1),
      lat2y: jest.fn((lat) => lat),
      y2lat: jest.fn((y) => y),
    }));

    const prev: GeoJSON.Position = [9.9, 50.0];
    const after: GeoJSON.Position = [10.1, 50.0];

    it("calculates orientation if not already set", () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      doorService.calculateDoorOrientation(sampleCoord, prev, after);
      const door = doorService.getDoorsByLevel(levelA)[0];
      expect(door.orientation).toBeDefined();
      expect(Array.isArray(door.orientation)).toBe(true);
      expect(door.orientation?.length).toBe(2);
    });

    it("calculates orientation with no width set", () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), {});
      doorService.calculateDoorOrientation(sampleCoord, prev, after);
      const door = doorService.getDoorsByLevel(levelA)[0];
      expect(door.orientation).toBeDefined();
      expect(Array.isArray(door.orientation)).toBe(true);
      expect(door.orientation?.length).toBe(2);
    });

    it("calculates orientation for a nearby matching door", () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      doorService.calculateDoorOrientation(nearSampleCoord, prev, after);
      const door = doorService.getDoorsByLevel(levelA)[0];
      expect(door.orientation).toBeDefined();
      expect(Array.isArray(door.orientation)).toBe(true);
      expect(door.orientation?.length).toBe(2);
    });

    it("does not recalculate orientation if already set", () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      doorService.calculateDoorOrientation(sampleCoord, prev, after);
      const door = doorService.getDoorsByLevel(levelA)[0];
      const original = door.orientation;
      doorService.calculateDoorOrientation(sampleCoord, prev, after);
      expect(door.orientation).toBe(original); // still same reference
    });

    it("calculates orientation for the same-coordinate door matching the room level", () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      doorService.addDoor(sampleCoord, new Set([levelB]), { width: 5 });

      doorService.calculateDoorOrientation(sampleCoord, prev, after, [levelB]);

      expect(doorService.getDoorsByLevel(levelA)[0].orientation).toBeUndefined();
      expect(doorService.getDoorsByLevel(levelB)[0].orientation).toBeDefined();
    });
  });

  describe("getDoorsByLevel", () => {
    it("returns only doors on the requested level", () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      doorService.addDoor(otherCoord, new Set([levelB]), { width: 3 });
      const levelADoors = doorService.getDoorsByLevel(levelA);
      const levelBDoors = doorService.getDoorsByLevel(levelB);

      expect(levelADoors.length).toBeGreaterThan(0);
      expect(levelBDoors.length).toBe(1);
      expect(levelBDoors[0].coord).toEqual(otherCoord);
    });

    it("returns stacked same-coordinate doors for their individual levels", () => {
      doorService.addDoor(sampleCoord, new Set([levelA]), mockProps);
      doorService.addDoor(sampleCoord, new Set([levelB]), { width: 5 });

      expect(doorService.getDoorsByLevel(levelA)[0].properties.width).toBe(2);
      expect(doorService.getDoorsByLevel(levelB)[0].properties.width).toBe(5);
    });
  });

  describe("getRenderData", () => {
    const createMockRoom = (id: string, indoorType: string) => ({
      id,
      properties: { indoor: indoorType },
      geometry: null as null,
      type: "Feature" as const,
    });

    const mockOrientation: [GeoJSON.Position, GeoJSON.Position] = [
      [0, 0],
      [1, 1],
    ];

    beforeEach(() => {
      // Reset mock behavior before each test
      (FeatureService.getFeatureStyle as jest.Mock).mockReset();
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

      const result = doorService.getRenderData(door, []);
      expect(result.length).toBe(1);

      expect(result[0].coordinates).toEqual(mockOrientation);
      expect(result[0].symbol.lineColor).toBe("#cccccc");
      expect(result[0].symbol.lineWidth).toBe(3);
    });

    it("draws the door in the non-corridor room color if not all are corridors", () => {
      const room1 = createMockRoom("1", "room");
      const room2 = createMockRoom("2", "corridor");

      (FeatureService.getFeatureStyle as jest.Mock).mockImplementation((room) => {
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

      const result = doorService.getRenderData(door, []);

      expect(result[0].symbol.lineColor).toBe("#123456");
      expect(result[0].symbol.lineWidth).toBe(4);
    });

    it("uses selected room color if any room is selected", () => {
      const room1 = createMockRoom("1", "room");
      const room2 = createMockRoom("2", "corridor");

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

      const result = doorService.getRenderData(door, ["1"]);

      expect(result[0].symbol.lineColor).toBe("#ff0000"); // colors.roomColorS
      expect(result[0].symbol.lineWidth).toBe(5);
    });
  });
});
