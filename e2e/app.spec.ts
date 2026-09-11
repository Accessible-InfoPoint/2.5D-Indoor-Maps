import { expect, test } from "@playwright/test";
import { loadTestApp } from "./testApp";

test("loads the map shell and core controls", async ({ page }) => {
  // Explicit viewport: the wheelchair toggle button hides under shortMode
  // (<=767.98px height), which the default Desktop Chrome viewport (720px
  // tall) falls under. This test wants the always-visible plain-desktop
  // treatment, not shortMode's compact layout.
  await page.setViewportSize({ width: 1200, height: 900 });
  await loadTestApp(page);

  await expect(page).toHaveTitle(/AccessibleMaps Mobile/);
  await expect(page.getByRole("main", { name: /accessible indoor map/i })).toBeAttached();
  await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

  await expect(
    page.getByRole("combobox", { name: /search indoor|im geb.*ude suchen/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /set view|sicht.*zentrieren/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /zoom in|hineinzoomen/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /switch to wheelchair|rollstuhl/i })).toBeVisible();
});

test("supports basic control interactions", async ({ page }) => {
  // See the identical viewport note in "loads the map shell and core controls".
  await page.setViewportSize({ width: 1200, height: 900 });
  await loadTestApp(page);
  await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

  await page.getByRole("button", { name: /switch to wheelchair|rollstuhl/i }).click();
  await expect(page.locator("#uiWrapper")).toHaveClass(/wheelchairMode/);

  await page
    .getByRole("combobox", { name: /search indoor|im geb.*ude suchen/i })
    .fill("does-not-exist");
  await page.getByRole("button", { name: /^search$|^suchen$/i }).click();
  await expect(page.getByRole("alert")).toContainText(/not found|nicht gefunden/i);
});

test("wraps the map attribution text and keeps it clear of the description area", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await loadTestApp(page);
  await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

  const attribBox = await page.locator(".maplibregl-ctrl-attrib").boundingBox();
  const descriptionBox = await page.locator(".description").boundingBox();

  expect(attribBox).not.toBeNull();
  expect(descriptionBox).not.toBeNull();

  if (attribBox && descriptionBox) {
    const noVerticalOverlap =
      attribBox.y + attribBox.height <= descriptionBox.y ||
      descriptionBox.y + descriptionBox.height <= attribBox.y;
    const noHorizontalOverlap =
      attribBox.x + attribBox.width <= descriptionBox.x ||
      descriptionBox.x + descriptionBox.width <= attribBox.x;

    expect(noVerticalOverlap || noHorizontalOverlap).toBe(true);
  }
});

test("keeps the description area reasonably wide at a moderate desktop window size", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await loadTestApp(page);
  await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

  await page.locator("#description").evaluate((el) => {
    el.textContent =
      "Ausgewählte Etage: 0 [Taktiles Pflaster vorhanden, Objekte mit taktiler Beschriftung verfügbar, Aufzüge mit Sprachausgabe vorhanden]";
  });

  const descriptionBox = await page.locator(".description").boundingBox();
  expect(descriptionBox).not.toBeNull();

  if (descriptionBox) {
    expect(descriptionBox.width).toBeGreaterThan(300);
  }
});
