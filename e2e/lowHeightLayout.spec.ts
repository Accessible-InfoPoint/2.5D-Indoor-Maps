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
      // The toggle is hidden while expanded (.expanded #levelControlToggle { display:
      // none }), so with this fixture's single level the row is just one button — a
      // stale vertical layout would still show up as far taller than one button.
      expect(wrapperBox.height).toBeLessThan(80);
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

  test("keeps the level control in its normal vertical form above shortMode's threshold", async ({
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

  test("keeps attribution in the top-right corner at desktop width under lowHeightMode, and puts zoom buttons bottom-left when enabled", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 500 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    const attribBox = await page.locator(".maplibregl-ctrl-attrib").boundingBox();
    const viewport = page.viewportSize();
    expect(attribBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (attribBox && viewport) {
      expect(attribBox.y).toBeLessThan(50);
      expect(attribBox.x + attribBox.width).toBeGreaterThan(viewport.width - 50);
    }

    await page.locator("#shortSettingsTrigger").click();
    await page.getByRole("button", { name: /visual settings|grafische einstellungen/i }).click();
    await page.locator("#mobileShowZoomButtons").check();
    await page.getByRole("button", { name: /^save$|^speichern$/i }).click();

    await expect(page.locator("#zoomControlWrapper")).toBeVisible();
    const zoomBox = await page.locator("#zoomControlWrapper").boundingBox();
    const zoomInBox = await page.locator("#zoomControlIn").boundingBox();
    const zoomOutBox = await page.locator("#zoomControlOut").boundingBox();
    expect(zoomBox).not.toBeNull();
    expect(zoomInBox).not.toBeNull();
    expect(zoomOutBox).not.toBeNull();
    if (zoomBox && viewport) {
      expect(zoomBox.x).toBeLessThan(150);
      expect(zoomBox.y + zoomBox.height).toBeGreaterThan(viewport.height - 100);
    }
    if (zoomInBox && zoomOutBox) {
      expect(zoomInBox.y).toBeLessThan(zoomOutBox.y);
    }
  });

  test("reserves a fixed map-padding footprint for the description card that doesn't change when its body opens", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 500 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    const cardBoxCollapsed = await page.locator("#mobileDescriptionCard").boundingBox();
    await page.locator("#mobileDescriptionTrigger").click();
    await expect(page.locator("#mobileDescriptionBody")).toBeVisible();
    const cardBoxExpanded = await page.locator("#mobileDescriptionCard").boundingBox();

    expect(cardBoxCollapsed).not.toBeNull();
    expect(cardBoxExpanded).not.toBeNull();
    if (cardBoxCollapsed && cardBoxExpanded) {
      expect(cardBoxExpanded.width).toBeCloseTo(cardBoxCollapsed.width, 0);
      expect(cardBoxExpanded.height).toBeGreaterThan(cardBoxCollapsed.height);
    }
  });

  test("clears the description card's switch2D button and doesn't overlap it, at desktop width under lowHeightMode", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 500 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    const cardBox = await page.locator("#mobileDescriptionCard").boundingBox();
    const switchBox = await page.locator("#switch2DViewWrapper").boundingBox();
    expect(cardBox).not.toBeNull();
    expect(switchBox).not.toBeNull();
    if (cardBox && switchBox) {
      expect(cardBox.x).toBeGreaterThanOrEqual(switchBox.x + switchBox.width);
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

    // setIndoorSearchWheelchairLayout writes inline left/right styles directly onto
    // #indoorSearchWrapper, which beat any CSS selector; lowHeightMode must actively
    // clear those inline styles, not just stop writing new ones.
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
      // wheelchairMode's horizontal offset formula reserves room past the (now-hidden)
      // zoom/wheelchair column; lowHeightMode instead keeps the level control at its
      // normal left-center X, so it sits left of the wheelchair-mode position.
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

  test("removes the level control's border and background once collapsed under shortMode", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 700 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    const background = await page
      .locator("#levelControlWrapper")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    const borderWidth = await page
      .locator("#levelControlWrapper")
      .evaluate((el) => getComputedStyle(el).borderTopWidth);
    expect(background).toBe("rgba(0, 0, 0, 0)");
    expect(borderWidth).toBe("0px");
  });

  test("collapses the level control at shortMode's threshold (767.98px), not just lowHeightMode's tighter 600px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 700 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#uiWrapper")).toHaveClass(/shortMode/);
    await expect(page.locator("#uiWrapper")).not.toHaveClass(/lowHeightMode/);

    await expect(page.locator("#levelControlToggle")).toBeVisible();
    await expect(page.locator("#mobileLevelExpandedGroup")).toBeHidden();
  });

  test("keeps correct level control window sizing and paging after a live resize crosses into shortMode", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);
    await expect(page.locator("#levelControlToggle")).toBeHidden();

    await page.setViewportSize({ width: 1200, height: 700 });
    await expect(page.locator("#uiWrapper")).toHaveClass(/shortMode/);
    await expect(page.locator("#levelControlToggle")).toBeVisible();

    await page.locator("#levelControlToggle").click();
    await expect(page.locator("#levelControlWrapper")).toHaveClass(/expanded/);

    const windowBox = await page.locator("#levelControlWindow").boundingBox();
    const wrapperBox = await page.locator("#levelControlWrapper").boundingBox();
    const viewport = page.viewportSize();
    expect(windowBox).not.toBeNull();
    expect(wrapperBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (windowBox && wrapperBox && viewport) {
      expect(wrapperBox.y).toBeGreaterThan(0);
      expect(wrapperBox.y + wrapperBox.height).toBeLessThan(viewport.height);
      expect(windowBox.height).toBeLessThan(80);
    }
  });

  test("mirrors switch2D, level control position, and the search bar under left-handed at desktop width shortMode", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 700 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    const switchBoxBefore = await page.locator("#switch2DViewWrapper").boundingBox();
    const levelBoxBefore = await page.locator("#levelControlWrapper").boundingBox();
    const centeringBoxBefore = await page.locator("#centeringButton").boundingBox();

    await page.locator("#shortSettingsTrigger").click();
    await page.getByRole("button", { name: /visual settings|grafische einstellungen/i }).click();
    await page.locator("#mobileHandedness_left").check();
    await page.getByRole("button", { name: /^save$|^speichern$/i }).click();

    await expect(page.locator("#uiWrapper")).toHaveClass(/leftHanded/);

    const switchBoxAfter = await page.locator("#switch2DViewWrapper").boundingBox();
    const levelBoxAfter = await page.locator("#levelControlWrapper").boundingBox();
    const centeringBoxAfter = await page.locator("#centeringButton").boundingBox();

    expect(switchBoxBefore).not.toBeNull();
    expect(switchBoxAfter).not.toBeNull();
    expect(levelBoxBefore).not.toBeNull();
    expect(levelBoxAfter).not.toBeNull();
    expect(centeringBoxBefore).not.toBeNull();
    expect(centeringBoxAfter).not.toBeNull();
    if (
      switchBoxBefore &&
      switchBoxAfter &&
      levelBoxBefore &&
      levelBoxAfter &&
      centeringBoxBefore &&
      centeringBoxAfter
    ) {
      expect(switchBoxAfter.x).toBeGreaterThan(switchBoxBefore.x);
      expect(levelBoxAfter.x).toBeGreaterThan(levelBoxBefore.x);
      expect(centeringBoxAfter.x).not.toBe(centeringBoxBefore.x);
    }
  });

  test("puts the mobile zoom buttons in the legend/profile/settings column, clear of the settings trigger", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await page.locator("#mobileSettingsTrigger").click();
    await page.getByRole("button", { name: /visual settings|grafische einstellungen/i }).click();
    await page.locator("#mobileShowZoomButtons").check();
    await page.getByRole("button", { name: /^save$|^speichern$/i }).click();

    const settingsBox = await page.locator("#mobileSettingsTrigger").boundingBox();
    const zoomBox = await page.locator("#zoomControlWrapper").boundingBox();
    const legendBox = await page.locator("#mobileLegendTrigger").boundingBox();
    expect(settingsBox).not.toBeNull();
    expect(zoomBox).not.toBeNull();
    expect(legendBox).not.toBeNull();
    if (settingsBox && zoomBox && legendBox) {
      expect(Math.abs(zoomBox.x - legendBox.x)).toBeLessThan(5);
      expect(zoomBox.y).toBeGreaterThan(settingsBox.y + settingsBox.height * 1.5);
    }
  });

  test("hides the collapsed level toggle while expanded, so the active level isn't shown twice", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 700 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#levelControlToggle")).toBeVisible();

    await page.locator("#levelControlToggle").click();
    await expect(page.locator("#levelControlWrapper")).toHaveClass(/expanded/);
    await expect(page.locator("#levelControlToggle")).toBeHidden();

    await page.locator("#levelControl button", { hasText: "0" }).click();
    await expect(page.locator("#levelControlWrapper")).not.toHaveClass(/expanded/);
    await expect(page.locator("#levelControlToggle")).toBeVisible();
  });

  test("keeps the level-shift paging icons correct after a live resize crosses into shortMode, with no explicit action taken", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#levelShiftUpLabel")).toHaveText("expand_less");
    await expect(page.locator("#levelShiftDownLabel")).toHaveText("expand_more");

    await page.setViewportSize({ width: 1200, height: 700 });
    await expect(page.locator("#uiWrapper")).toHaveClass(/shortMode/);
    await expect(page.locator("#levelShiftUpLabel")).toHaveText("chevron_left");
    await expect(page.locator("#levelShiftDownLabel")).toHaveText("navigate_next");

    await page.setViewportSize({ width: 1200, height: 900 });
    await expect(page.locator("#levelShiftUpLabel")).toHaveText("expand_less");
    await expect(page.locator("#levelShiftDownLabel")).toHaveText("expand_more");
  });

  test("hides the wheelchair toggle and keeps the search bar full width once shortMode is active, even with wheelchairMode already set", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.addInitScript(() => {
      window.localStorage.setItem("wheelchairMode", "true");
    });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);
    await expect(page.locator("#uiWrapper")).toHaveClass(/wheelchairMode/);
    await expect(page.locator("#switchWheelchairModeWrapper")).toBeVisible();

    await page.setViewportSize({ width: 1200, height: 700 });
    await expect(page.locator("#uiWrapper")).toHaveClass(/shortMode/);
    await expect(page.locator("#switchWheelchairModeWrapper")).toBeHidden();

    const searchBox = await page.locator("#indoorSearchWrapper").boundingBox();
    const viewport = page.viewportSize();
    expect(searchBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (searchBox && viewport) {
      expect(searchBox.width).toBeGreaterThan(viewport.width * 0.5);
    }
  });

  test("puts zoom buttons in the level control's column at desktop width under lowHeightMode", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 500 });
    await page.addInitScript(() => {
      window.localStorage.setItem("mobileShowZoomButtons", "true");
    });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    const levelBox = await page.locator("#levelControlWrapper").boundingBox();
    const zoomBox = await page.locator("#zoomControlWrapper").boundingBox();
    expect(levelBox).not.toBeNull();
    expect(zoomBox).not.toBeNull();
    if (levelBox && zoomBox) {
      expect(Math.abs(zoomBox.x - levelBox.x)).toBeLessThan(5);
    }
  });

  test("caps attribution at half the screen width at desktop width under lowHeightMode, so it can't cross into the description card's territory", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 500 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    const maxWidth = await page.evaluate(
      () => getComputedStyle(document.querySelector(".maplibregl-ctrl-attrib")!).maxWidth,
    );
    expect(maxWidth).toBe("600px"); // 50vw of a 1200px-wide viewport
  });

  test("gives the description card a width of calc(35% - 15px) at desktop width under lowHeightMode", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 500 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    const cardBox = await page.locator("#mobileDescriptionCard").boundingBox();
    expect(cardBox).not.toBeNull();
    if (cardBox) {
      // calc(35% - 15px) of 1200px = 405px.
      expect(cardBox.width).toBeCloseTo(405, 0);
    }
  });

  test("keeps the description card's open/closed state when a different level is selected", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 500 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await page.locator("#mobileDescriptionTrigger").click();
    await expect(page.locator("#mobileDescriptionBody")).toBeVisible();

    await page.locator("#levelControlToggle").click();
    await page.locator("#levelControl button", { hasText: "0" }).click();

    await expect(page.locator("#mobileDescriptionBody")).toBeVisible();
  });

  test("turns a popover trigger dark green with a white icon while its panel is open, at desktop width under shortMode", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 700 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    const before = await page
      .locator("#shortLegendTrigger")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(before).not.toBe("rgb(2, 85, 88)");

    await page.locator("#shortLegendTrigger").click();
    await expect(page.locator("#shortLegendTrigger")).toHaveAttribute("aria-expanded", "true");

    await expect(page.locator("#shortLegendTrigger")).toHaveCSS(
      "background-color",
      "rgb(2, 85, 88)",
    );
    await expect(page.locator("#shortLegendTrigger .material-icons")).toHaveCSS(
      "color",
      "rgb(255, 255, 255)",
    );
  });

  test("stacks zoom buttons in the level control's column with zoom-in above zoom-out, at desktop width under lowHeightMode", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 500 });
    await page.addInitScript(() => {
      window.localStorage.setItem("mobileShowZoomButtons", "true");
    });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    const levelBox = await page.locator("#levelControlWrapper").boundingBox();
    const zoomInBox = await page.locator("#zoomControlIn").boundingBox();
    const zoomOutBox = await page.locator("#zoomControlOut").boundingBox();
    expect(levelBox).not.toBeNull();
    expect(zoomInBox).not.toBeNull();
    expect(zoomOutBox).not.toBeNull();
    if (levelBox && zoomInBox && zoomOutBox) {
      expect(Math.abs(zoomInBox.x - levelBox.x)).toBeLessThan(2);
      expect(zoomInBox.y).toBeLessThan(zoomOutBox.y);
    }
  });

  test("puts the legend trigger in the same column as profile/settings, at the bottom-right corner, at desktop width under shortMode", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 700 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    const legendBox = await page.locator("#shortLegendTrigger").boundingBox();
    const profileBox = await page.locator("#shortProfileTrigger").boundingBox();
    expect(legendBox).not.toBeNull();
    expect(profileBox).not.toBeNull();
    if (legendBox && profileBox) {
      expect(Math.abs(legendBox.x - profileBox.x)).toBeLessThan(2);
    }
  });

  test("moves attribution to the opposite top corner from the description card when handedness switches, at desktop width under lowHeightMode", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 500 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator(".maplibregl-ctrl-top-right .maplibregl-ctrl-attrib")).toHaveCount(1);

    await page.locator("#shortSettingsTrigger").click();
    await page.getByRole("button", { name: /visual settings|grafische einstellungen/i }).click();
    await page.locator("#mobileHandedness_left").check();
    await page.getByRole("button", { name: /^save$|^speichern$/i }).click();

    await expect(page.locator(".maplibregl-ctrl-top-left .maplibregl-ctrl-attrib")).toHaveCount(1);
  });

  test("shows the search results dropdown with mobile's dark backdrop and above every other UI element, at desktop width under shortMode", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 700 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await page.locator("#indoorSearchInput").fill("room");
    await expect(page.locator("#searchSuggestionsList")).toHaveClass(/visible/);
    await expect(page.locator("#searchOverlayBackdrop")).toBeVisible();

    const backdropZ = await page
      .locator("#searchOverlayBackdrop")
      .evaluate((el) => Number(getComputedStyle(el).zIndex));
    const listZ = await page
      .locator("#searchSuggestionsList")
      .evaluate((el) => Number(getComputedStyle(el).zIndex));
    const legendTriggerZ = await page
      .locator("#shortLegendTrigger")
      .evaluate((el) => Number(getComputedStyle(el).zIndex));

    expect(listZ).toBeGreaterThan(backdropZ);
    expect(backdropZ).toBeGreaterThan(legendTriggerZ);
  });

  test("moves attribution with handedness under shortMode alone, not just lowHeightMode", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 700 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);
    await expect(page.locator("#uiWrapper")).toHaveClass(/shortMode/);
    await expect(page.locator("#uiWrapper")).not.toHaveClass(/lowHeightMode/);

    const attribBoxRightHanded = await page.locator(".maplibregl-ctrl-attrib").boundingBox();
    const viewport = page.viewportSize();
    expect(attribBoxRightHanded).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (attribBoxRightHanded && viewport) {
      expect(attribBoxRightHanded.x).toBeGreaterThan(viewport.width / 2);
    }

    await page.locator("#shortSettingsTrigger").click();
    await page.getByRole("button", { name: /visual settings|grafische einstellungen/i }).click();
    await page.locator("#mobileHandedness_left").check();
    await page.getByRole("button", { name: /^save$|^speichern$/i }).click();

    const attribBoxLeftHanded = await page.locator(".maplibregl-ctrl-attrib").boundingBox();
    expect(attribBoxLeftHanded).not.toBeNull();
    if (attribBoxLeftHanded && viewport) {
      expect(attribBoxLeftHanded.x).toBeLessThan(viewport.width / 2);
    }
  });

  test("shows a dark backdrop when the level control expands, and closing it is mutually exclusive with the search overlay", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 500 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await expect(page.locator("#levelControlBackdrop")).toBeHidden();
    await page.locator("#levelControlToggle").click();
    await expect(page.locator("#levelControlWrapper")).toHaveClass(/expanded/);
    await expect(page.locator("#levelControlBackdrop")).toBeVisible();

    await page.locator("#indoorSearchInput").fill("room");
    await expect(page.locator("#searchSuggestionsList")).toHaveClass(/visible/);
    await expect(page.locator("#levelControlWrapper")).not.toHaveClass(/expanded/);
    await expect(page.locator("#levelControlBackdrop")).toBeHidden();
  });

  test("centers the legend popover in the free vertical gap when its default position would collide", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 500 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await page.locator("#shortLegendTrigger").click();
    await expect(page.locator("#legendWrapper")).toHaveClass(/open/);

    const legendBox = await page.locator("#legendWrapper").boundingBox();
    const searchBox = await page.locator("#indoorSearchWrapper").boundingBox();
    const descriptionBox = await page.locator("#mobileDescriptionCard").boundingBox();
    expect(legendBox).not.toBeNull();
    expect(searchBox).not.toBeNull();
    expect(descriptionBox).not.toBeNull();
    if (legendBox && searchBox && descriptionBox) {
      // Must not overlap the search bar or description card, whether centered or
      // left at its default position.
      expect(legendBox.y + legendBox.height).toBeLessThanOrEqual(searchBox.y + 1);
      expect(legendBox.y).toBeGreaterThanOrEqual(descriptionBox.y + descriptionBox.height - 1);
    }
  });

  test("clamps the description card's max-height to stay clear of the level control", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 500 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);

    await page.locator("#mobileDescriptionTrigger").click();
    await expect(page.locator("#mobileDescriptionBody")).toHaveClass(/open/);

    const bodyBox = await page.locator("#mobileDescriptionBody").boundingBox();
    const levelControlBox = await page.locator("#levelControlWrapper").boundingBox();
    expect(bodyBox).not.toBeNull();
    expect(levelControlBox).not.toBeNull();
    if (bodyBox && levelControlBox) {
      expect(bodyBox.y + bodyBox.height).toBeLessThanOrEqual(levelControlBox.y + 1);
    }
  });

  test("opens the legend in the same position as the profile/settings popovers in landscape mode", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 700 });
    await loadTestApp(page);
    await expect(page.locator("#loadingIndicatorWrapper")).toHaveClass(/d-none/);
    await expect(page.locator("#uiWrapper")).toHaveClass(/shortMode/);
    await expect(page.locator("#uiWrapper")).not.toHaveClass(/mobileMode/);

    await page.locator("#shortProfileTrigger").click();
    const profileBox = await page.locator("#mobileProfilePanel").boundingBox();
    await page.locator("#shortProfileTrigger").click();

    await page.locator("#shortLegendTrigger").click();
    await expect(page.locator("#legendWrapper")).toHaveClass(/open/);
    const legendBox = await page.locator("#legendWrapper").boundingBox();

    expect(profileBox).not.toBeNull();
    expect(legendBox).not.toBeNull();
    if (profileBox && legendBox) {
      expect(legendBox.x).toBeCloseTo(profileBox.x, 0);
      expect(legendBox.y).toBeCloseTo(profileBox.y, 0);
    }
  });
});
