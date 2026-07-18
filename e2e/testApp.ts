import { expect, Page } from "@playwright/test";

const testBuildingResponse = {
  buildingInterface: {
    boundingBox: [13.7227, 51.0253, 13.723, 51.0256],
    feature: {
      id: "way/building",
      type: "Feature",
      properties: {
        building: "university",
        name: "Andreas-Pfitzmann-Bau",
        loc_ref: "APB",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [13.7227, 51.0253],
            [13.723, 51.0253],
            [13.723, 51.0256],
            [13.7227, 51.0256],
            [13.7227, 51.0253],
          ],
        ],
      },
    },
  },
  geoJson: {
    type: "FeatureCollection",
    features: [
      {
        id: "node/8109446525",
        type: "Feature",
        properties: { level: "0" },
        geometry: { type: "Point", coordinates: [13.7228, 51.02535] },
      },
      {
        id: "node/8109446619",
        type: "Feature",
        properties: { level: "0" },
        geometry: { type: "Point", coordinates: [13.7229, 51.02555] },
      },
      {
        id: "way/room-1",
        type: "Feature",
        properties: {
          indoor: "room",
          level: "0",
          name: "Test Room",
          ref: "101",
          wheelchair: "yes",
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [13.72278, 51.02538],
              [13.7229, 51.02538],
              [13.7229, 51.02548],
              [13.72278, 51.02548],
              [13.72278, 51.02538],
            ],
          ],
        },
      },
    ],
  },
};

const testRawOverpassResponse = {
  buildingInterface: testBuildingResponse.buildingInterface,
  buildings: {
    version: 0.6,
    generator: "e2e",
    elements: [
      { type: "node", id: 1, lat: 51.0253, lon: 13.7227 },
      { type: "node", id: 2, lat: 51.0253, lon: 13.723 },
      { type: "node", id: 3, lat: 51.0256, lon: 13.723 },
      { type: "node", id: 4, lat: 51.0256, lon: 13.7227 },
      {
        type: "way",
        id: 1,
        nodes: [1, 2, 3, 4, 1],
        tags: {
          building: "university",
          name: "Andreas-Pfitzmann-Bau",
          loc_ref: "APB",
        },
      },
    ],
  },
  indoor: {
    version: 0.6,
    generator: "e2e",
    elements: [
      {
        type: "node",
        id: 8109446525,
        lat: 51.02535,
        lon: 13.7228,
        tags: { level: "0" },
      },
      {
        type: "node",
        id: 8109446619,
        lat: 51.02555,
        lon: 13.7229,
        tags: { level: "0" },
      },
      { type: "node", id: 101, lat: 51.02538, lon: 13.72278 },
      { type: "node", id: 102, lat: 51.02538, lon: 13.7229 },
      { type: "node", id: 103, lat: 51.02548, lon: 13.7229 },
      { type: "node", id: 104, lat: 51.02548, lon: 13.72278 },
      {
        type: "way",
        id: 101,
        nodes: [101, 102, 103, 104, 101],
        tags: {
          indoor: "room",
          level: "0",
          name: "Test Room",
          ref: "101",
          wheelchair: "yes",
        },
      },
    ],
  },
};

export async function mockBackendData(page: Page): Promise<void> {
  await page.route("**/api/buildings/apb/indoor", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(testBuildingResponse),
    });
  });

  await page.route("**/api/buildings/apb/overpass", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(testRawOverpassResponse),
    });
  });

  await page.route(/https:\/\/.*\.basemaps\.cartocdn\.com\/.*/, async (route) => {
    await route.abort();
  });
}

export async function loadTestApp(page: Page): Promise<void> {
  await mockBackendData(page);
  await page.goto("/");
  await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/, {
    timeout: 15_000,
  });
}
