import { expect, test } from "@playwright/test";
import { loadTestApp } from "./testApp";

test("loads the map shell and core controls", async ({ page }) => {
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

  // .description sizes to its content (width: max-content) up to its max-width cap,
  // so a short mock title never actually reaches the cap either way — that made an
  // earlier version of this test pass/fail independent of the cap's real value. Force
  // in realistically long content (matching what the real level/accessibility text
  // looks like, per the reported bug) so the box's rendered width actually reflects
  // whether the cap is generous enough, not just how short the test fixture's text is.
  await page.locator("#description").evaluate((el) => {
    el.textContent =
      "Ausgewählte Etage: 0 [Taktiles Pflaster vorhanden, Objekte mit taktiler Beschriftung verfügbar, Aufzüge mit Sprachausgabe vorhanden]";
  });

  const descriptionBox = await page.locator(".description").boundingBox();
  expect(descriptionBox).not.toBeNull();

  if (descriptionBox) {
    // Not a pixel-exact target — just enough to catch the box being squeezed down to
    // a near-unreadable single-word column, which is what the old formula did at this
    // width (2 * 420px reserved 840px out of 900px total, leaving ~0px of max-width).
    expect(descriptionBox.width).toBeGreaterThan(300);
  }
});
