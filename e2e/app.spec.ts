import { expect, Page, test } from "@playwright/test";

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

async function mockBackendData(page: Page): Promise<void> {
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

test.beforeEach(async ({ page }) => {
  await mockBackendData(page);
});

test("loads the map shell and core controls", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/AccessibleMaps Mobile/);
  await expect(page.getByRole("main", { name: /accessible indoor map/i })).toBeAttached();
  await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

  await expect(page.getByRole("combobox", { name: /search indoor|im geb.*ude suchen/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /set view|sicht.*zentrieren/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /zoom in|hineinzoomen/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /switch to wheelchair|rollstuhl/i })).toBeVisible();
});

test("supports basic control interactions", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

  await page.getByRole("button", { name: /switch to wheelchair|rollstuhl/i }).click();
  await expect(page.locator("#uiWrapper")).toHaveClass(/wheelchairMode/);

  await page.getByRole("combobox", { name: /search indoor|im geb.*ude suchen/i }).fill("does-not-exist");
  await page.getByRole("button", { name: /^search$|^suchen$/i }).click();
  await expect(page.getByRole("alert")).toContainText(/not found|nicht gefunden/i);
});
