import type { GeoMap } from "../geoMap";
import type { AttributionCorner, AttributionOffset } from "../map/mapView";
import {
  MOBILE_MEDIA_QUERY,
  isMobileWidth,
  SHORT_MEDIA_QUERY,
  isShortHeight,
  LOW_HEIGHT_MEDIA_QUERY,
  isLowHeight,
} from "../../utils/breakpoints";
import MobileLayoutService from "../../services/mobileLayoutService";
import WheelchairModeControl from "./wheelchairModeControl";
import LevelControl from "./levelControl";
import { getRequiredElement } from "../../utils/domHelpers";
import { setupPopover, closeAllPopovers } from "./mobilePopover";
import PopoverClampControl from "./popoverClampControl";

const LEVEL_CONTROL_GAP_FALLBACK_PX = 10;

let widthMediaQueryList: MediaQueryList | undefined;
let shortMediaQueryList: MediaQueryList | undefined;
let lowHeightMediaQueryList: MediaQueryList | undefined;
let popoversRegistered = false;
let descriptionCardObserverSetup = false;
let attributionUpdateFrame: number | undefined;

function applyStoredLayout(): void {
  const uiWrapper = getRequiredElement("uiWrapper");

  uiWrapper.classList.toggle("mobileMode", matchesMobileViewport());
  uiWrapper.classList.toggle("shortMode", matchesShortViewport());
  uiWrapper.classList.toggle("lowHeightMode", matchesLowHeightViewport());
  uiWrapper.classList.toggle("leftHanded", MobileLayoutService.getHandedness() === "left");
  uiWrapper.classList.toggle("mobileZoomVisible", MobileLayoutService.getShowZoomButtons());
}

function setup(geoMap: GeoMap): void {
  registerPopovers();
  setupDescriptionCardObserver(geoMap);
  PopoverClampControl.setup();
  refresh(geoMap);

  const handleChange = () => {
    closeAllPopovers();
    refresh(geoMap);
  };

  if (typeof window.matchMedia === "function") {
    widthMediaQueryList = window.matchMedia(MOBILE_MEDIA_QUERY);
    widthMediaQueryList.addEventListener("change", handleChange);
    shortMediaQueryList = window.matchMedia(SHORT_MEDIA_QUERY);
    shortMediaQueryList.addEventListener("change", handleChange);
    lowHeightMediaQueryList = window.matchMedia(LOW_HEIGHT_MEDIA_QUERY);
    lowHeightMediaQueryList.addEventListener("change", handleChange);
  } else {
    window.addEventListener("resize", handleChange);
  }
}

function refresh(geoMap: GeoMap): void {
  applyStoredLayout();
  WheelchairModeControl.refreshIndoorSearchWheelchairLayout();
  // Window sizing and margin axis depend on the current mode (see
  // isHorizontalLevelLayout in levelControl.ts) but are otherwise only
  // recomputed on explicit user actions, so a resize crossing a breakpoint
  // needs this recompute too, or the window keeps a stale axis.
  LevelControl.setWindow();
  LevelControl.setMargin();
  geoMap.setAttributionCorner(getAttributionCorner());
  updateAttributionOffset(geoMap);
  updateDescriptionCardMapPadding(geoMap);
  updateDescriptionMaxHeight();
  PopoverClampControl.update();
}

function registerPopovers(): void {
  if (popoversRegistered) return;
  popoversRegistered = true;

  setupPopover({
    triggerId: ["mobileLegendTrigger", "shortLegendTrigger"],
    panelId: "legendWrapper",
  });
  setupPopover({
    triggerId: ["mobileProfileTrigger", "shortProfileTrigger"],
    panelId: "mobileProfilePanel",
  });
  setupPopover({
    triggerId: ["mobileSettingsTrigger", "shortSettingsTrigger"],
    panelId: "mobileSettingsPanel",
  });
  setupPopover({
    triggerId: "mobileDescriptionTrigger",
    panelId: "mobileDescriptionBody",
    closeOnOutsideClick: false,
  });
}

function getAttributionCorner(): AttributionCorner {
  if (matchesMobileViewport()) {
    return MobileLayoutService.getHandedness() === "left" ? "bottom-right" : "bottom-left";
  }

  // At desktop width, attribution moves off its default top-right corner
  // once shortMode moves #switch2DViewWrapper to the opposite side for
  // left-handed users (or lowHeightMode's description card claims a top
  // corner) — it takes the opposite top corner from whichever UI occupies
  // the handed side. matchesShortViewport() also covers lowHeightMode since
  // its height threshold is strictly tighter (see breakpoints.ts), so the
  // two classes are never applied one without the other in that direction.
  if (matchesShortViewport()) {
    return MobileLayoutService.getHandedness() === "left" ? "top-left" : "top-right";
  }

  return "top-right";
}

function matchesMobileViewport(): boolean {
  return widthMediaQueryList ? widthMediaQueryList.matches : isMobileWidth(window.innerWidth);
}

function matchesShortViewport(): boolean {
  return shortMediaQueryList ? shortMediaQueryList.matches : isShortHeight(window.innerHeight);
}

function matchesLowHeightViewport(): boolean {
  return lowHeightMediaQueryList
    ? lowHeightMediaQueryList.matches
    : isLowHeight(window.innerHeight);
}

// #mobileDescriptionCard lives inside #uiWrapper but the attribution control it
// must stay clear of lives inside #map, a DOM sibling, so no CSS selector can
// condition attribution's position on the card's live size — track the card's
// box directly and push pixel offsets through the MapView interface instead.
function setupDescriptionCardObserver(geoMap: GeoMap): void {
  if (descriptionCardObserverSetup) return;
  descriptionCardObserverSetup = true;

  window.addEventListener("resize", () => requestAttributionOffsetUpdate(geoMap));
  // Keyed to window.innerWidth (via updateDescriptionCardMapPadding), not the
  // ResizeObserver below — that also fires when the card's own content
  // changes (e.g. expanding its body), but the reserved map-padding
  // footprint must stay fixed through that, only changing on viewport resize.
  window.addEventListener("resize", () => updateDescriptionCardMapPadding(geoMap));
  window.addEventListener("resize", updateDescriptionMaxHeight);

  if (typeof ResizeObserver === "undefined") {
    return;
  }

  const observer = new ResizeObserver(() => {
    requestAttributionOffsetUpdate(geoMap);
    updateDescriptionMaxHeight();
  });
  observer.observe(getRequiredElement("mobileDescriptionCard"));
  observer.observe(getRequiredElement("levelControlWrapper"));
}

function requestAttributionOffsetUpdate(geoMap: GeoMap): void {
  if (attributionUpdateFrame !== undefined) {
    cancelAnimationFrame(attributionUpdateFrame);
  }

  attributionUpdateFrame = requestAnimationFrame(() => {
    attributionUpdateFrame = undefined;
    updateAttributionOffset(geoMap);
  });
}

function updateAttributionOffset(geoMap: GeoMap): void {
  if (!matchesMobileViewport()) {
    geoMap.setAttributionOffset(null);
    return;
  }

  const rect = getRequiredElement("mobileDescriptionCard").getBoundingClientRect();
  const gap = getLevelControlGap();

  const offset: AttributionOffset = {
    left: rect.left,
    right: window.innerWidth - rect.right,
    bottom: window.innerHeight - rect.top + gap,
  };

  geoMap.setAttributionOffset(offset);
}

// The description card's reserved footprint is based on the viewport width
// alone, not the card's own live rendered size — the card's CSS gives it a
// fixed width in this mode so opening/closing its body never shifts the
// map's center. The visible map content centers itself within whatever's
// NOT reserved by this padding, so this ratio trades off how far the
// effective center sits from true screen-middle against how much room the
// card gets clear of the map.
const DESCRIPTION_CARD_WIDTH_RATIO = 0.15;

function updateDescriptionCardMapPadding(geoMap: GeoMap): void {
  if (!matchesLowHeightViewport() || matchesMobileViewport()) {
    geoMap.setDescriptionCardPadding({ top: 0, right: 0, bottom: 0, left: 0 });
    return;
  }

  const reservedWidth = window.innerWidth * DESCRIPTION_CARD_WIDTH_RATIO;
  geoMap.setDescriptionCardPadding(
    MobileLayoutService.getHandedness() === "left"
      ? { top: 0, right: reservedWidth, bottom: 0, left: 0 }
      : { top: 0, right: 0, bottom: 0, left: reservedWidth },
  );
}

// The description card's max-height is capped to stop right above the level
// control, which sits vertically centered on the same left/right edge under
// lowHeightMode:not(.mobileMode) — otherwise a long description can grow
// down far enough to visually overlap the level control's expanded row.
function updateDescriptionMaxHeight(): void {
  const uiWrapper = getRequiredElement("uiWrapper");

  if (!matchesLowHeightViewport() || matchesMobileViewport()) {
    uiWrapper.style.removeProperty("--description-max-height");
    return;
  }

  const bodyTop = getRequiredElement("mobileDescriptionBody").getBoundingClientRect().top;
  const levelControlTop = getRequiredElement("levelControlWrapper").getBoundingClientRect().top;
  const gap = getLevelControlGap();
  const maxHeight = Math.max(0, levelControlTop - bodyTop - gap);

  uiWrapper.style.setProperty("--description-max-height", `${maxHeight}px`);
}

function getLevelControlGap(): number {
  const gap = parseFloat(
    getComputedStyle(getRequiredElement("uiWrapper")).getPropertyValue("--level-control-gap"),
  );
  return Number.isFinite(gap) ? gap : LEVEL_CONTROL_GAP_FALLBACK_PX;
}

export default {
  applyStoredLayout,
  setup,
  refresh,
};
