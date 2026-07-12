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
import { getRequiredElement } from "../../utils/domHelpers";
import { setupPopover, closeAllPopovers } from "./mobilePopover";
import PopoverClampControl from "./popoverClampControl";

const LEVEL_CONTROL_GAP_FALLBACK_PX = 10;
const UI_PADDING_FALLBACK_PX = 15;

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
  geoMap.setAttributionCorner(getAttributionCorner());
  updateAttributionOffset(geoMap);
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
  setupPopover({ triggerId: "mobileDescriptionTrigger", panelId: "mobileDescriptionBody" });
}

function getAttributionCorner(): AttributionCorner {
  if (!isCompactAttribution()) return "top-right";

  return MobileLayoutService.getHandedness() === "left" ? "bottom-right" : "bottom-left";
}

function isCompactAttribution(): boolean {
  return matchesMobileViewport() || matchesLowHeightViewport();
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
// must stay clear of lives inside #map, a DOM sibling — no CSS selector can
// condition attribution's position on the card's live size/position. Track the
// card's box directly and push pixel offsets through the MapView interface
// instead (see MapLibreMapView.setAttributionOffset).
function setupDescriptionCardObserver(geoMap: GeoMap): void {
  if (descriptionCardObserverSetup) return;
  descriptionCardObserverSetup = true;

  window.addEventListener("resize", () => requestAttributionOffsetUpdate(geoMap));

  if (typeof ResizeObserver === "undefined") {
    return;
  }

  const observer = new ResizeObserver(() => requestAttributionOffsetUpdate(geoMap));
  observer.observe(getRequiredElement("mobileDescriptionCard"));
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
  if (!isCompactAttribution()) {
    geoMap.setAttributionOffset(null);
    geoMap.setDescriptionCardPadding({ top: 0, right: 0, bottom: 0, left: 0 });
    return;
  }

  const rect = getRequiredElement("mobileDescriptionCard").getBoundingClientRect();
  const gap = getLevelControlGap();
  const isDesktopWidthLowHeight = matchesLowHeightViewport() && !matchesMobileViewport();

  const offset: AttributionOffset = {
    left: rect.left,
    right: window.innerWidth - rect.right,
    bottom: isDesktopWidthLowHeight ? getUiPadding() : window.innerHeight - rect.top + gap,
  };

  geoMap.setAttributionOffset(offset);

  if (!isDesktopWidthLowHeight) {
    geoMap.setDescriptionCardPadding({ top: 0, right: 0, bottom: 0, left: 0 });
    return;
  }

  const cardWidth = rect.width;
  geoMap.setDescriptionCardPadding(
    MobileLayoutService.getHandedness() === "left"
      ? { top: 0, right: cardWidth, bottom: 0, left: 0 }
      : { top: 0, right: 0, bottom: 0, left: cardWidth },
  );
}

function getUiPadding(): number {
  const padding = parseFloat(
    getComputedStyle(getRequiredElement("uiWrapper")).getPropertyValue("--ui-padding"),
  );
  return Number.isFinite(padding) ? padding : UI_PADDING_FALLBACK_PX;
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
