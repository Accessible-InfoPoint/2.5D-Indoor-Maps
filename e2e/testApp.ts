import { Page } from "@playwright/test";

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
        coordinates: [[
          [13.7227, 51.0253],
          [13.723, 51.0253],
          [13.723, 51.0256],
          [13.7227, 51.0256],
          [13.7227, 51.0253],
        ]],
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
          coordinates: [[
            [13.72278, 51.02538],
            [13.7229, 51.02538],
            [13.7229, 51.02548],
            [13.72278, 51.02548],
            [13.72278, 51.02538],
          ]],
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

  await page.route(/https:\/\/.*\.basemaps\.cartocdn\.com\/.*/, async (route) => {
    await route.abort();
  });
}

export async function loadTestApp(page: Page): Promise<void> {
  await mockBackendData(page);
  await page.goto("/");
}
