import type { GeoMap } from "../geoMap";
import type { AttributionCorner } from "../map/mapView";
import { MOBILE_MEDIA_QUERY, isMobileWidth } from "../../utils/breakpoints";
import MobileLayoutService from "../../services/mobileLayoutService";
import { getRequiredElement } from "../../utils/domHelpers";
import { setupPopover, closeAllPopovers } from "./mobilePopover";

let mediaQueryList: MediaQueryList | undefined;
let popoversRegistered = false;

function applyStoredLayout(): void {
  const uiWrapper = getRequiredElement("uiWrapper");

  uiWrapper.classList.toggle("mobileMode", matchesMobileViewport());
  uiWrapper.classList.toggle("leftHanded", MobileLayoutService.getHandedness() === "left");
  uiWrapper.classList.toggle("mobileZoomVisible", MobileLayoutService.getShowZoomButtons());
}

function setup(geoMap: GeoMap): void {
  registerPopovers();
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

export default {
  applyStoredLayout,
  setup,
  refresh,
};
