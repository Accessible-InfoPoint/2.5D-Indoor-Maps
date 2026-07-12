import { expect, test } from "@playwright/test";
import { loadTestApp } from "./testApp";

test.describe("low height layout", () => {
  test("applies shortMode and lowHeightMode based on viewport height alone, independent of width", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#uiWrapper")).not.toHaveClass(/shortMode/);
    await expect(page.locator("#uiWrapper")).not.toHaveClass(/lowHeightMode/);

    await page.setViewportSize({ width: 1200, height: 700 });
    await expect(page.locator("#uiWrapper")).toHaveClass(/shortMode/);
    await expect(page.locator("#uiWrapper")).not.toHaveClass(/lowHeightMode/);

    await page.setViewportSize({ width: 1200, height: 500 });
    await expect(page.locator("#uiWrapper")).toHaveClass(/shortMode/);
    await expect(page.locator("#uiWrapper")).toHaveClass(/lowHeightMode/);

    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator("#uiWrapper")).not.toHaveClass(/shortMode/);
    await expect(page.locator("#uiWrapper")).not.toHaveClass(/lowHeightMode/);
  });

  test("keeps shortMode and lowHeightMode active at mobile width too", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 500 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#uiWrapper")).toHaveClass(/mobileMode/);
    await expect(page.locator("#uiWrapper")).toHaveClass(/shortMode/);
    await expect(page.locator("#uiWrapper")).toHaveClass(/lowHeightMode/);
  });

  test("collapses legend/profile/settings into popovers at desktop width once shortMode is active", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 700 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#uiWrapper")).toHaveClass(/shortMode/);
    await expect(page.locator("#uiWrapper")).not.toHaveClass(/mobileMode/);

    await expect(page.locator("#shortLegendTrigger")).toBeVisible();
    await expect(page.locator("#legendWrapper")).toBeHidden();

    await page.locator("#shortLegendTrigger").click();
    await expect(page.locator("#legendWrapper")).toHaveClass(/open/);

    await page.locator("#shortProfileTrigger").click();
    await expect(page.locator("#mobileProfilePanel")).toHaveClass(/open/);
    await expect(page.locator("#legendWrapper")).not.toHaveClass(/open/);
  });

  test("keeps legend/profile/settings always open at desktop width above shortMode's threshold", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#shortLegendTrigger")).toBeHidden();
    await expect(page.locator("#legendWrapper")).toBeVisible();
  });

  test("collapses the level control to a single toggle button under lowHeightMode, expands horizontally on click, and collapses again on selection", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 500 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#levelControlToggle")).toBeVisible();
    await expect(page.locator("#levelControlToggle")).toHaveText("0");
    await expect(page.locator("#mobileLevelExpandedGroup")).toBeHidden();

    await page.locator("#levelControlToggle").click();
    await expect(page.locator("#levelControlWrapper")).toHaveClass(/expanded/);
    await expect(page.locator("#mobileLevelExpandedGroup")).toBeVisible();

    const wrapperBox = await page.locator("#levelControlWrapper").boundingBox();
    expect(wrapperBox).not.toBeNull();
    if (wrapperBox) {
      expect(wrapperBox.width).toBeGreaterThan(wrapperBox.height);
    }

    await page.locator("#levelControl button", { hasText: "0" }).click();
    await expect(page.locator("#levelControlWrapper")).not.toHaveClass(/expanded/);
  });

  test("collapses the level control to a single toggle button under lowHeightMode at mobile width", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 500 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#uiWrapper")).toHaveClass(/mobileMode/);
    await expect(page.locator("#uiWrapper")).toHaveClass(/lowHeightMode/);

    await expect(page.locator("#levelControlToggle")).toBeVisible();
    await expect(page.locator("#mobileLevelExpandedGroup")).toBeHidden();
  });

  test("keeps the level control in its normal vertical form above lowHeightMode's threshold", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#levelControlToggle")).toBeHidden();
    await expect(page.locator("#mobileLevelExpandedGroup")).toBeVisible();
  });

  test("moves the description card to the top-left and hides the desktop description at desktop width under lowHeightMode", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 500 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#descriptionArea")).toBeHidden();

    const cardBox = await page.locator("#mobileDescriptionCard").boundingBox();
    expect(cardBox).not.toBeNull();
    if (cardBox) {
      expect(cardBox.y).toBeLessThan(50);
    }

    await expect(page.locator("#mobileDescriptionBody")).toBeHidden();
    await page.locator("#mobileDescriptionTrigger").click();
    await expect(page.locator("#mobileDescriptionBody")).toBeVisible();
  });

  test("anchors attribution to the bottom-left corner, matching the description card's width, at desktop width under lowHeightMode", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 500 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    const attribBox = await page.locator(".maplibregl-ctrl-attrib").boundingBox();
    const cardBox = await page.locator("#mobileDescriptionCard").boundingBox();
    expect(attribBox).not.toBeNull();
    expect(cardBox).not.toBeNull();
    if (attribBox && cardBox) {
      expect(Math.abs(attribBox.x - cardBox.x)).toBeLessThan(5);
      expect(Math.abs(attribBox.x + attribBox.width - (cardBox.x + cardBox.width))).toBeLessThan(5);
      expect(attribBox.y).toBeGreaterThan(cardBox.y + cardBox.height);
    }
  });

  test("hides the wheelchair toggle and zoom buttons by default under lowHeightMode at desktop width", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 500 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#switchWheelchairModeWrapper")).toBeHidden();
    await expect(page.locator("#zoomControlWrapper")).toBeHidden();
  });

  test("does not reposition any UI element when wheelchairMode was already set before entering lowHeightMode", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.addInitScript(() => {
      window.localStorage.setItem("wheelchairMode", "true");
    });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#uiWrapper")).toHaveClass(/wheelchairMode/);

    const searchBoxTall = await page.locator("#indoorSearchWrapper").boundingBox();
    const levelBoxTall = await page.locator("#levelControlWrapper").boundingBox();

    await page.setViewportSize({ width: 1200, height: 500 });
    await expect(page.locator("#uiWrapper")).toHaveClass(/lowHeightMode/);

    const searchBoxShort = await page.locator("#indoorSearchWrapper").boundingBox();
    const levelBoxShort = await page.locator("#levelControlWrapper").boundingBox();

    // The wheelchair-mode positioning logic (setIndoorSearchWheelchairLayout)
    // writes inline left/right styles directly onto #indoorSearchWrapper, which
    // beat any CSS selector regardless of specificity. Once lowHeightMode takes
    // over it must actively clear those inline styles (not just stop writing new
    // ones) or the search bar stays pinned to its stale wheelchair-tall position.
    const inlineLeftAfterResize = await page
      .locator("#indoorSearchWrapper")
      .evaluate((el) => (el as HTMLElement).style.left);
    const inlineRightAfterResize = await page
      .locator("#indoorSearchWrapper")
      .evaluate((el) => (el as HTMLElement).style.right);
    expect(inlineLeftAfterResize).toBe("");
    expect(inlineRightAfterResize).toBe("");

    expect(searchBoxTall).not.toBeNull();
    expect(searchBoxShort).not.toBeNull();
    expect(levelBoxTall).not.toBeNull();
    expect(levelBoxShort).not.toBeNull();
    if (searchBoxTall && searchBoxShort && levelBoxTall && levelBoxShort) {
      // wheelchairMode's own layout is horizontal-bottom for both search bar and
      // level control; lowHeightMode instead keeps level control at its normal
      // left-center X and the search bar at its normal centered X — assert the
      // wheelchair-specific horizontal offset formula is gone by checking the
      // level control stayed near the left edge rather than jumping past the
      // (now-hidden) zoom/wheelchair column wheelchairMode's formula reserves
      // room for.
      expect(levelBoxShort.x).toBeLessThan(levelBoxTall.x);
    }
  });

  test("does not collapse the search bar when resizing into mobileMode without crossing into lowHeightMode, with wheelchairMode already set", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.addInitScript(() => {
      window.localStorage.setItem("wheelchairMode", "true");
    });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#uiWrapper")).toHaveClass(/wheelchairMode/);
    await expect(page.locator("#uiWrapper")).not.toHaveClass(/mobileMode/);
    await expect(page.locator("#uiWrapper")).not.toHaveClass(/lowHeightMode/);

    // 900px stays above both the shortMode/lowHeightMode height breakpoints
    // (767.98 and 600), so only the width breakpoint into mobileMode is crossed.
    await page.setViewportSize({ width: 375, height: 900 });
    await expect(page.locator("#uiWrapper")).toHaveClass(/mobileMode/);
    await expect(page.locator("#uiWrapper")).not.toHaveClass(/lowHeightMode/);

    // Regression: setIndoorSearchWheelchairLayout used to only clear its inline
    // left/right offsets when lowHeightMode was active, not mobileMode. On a
    // width-only resize into mobile, refresh() still invoked it, and it recomputed
    // the desktop wheelchair-mode formula against elements now laid out for mobile,
    // collapsing #indoorSearchWrapper to zero width.
    const searchBox = await page.locator("#indoorSearchWrapper").boundingBox();
    expect(searchBox).not.toBeNull();
    if (searchBox) {
      expect(searchBox.width).toBeGreaterThan(100);
    }

    const inlineLeftAfterResize = await page
      .locator("#indoorSearchWrapper")
      .evaluate((el) => (el as HTMLElement).style.left);
    const inlineRightAfterResize = await page
      .locator("#indoorSearchWrapper")
      .evaluate((el) => (el as HTMLElement).style.right);
    expect(inlineLeftAfterResize).toBe("");
    expect(inlineRightAfterResize).toBe("");
  });

  test("does not collapse the search bar under shortMode-only desktop width (shortMode active, lowHeightMode not yet), with wheelchairMode already set", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 700 });
    await page.addInitScript(() => {
      window.localStorage.setItem("wheelchairMode", "true");
    });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#uiWrapper")).toHaveClass(/wheelchairMode/);
    // 700px is below the shortMode threshold (767.98) but above the
    // lowHeightMode threshold (600), so shortMode is active alone.
    await expect(page.locator("#uiWrapper")).toHaveClass(/shortMode/);
    await expect(page.locator("#uiWrapper")).not.toHaveClass(/lowHeightMode/);

    // Regression: setIndoorSearchWheelchairLayout used to only clear its inline
    // left/right offsets when lowHeightMode (or mobileMode) was active. In
    // shortMode-only desktop width, wheelchairMode's own CSS block disables
    // #quickSettingsWrapper's wheelchair-specific positioning (it switches to
    // shortMode's own position:static layout) while #levelControlWrapper stays
    // in wheelchair's row layout — a mismatch. Reading
    // quickSettingsWrapper.offsetLeft under position:static produced a
    // nonsensical computed `right` value, collapsing the search bar.
    const searchBox = await page.locator("#indoorSearchWrapper").boundingBox();
    expect(searchBox).not.toBeNull();
    if (searchBox) {
      expect(searchBox.width).toBeGreaterThan(100);
    }

    const inlineLeftAfterResize = await page
      .locator("#indoorSearchWrapper")
      .evaluate((el) => (el as HTMLElement).style.left);
    const inlineRightAfterResize = await page
      .locator("#indoorSearchWrapper")
      .evaluate((el) => (el as HTMLElement).style.right);
    expect(inlineLeftAfterResize).toBe("");
    expect(inlineRightAfterResize).toBe("");
  });

  test("clamps the legend popover so it never overflows past the search bar or description card at extreme heights", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 400 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await page.locator("#mobileLegendTrigger").click();
    await expect(page.locator("#legendWrapper")).toHaveClass(/open/);

    const clampValue = await page.evaluate(() =>
      getComputedStyle(document.getElementById("uiWrapper")!).getPropertyValue(
        "--popover-clamp-height",
      ),
    );
    expect(clampValue.trim()).not.toBe("");

    const legendBox = await page.locator("#legendWrapper").boundingBox();
    const searchBox = await page.locator("#indoorSearchWrapper").boundingBox();
    const cardBox = await page.locator("#mobileDescriptionCard").boundingBox();
    expect(legendBox).not.toBeNull();
    expect(searchBox).not.toBeNull();
    expect(cardBox).not.toBeNull();
    if (legendBox && searchBox && cardBox) {
      expect(legendBox.y).toBeGreaterThanOrEqual(searchBox.y + searchBox.height);
      expect(legendBox.y + legendBox.height).toBeLessThanOrEqual(cardBox.y);
    }
  });
});
