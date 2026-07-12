import type { GeoMap } from "../geoMap";
import type { AttributionCorner, AttributionOffset } from "../map/mapView";
import { MOBILE_MEDIA_QUERY, isMobileWidth } from "../../utils/breakpoints";
import MobileLayoutService from "../../services/mobileLayoutService";
import { getRequiredElement } from "../../utils/domHelpers";
import { setupPopover, closeAllPopovers } from "./mobilePopover";

const LEVEL_CONTROL_GAP_FALLBACK_PX = 10;

let mediaQueryList: MediaQueryList | undefined;
let popoversRegistered = false;
let descriptionCardObserverSetup = false;
let attributionUpdateFrame: number | undefined;

function applyStoredLayout(): void {
  const uiWrapper = getRequiredElement("uiWrapper");

  uiWrapper.classList.toggle("mobileMode", matchesMobileViewport());
  uiWrapper.classList.toggle("leftHanded", MobileLayoutService.getHandedness() === "left");
  uiWrapper.classList.toggle("mobileZoomVisible", MobileLayoutService.getShowZoomButtons());
}

function setup(geoMap: GeoMap): void {
  registerPopovers();
  setupDescriptionCardObserver(geoMap);
  refresh(geoMap);

  const handleChange = () => {
    closeAllPopovers();
    refresh(geoMap);
  };

  if (typeof window.matchMedia === "function") {
    mediaQueryList = window.matchMedia(MOBILE_MEDIA_QUERY);
    mediaQueryList.addEventListener("change", handleChange);
  } else {
    window.addEventListener("resize", handleChange);
  }
}

function refresh(geoMap: GeoMap): void {
  applyStoredLayout();
  geoMap.setAttributionCorner(getAttributionCorner());
  updateAttributionOffset(geoMap);
}

function registerPopovers(): void {
  if (popoversRegistered) return;
  popoversRegistered = true;

  setupPopover({ triggerId: "mobileLegendTrigger", panelId: "legendWrapper" });
  setupPopover({ triggerId: "mobileProfileTrigger", panelId: "mobileProfilePanel" });
  setupPopover({ triggerId: "mobileSettingsTrigger", panelId: "mobileSettingsPanel" });
  setupPopover({ triggerId: "mobileDescriptionTrigger", panelId: "mobileDescriptionBody" });
}

function getAttributionCorner(): AttributionCorner {
  if (!matchesMobileViewport()) return "top-right";

  return MobileLayoutService.getHandedness() === "left" ? "bottom-right" : "bottom-left";
}

function matchesMobileViewport(): boolean {
  return mediaQueryList ? mediaQueryList.matches : isMobileWidth(window.innerWidth);
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
