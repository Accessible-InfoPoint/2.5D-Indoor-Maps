import doorService from '../../src/services/doorService';

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
});
