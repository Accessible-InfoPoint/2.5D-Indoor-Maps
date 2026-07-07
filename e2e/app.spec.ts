import { expect, test } from "@playwright/test";
import { loadTestApp } from "./testApp";

test("loads the map shell and core controls", async ({ page }) => {
  await loadTestApp(page);

  await expect(page).toHaveTitle(/AccessibleMaps Mobile/);
  await expect(page.getByRole("main", { name: /accessible indoor map/i })).toBeAttached();
  await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

  await expect(page.getByRole("combobox", { name: /search indoor|im geb.*ude suchen/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /set view|sicht.*zentrieren/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /zoom in|hineinzoomen/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /switch to wheelchair|rollstuhl/i })).toBeVisible();
});

test("supports basic control interactions", async ({ page }) => {
  await loadTestApp(page);
  await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

  await page.getByRole("button", { name: /switch to wheelchair|rollstuhl/i }).click();
  await expect(page.locator("#uiWrapper")).toHaveClass(/wheelchairMode/);

  await page.getByRole("combobox", { name: /search indoor|im geb.*ude suchen/i }).fill("does-not-exist");
  await page.getByRole("button", { name: /^search$|^suchen$/i }).click();
  await expect(page.getByRole("alert")).toContainText(/not found|nicht gefunden/i);
});
