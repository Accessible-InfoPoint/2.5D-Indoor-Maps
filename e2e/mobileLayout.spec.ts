import { expect, test } from "@playwright/test";
import { loadTestApp } from "./testApp";

test.describe("mobile layout", () => {
  test("applies mobileMode below the breakpoint and removes it above", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#uiWrapper")).not.toHaveClass(/mobileMode/);

    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator("#uiWrapper")).toHaveClass(/mobileMode/);

    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator("#uiWrapper")).not.toHaveClass(/mobileMode/);
  });

  test("keeps the wheelchair profile reachable via the profile popover on mobile, and hides the desktop toggle", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#switchWheelchairModeWrapper")).toBeHidden();

    await page.locator("#mobileProfileTrigger").click();
    await page.getByRole("button", { name: /wheelchair|rollstuhl/i }).click();

    await expect(page.locator("#uiWrapper")).toHaveClass(/mobileMode/);

    await page.locator("#mobileSettingsTrigger").click();
    await page.getByRole("button", { name: /visual settings|grafische einstellungen/i }).click();
    await page.locator("#mobileHandedness_left").check();
    await page.getByRole("button", { name: /^save$|^speichern$/i }).click();

    await expect(page.locator("#switchWheelchairModeWrapper")).toBeHidden();
  });

  test("moves the search bar to the top and the locate button to the bottom", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    const searchBox = await page.locator("#indoorSearchWrapper").boundingBox();
    const locateBox = await page.locator("#centeringButton").boundingBox();
    const viewport = page.viewportSize();

    expect(searchBox).not.toBeNull();
    expect(locateBox).not.toBeNull();
    expect(viewport).not.toBeNull();

    if (searchBox && locateBox && viewport) {
      expect(searchBox.y).toBeLessThan(80);
      expect(locateBox.y).toBeGreaterThan(viewport.height / 2);
    }
  });

  test("shows the level control without moving the 2.5D switch", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    const switchBoxBefore = await page.locator("#switch2DViewWrapper").boundingBox();

    await expect(page.locator("#levelControlWindow")).toBeVisible();

    const switchBoxAfter = await page.locator("#switch2DViewWrapper").boundingBox();

    expect(switchBoxAfter?.y).toBe(switchBoxBefore?.y);
  });

  test("opens legend, profile, and settings independently and closes the others", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await page.locator("#mobileLegendTrigger").click();
    await expect(page.locator("#legendWrapper")).toHaveClass(/open/);

    await page.locator("#mobileProfileTrigger").click();
    await expect(page.locator("#mobileProfilePanel")).toHaveClass(/open/);
    await expect(page.locator("#legendWrapper")).not.toHaveClass(/open/);

    await page.locator("#mobileSettingsTrigger").click();
    await expect(page.locator("#mobileSettingsPanel")).toHaveClass(/open/);
    await expect(page.locator("#mobileProfilePanel")).not.toHaveClass(/open/);
  });

  test("hides zoom buttons by default and shows them once enabled in settings", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#zoomControlWrapper")).toBeHidden();

    await page.locator("#mobileSettingsTrigger").click();
    await page.getByRole("button", { name: /visual settings|grafische einstellungen/i }).click();
    await page.locator("#mobileShowZoomButtons").check();
    await page.getByRole("button", { name: /^save$|^speichern$/i }).click();

    await expect(page.locator("#zoomControlWrapper")).toBeVisible();
  });

  test("stacks the zoom buttons directly below the level control, full width, plus above minus", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await page.locator("#mobileSettingsTrigger").click();
    await page.getByRole("button", { name: /visual settings|grafische einstellungen/i }).click();
    await page.locator("#mobileShowZoomButtons").check();
    await page.getByRole("button", { name: /^save$|^speichern$/i }).click();
    await expect(page.locator("#zoomControlWrapper")).toBeVisible();

    const levelBox = await page.locator("#levelControlWrapper").boundingBox();
    const zoomInBox = await page.locator("#zoomControlIn").boundingBox();
    const zoomOutBox = await page.locator("#zoomControlOut").boundingBox();
    expect(levelBox).not.toBeNull();
    expect(zoomInBox).not.toBeNull();
    expect(zoomOutBox).not.toBeNull();
    if (levelBox && zoomInBox && zoomOutBox) {
      // Directly below the level control, same column, one level-button's width.
      expect(zoomInBox.x).toBe(levelBox.x);
      expect(zoomInBox.width).toBe(levelBox.width);
      expect(zoomInBox.y).toBeGreaterThanOrEqual(levelBox.y + levelBox.height);
      // Close (not a leftover fixed-position gap) — same rhythm as the level buttons' own gap.
      expect(zoomInBox.y - (levelBox.y + levelBox.height)).toBeLessThan(20);
      // Plus (zoom in) above minus (zoom out).
      expect(zoomInBox.y).toBeLessThan(zoomOutBox.y);
    }

    // A real click proves nothing else in the stack intercepts the tap.
    await page.locator("#zoomControlIn").click();
  });

  test("mirrors the layout to the left when left-handed is selected", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    const beforeBox = await page.locator("#switch2DViewWrapper").boundingBox();

    await page.locator("#mobileSettingsTrigger").click();
    await page.getByRole("button", { name: /visual settings|grafische einstellungen/i }).click();
    await page.locator("#mobileHandedness_left").check();
    await page.getByRole("button", { name: /^save$|^speichern$/i }).click();

    const afterBox = await page.locator("#switch2DViewWrapper").boundingBox();
    const viewport = page.viewportSize();

    expect(beforeBox).not.toBeNull();
    expect(afterBox).not.toBeNull();
    expect(viewport).not.toBeNull();

    if (beforeBox && afterBox && viewport) {
      expect(beforeBox.x).toBeGreaterThan(viewport.width / 2);
      expect(afterBox.x).toBeLessThan(viewport.width / 2);
    }
  });

  test("shows zoom buttons on the left side when left-handed and zoom buttons are both enabled", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await page.locator("#mobileSettingsTrigger").click();
    await page.getByRole("button", { name: /visual settings|grafische einstellungen/i }).click();
    await page.locator("#mobileHandedness_left").check();
    await page.locator("#mobileShowZoomButtons").check();
    await page.getByRole("button", { name: /^save$|^speichern$/i }).click();

    await expect(page.locator("#zoomControlWrapper")).toBeVisible();

    const zoomBox = await page.locator("#zoomControlWrapper").boundingBox();
    const viewport = page.viewportSize();

    expect(zoomBox).not.toBeNull();
    expect(viewport).not.toBeNull();

    if (zoomBox && viewport) {
      expect(zoomBox.x).toBeLessThan(viewport.width / 2);
    }
  });

  test("places attribution in the non-handed bottom corner on mobile, top-right on desktop", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);
    await expect(page.locator(".maplibregl-ctrl-top-right .maplibregl-ctrl-attrib")).toHaveCount(1);

    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator(".maplibregl-ctrl-bottom-left .maplibregl-ctrl-attrib")).toHaveCount(
      1,
    );

    await page.locator("#mobileSettingsTrigger").click();
    await page.getByRole("button", { name: /visual settings|grafische einstellungen/i }).click();
    await page.locator("#mobileHandedness_left").check();
    await page.getByRole("button", { name: /^save$|^speichern$/i }).click();

    await expect(page.locator(".maplibregl-ctrl-bottom-right .maplibregl-ctrl-attrib")).toHaveCount(
      1,
    );
  });

  test("keeps mobile-only trigger buttons hidden at desktop width", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#uiWrapper")).not.toHaveClass(/mobileMode/);
    await expect(page.locator("#mobileLegendTrigger")).toBeHidden();
    await expect(page.locator("#mobileProfileTrigger")).toBeHidden();
    await expect(page.locator("#mobileSettingsTrigger")).toBeHidden();
  });

  test("reverses the search input group order in left-handed mode", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    const submitBoxBefore = await page.locator("#indoorSearchSubmit").boundingBox();
    const inputBoxBefore = await page.locator("#indoorSearchInput").boundingBox();
    expect(submitBoxBefore).not.toBeNull();
    expect(inputBoxBefore).not.toBeNull();
    if (submitBoxBefore && inputBoxBefore) {
      expect(submitBoxBefore.x).toBeGreaterThan(inputBoxBefore.x);
    }

    await page.locator("#mobileSettingsTrigger").click();
    await page.getByRole("button", { name: /visual settings|grafische einstellungen/i }).click();
    await page.locator("#mobileHandedness_left").check();
    await page.getByRole("button", { name: /^save$|^speichern$/i }).click();

    const submitBoxAfter = await page.locator("#indoorSearchSubmit").boundingBox();
    const inputBoxAfter = await page.locator("#indoorSearchInput").boundingBox();
    expect(submitBoxAfter).not.toBeNull();
    expect(inputBoxAfter).not.toBeNull();
    if (submitBoxAfter && inputBoxAfter) {
      expect(submitBoxAfter.x).toBeLessThan(inputBoxAfter.x);
    }

    // Bootstrap's input-group corner rounding is DOM-order-based (first-child/
    // last-child), so it must be explicitly flipped to follow the reversed visual
    // order above — otherwise the now-leftmost submit button keeps its old flat
    // outer-left/rounded inner-right corners instead of the reverse.
    const submitRadius = await page
      .locator("#indoorSearchSubmit")
      .evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
    const inputRadius = await page
      .locator("#indoorSearchInput")
      .evaluate((el) => getComputedStyle(el).borderTopRightRadius);
    expect(submitRadius).not.toBe("0px");
    expect(inputRadius).not.toBe("0px");
  });

  test("shows search suggestions in an overlay with a full-screen backdrop on mobile, sized to its results", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await page.locator("#indoorSearchInput").fill("room");
    await expect(page.locator("#searchSuggestionsList")).toHaveClass(/visible/);
    await expect(page.locator("#searchOverlayBackdrop")).toBeVisible();

    // The backdrop (which taps dismiss against) is full-screen; the results list
    // itself sizes to its content instead, so a short result set doesn't leave a
    // big empty white panel below it.
    const backdropBox = await page.locator("#searchOverlayBackdrop").boundingBox();
    const suggestionsBox = await page.locator("#searchSuggestionsList").boundingBox();
    const viewport = page.viewportSize();
    expect(backdropBox).not.toBeNull();
    expect(suggestionsBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (backdropBox && suggestionsBox && viewport) {
      expect(backdropBox.height).toBeGreaterThan(viewport.height / 2);
      expect(suggestionsBox.height).toBeLessThan(viewport.height / 2);
    }

    await page.locator("#searchOverlayBackdrop").click();
    await expect(page.locator("#searchSuggestionsList")).not.toHaveClass(/visible/);
    await expect(page.locator("#searchOverlayBackdrop")).toBeHidden();
  });

  test("fits the whole building in the viewport when centering, even on a narrow screen", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 480 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    // wait for the initial center animation to finish
    await page.waitForTimeout(1000);

    const mapBox = await page.locator("#map").boundingBox();

    // Building bbox from testApp.ts's mocked data: [13.7227, 51.0253, 13.723, 51.0256]
    const projectedCorners = await page.evaluate(() => {
      const map = (window as unknown as { __testMap?: maplibregl.Map }).__testMap;
      if (!map) return null;
      const sw = map.project([13.7227, 51.0253]);
      const ne = map.project([13.723, 51.0256]);
      return { sw: { x: sw.x, y: sw.y }, ne: { x: ne.x, y: ne.y } };
    });

    expect(mapBox).not.toBeNull();
    expect(projectedCorners).not.toBeNull();
    if (mapBox && projectedCorners) {
      const minX = Math.min(projectedCorners.sw.x, projectedCorners.ne.x);
      const maxX = Math.max(projectedCorners.sw.x, projectedCorners.ne.x);
      const minY = Math.min(projectedCorners.sw.y, projectedCorners.ne.y);
      const maxY = Math.max(projectedCorners.sw.y, projectedCorners.ne.y);

      expect(minX).toBeGreaterThanOrEqual(0);
      expect(maxX).toBeLessThanOrEqual(mapBox.width);
      expect(minY).toBeGreaterThanOrEqual(0);
      expect(maxY).toBeLessThanOrEqual(mapBox.height);
    }
  });

  test("shows the full level list on mobile without a separate collapsed pill", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#mobileLevelPill")).toHaveCount(0);
    await expect(page.locator("#levelControlWindow")).toBeVisible();
    await expect(page.locator("#levelControl .active")).toBeVisible();
  });

  test("shows a collapsible mobile description card with a condensed body", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#mobileDescriptionTitle")).toContainText("Andreas-Pfitzmann-Bau");
    await expect(page.locator("#mobileDescriptionBody")).toBeHidden();

    await page.locator("#mobileDescriptionTrigger").click();
    await expect(page.locator("#mobileDescriptionBody")).toBeVisible();
    await expect(page.locator("#mobileDescriptionBody")).not.toContainText("Ausgewählte Etage");
  });

  test("hides the desktop description element on mobile, showing only the mobile description card", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator(".description")).toBeHidden();
    await expect(page.locator("#mobileDescriptionCard")).toBeVisible();
  });

  test("keeps the search bar undimmed and puts persistent buttons behind the search overlay", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await page.locator("#indoorSearchInput").fill("room");
    await expect(page.locator("#searchSuggestionsList")).toHaveClass(/visible/);

    // The search bar row itself must render above its own backdrop, not be dimmed by it.
    const searchBarZ = await page
      .locator("#indoorSearchBar")
      .evaluate((el) => parseInt(getComputedStyle(el).zIndex, 10) || 0);
    const backdropZ = await page
      .locator("#searchOverlayBackdrop")
      .evaluate((el) => parseInt(getComputedStyle(el).zIndex, 10) || 0);
    expect(searchBarZ).toBeGreaterThan(backdropZ);

    // Persistent buttons (switch2D, level control) must render behind the search overlay
    // as a whole, not just behind its internal backdrop/list in isolation.
    const switch2DBox = await page.locator("#switch2DViewWrapper").boundingBox();
    const suggestionsBox = await page.locator("#searchSuggestionsList").boundingBox();
    expect(switch2DBox).not.toBeNull();
    expect(suggestionsBox).not.toBeNull();

    if (switch2DBox && suggestionsBox) {
      // If switch2D's box overlaps the suggestions box in screen space, it must be
      // stacked BELOW it (a lower effective z-index at the #uiWrapper level).
      const overlaps =
        switch2DBox.x < suggestionsBox.x + suggestionsBox.width &&
        switch2DBox.x + switch2DBox.width > suggestionsBox.x &&
        switch2DBox.y < suggestionsBox.y + suggestionsBox.height &&
        switch2DBox.y + switch2DBox.height > suggestionsBox.y;
      expect(overlaps).toBe(true); // sanity check: they DO occupy overlapping space today

      const searchWrapperZ = await page
        .locator("#indoorSearchWrapper")
        .evaluate((el) => parseInt(getComputedStyle(el).zIndex, 10) || 0);
      const switch2DZ = await page
        .locator("#switch2DViewWrapper")
        .evaluate((el) => parseInt(getComputedStyle(el).zIndex, 10) || 0);
      expect(searchWrapperZ).toBeGreaterThan(switch2DZ);
    }
  });

  test("auto-dismisses the search error banner after a delay", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await page.getByRole("button", { name: /^search$|^suchen$/i }).click();
    await expect(page.locator("#searchErrorMessage")).toHaveClass(/visible/);

    await page.waitForTimeout(5500);
    await expect(page.locator("#searchErrorMessage")).not.toHaveClass(/visible/);
  });

  test("keeps the search error banner clear of the left/right button columns on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await page.getByRole("button", { name: /^search$|^suchen$/i }).click();
    await expect(page.locator("#searchErrorMessage")).toHaveClass(/visible/);

    const errorBox = await page.locator("#searchErrorMessage").boundingBox();
    const legendBox = await page.locator("#mobileLegendTrigger").boundingBox();
    const switch2DBox = await page.locator("#switch2DViewWrapper").boundingBox();

    expect(errorBox).not.toBeNull();
    expect(legendBox).not.toBeNull();
    expect(switch2DBox).not.toBeNull();

    if (errorBox && legendBox && switch2DBox) {
      expect(errorBox.x).toBeGreaterThanOrEqual(legendBox.x + legendBox.width);
      expect(errorBox.x + errorBox.width).toBeLessThanOrEqual(switch2DBox.x);
    }
  });

  test("keeps the map attribution toggle icon fixed in place when expanding/collapsing, and clickable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    // The mobile description card and the attribution control both live near the
    // bottom of the screen; they must never overlap, or clicks meant for one land
    // on the other instead.
    const attribBox = await page.locator(".maplibregl-ctrl-attrib").boundingBox();
    const cardBox = await page.locator("#mobileDescriptionCard").boundingBox();
    expect(attribBox).not.toBeNull();
    expect(cardBox).not.toBeNull();
    if (attribBox && cardBox) {
      expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(attribBox.y);
    }

    const attribToggle = page.locator(".maplibregl-ctrl-attrib-button");
    const boxBefore = await attribToggle.boundingBox();

    // A real click (not force:true) proves nothing else intercepts the tap.
    await attribToggle.click();
    await expect(page.locator(".maplibregl-ctrl-attrib")).not.toHaveClass(/maplibregl-compact-show/);

    const boxAfter = await attribToggle.boundingBox();
    expect(boxBefore).not.toBeNull();
    expect(boxAfter).not.toBeNull();
    if (boxBefore && boxAfter) {
      expect(boxAfter.x).toBe(boxBefore.x);
      expect(boxAfter.y).toBe(boxBefore.y);
    }
  });

  test("keeps the map attribution toggle icon fixed in place in left-handed mode too", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await page.locator("#mobileSettingsTrigger").click();
    await page.getByRole("button", { name: /visual settings|grafische einstellungen/i }).click();
    await page.locator("#mobileHandedness_left").check();
    await page.getByRole("button", { name: /^save$|^speichern$/i }).click();

    const attribToggle = page.locator(".maplibregl-ctrl-attrib-button");
    const boxBefore = await attribToggle.boundingBox();

    await attribToggle.click();
    await expect(page.locator(".maplibregl-ctrl-attrib")).not.toHaveClass(/maplibregl-compact-show/);

    const boxAfter = await attribToggle.boundingBox();
    expect(boxBefore).not.toBeNull();
    expect(boxAfter).not.toBeNull();
    if (boxBefore && boxAfter) {
      expect(boxAfter.x).toBe(boxBefore.x);
      expect(boxAfter.y).toBe(boxBefore.y);
    }
  });

  test("widens the map attribution to reach the centering button on mobile, in both handedness modes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    // On mobile .description is hidden, so attribution no longer needs to share
    // horizontal space with it — it should stretch out close to the centering
    // button on the opposite corner, not stay capped at the desktop-oriented
    // width meant to protect .description's readability.
    const attribBox = await page.locator(".maplibregl-ctrl-attrib").boundingBox();
    const centeringBox = await page.locator("#centeringButton").boundingBox();
    expect(attribBox).not.toBeNull();
    expect(centeringBox).not.toBeNull();
    if (attribBox && centeringBox) {
      expect(attribBox.width).toBeGreaterThan(250);
      expect(attribBox.x + attribBox.width).toBeLessThanOrEqual(centeringBox.x);
      expect(centeringBox.x - (attribBox.x + attribBox.width)).toBeLessThan(30);
    }

    await page.locator("#mobileSettingsTrigger").click();
    await page.getByRole("button", { name: /visual settings|grafische einstellungen/i }).click();
    await page.locator("#mobileHandedness_left").check();
    await page.getByRole("button", { name: /^save$|^speichern$/i }).click();

    const attribBoxLeftHanded = await page.locator(".maplibregl-ctrl-attrib").boundingBox();
    const centeringBoxLeftHanded = await page.locator("#centeringButton").boundingBox();
    expect(attribBoxLeftHanded).not.toBeNull();
    expect(centeringBoxLeftHanded).not.toBeNull();
    if (attribBoxLeftHanded && centeringBoxLeftHanded) {
      expect(attribBoxLeftHanded.width).toBeGreaterThan(250);
      expect(centeringBoxLeftHanded.x + centeringBoxLeftHanded.width).toBeLessThanOrEqual(
        attribBoxLeftHanded.x,
      );
      expect(
        attribBoxLeftHanded.x - (centeringBoxLeftHanded.x + centeringBoxLeftHanded.width),
      ).toBeLessThan(30);
    }
  });

  test("keeps the mobile description card close to the bottom row instead of leaving a wide gap", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    const cardBox = await page.locator("#mobileDescriptionCard").boundingBox();
    const attribBox = await page.locator(".maplibregl-ctrl-attrib").boundingBox();
    expect(cardBox).not.toBeNull();
    expect(attribBox).not.toBeNull();
    if (cardBox && attribBox) {
      // Must still clear attribution (no overlap)...
      expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(attribBox.y);
      // ...but shouldn't reserve so much clearance that a big empty gap opens up
      // between the card and the row below it (the old $mapAttributionHeight-based
      // reservation left ~85px here; a tight mobile-specific ceiling should leave well
      // under half of that).
      expect(attribBox.y - (cardBox.y + cardBox.height)).toBeLessThan(50);
    }
  });
});
