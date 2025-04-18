import { isDrawableRoomOrArea, isVisibleIn3DMode } from '../../src/utils/drawableElementFilter';

jest.mock('../../src/main', () => ({
  geoMap: {
    selectedFeatures: ['room-123']
  }
}));

describe('isDrawableRoomOrArea', () => {
  it('returns true for a valid drawable room', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [] },
      properties: { indoor: 'room' },
    };

    expect(isDrawableRoomOrArea(feature)).toBe(true);
  });

  it('returns false if geometry is not Polygon', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { indoor: 'room' },
    };

    expect(isDrawableRoomOrArea(feature)).toBe(false);
  });

  it('returns false if indoor is "pathway"', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [] },
      properties: { indoor: 'pathway' },
    };

    expect(isDrawableRoomOrArea(feature)).toBe(false);
  });

  it('returns false if area is explicitly "no"', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [] },
      properties: { indoor: 'room', area: 'no' },
    };

    expect(isDrawableRoomOrArea(feature)).toBe(false);
  });
});

describe('isVisibleIn3DMode', () => {
  it('returns true for corridor', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [] },
      properties: { indoor: 'corridor' },
    };

    expect(isVisibleIn3DMode(feature)).toBe(true);
  });

  it('returns true for area', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [] },
      properties: { indoor: 'area' },
    };

    expect(isVisibleIn3DMode(feature)).toBe(true);
  });

  it('returns true for elevators', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [] },
      properties: { highway: 'elevator' },
    };

    expect(isVisibleIn3DMode(feature)).toBe(true);
  });

  it('returns true for stairs', () => {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [] },
      properties: { stairs: 'yes' },
    };

    expect(isVisibleIn3DMode(feature)).toBe(true);
  });

  it('returns true if feature is selected', () => {
    const feature: GeoJSON.Feature = {
      id: 'room-123',
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [] },
      properties: {},
    };

    expect(isVisibleIn3DMode(feature)).toBe(true);
  });

  it('returns false if none of the conditions match', () => {
    const feature: GeoJSON.Feature = {
      id: 'not-selected',
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [] },
      properties: { indoor: 'room' },
    };

    expect(isVisibleIn3DMode(feature)).toBe(false);
  });
});