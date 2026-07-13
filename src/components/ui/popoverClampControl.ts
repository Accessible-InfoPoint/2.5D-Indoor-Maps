import { getRequiredElement } from "../../utils/domHelpers";
import LayoutObstacles from "../../utils/layoutObstacles";

const CLAMP_GAP_PX = 10;
const UI_PADDING_FALLBACK_PX = 15;

let observer: ResizeObserver | undefined;
let updateFrame: number | undefined;

function setup(): void {
  if (observer || typeof ResizeObserver === "undefined") return;

  window.addEventListener("resize", requestUpdate);

  observer = new ResizeObserver(requestUpdate);
  observer.observe(getRequiredElement("indoorSearchWrapper"));
  observer.observe(getRequiredElement("mobileDescriptionCard"));
  observer.observe(getRequiredElement("descriptionArea"));
  observer.observe(getRequiredElement("shortSettingsTrigger"));
}

function requestUpdate(): void {
  if (updateFrame !== undefined) {
    cancelAnimationFrame(updateFrame);
  }

  updateFrame = requestAnimationFrame(() => {
    updateFrame = undefined;
    update();
  });
}

function update(): void {
  const uiWrapper = getRequiredElement("uiWrapper");

  if (!uiWrapper.classList.contains("shortMode")) {
    uiWrapper.style.removeProperty("--popover-clamp-height");
    uiWrapper.style.removeProperty("--legend-clamp-height");
    return;
  }

  const ceiling = getCeiling(uiWrapper);
  const floor = getFloor(uiWrapper);
  // max-height applies to the content box only (these panels are all
  // content-box, the CSS default, whether by explicit declaration like
  // #legendWrapper or just by not overriding it) — the actual rendered
  // (border-box) height is this plus padding and border on top, so that
  // has to come off the budget or the visible box still reaches past
  // whatever obstacle the clamp is meant to clear.
  const chrome = getVerticalChrome(getRequiredElement("legendWrapper"));
  const clampHeight = Math.max(0, floor - ceiling - 2 * CLAMP_GAP_PX - chrome);

  uiWrapper.style.setProperty("--popover-clamp-height", `${clampHeight}px`);
  updateLegendClamp(uiWrapper, chrome);
  refreshOpenPanelPositions();
}

const CENTERED_PANEL_IDS = ["legendWrapper", "mobileProfilePanel", "mobileSettingsPanel"];

function applyPositionFallback(panelId: string): void {
  const panel = getRequiredElement(panelId);

  panel.classList.remove("centered");
  const rect = panel.getBoundingClientRect();
  const obstacles = LayoutObstacles.getObstacleRects([panelId]);
  const collides =
    !LayoutObstacles.isWithinViewport(rect) ||
    obstacles.some((obstacle) => LayoutObstacles.rectsOverlap(rect, obstacle.rect));

  if (!collides) return;

  const uiWrapper = getRequiredElement("uiWrapper");
  const ceiling = getCeiling(uiWrapper);
  const floor = getFloor(uiWrapper);
  const centerY = ceiling + (floor - ceiling) / 2;

  uiWrapper.style.setProperty("--popover-clamp-top", `${centerY}px`);
  panel.classList.add("centered");
}

function refreshOpenPanelPositions(): void {
  CENTERED_PANEL_IDS.forEach((id) => {
    const panel = getRequiredElement(id);
    if (panel.classList.contains("open")) {
      applyPositionFallback(id);
    }
  });
}

function getVerticalChrome(element: HTMLElement): number {
  const style = getComputedStyle(element);
  return (
    parseFloat(style.paddingTop) +
    parseFloat(style.paddingBottom) +
    parseFloat(style.borderTopWidth) +
    parseFloat(style.borderBottomWidth)
  );
}

// At desktop width, #legendWrapper now shares #shortProfileTrigger/
// #shortSettingsTrigger's column (see #uiWrapper.shortMode:not(.mobileMode)
// #shortLegendTrigger in main.scss) but — unlike those two, which sit
// vertically centered — it opens bottom-anchored and grows UPWARD. Its own
// "bottom" CSS offset (uiPadding + button-size + uiPadding) is one whole
// uiPadding taller than #shortLegendTrigger's (just uiPadding), so the
// panel's bottom edge sits one uiPadding ABOVE the trigger's top edge, not
// flush with it — #legendWrapper can be display:none while closed (its
// getBoundingClientRect() would read all zeros then), so that edge is
// derived from the always-visible trigger's rect rather than measured
// directly. The shared --popover-clamp-height above (search bar/
// description-card based) doesn't protect this panel from growing tall
// enough to cover the trigger buttons sitting above it in that same
// column — #shortSettingsTrigger is the nearer of the two (see main.scss:
// it sits below #shortProfileTrigger), so it's the first obstacle the
// panel would actually reach growing upward. Mobile width is unaffected
// (#mobileLegendTrigger stays in its own separate corner there), so this
// only applies at desktop width.
function updateLegendClamp(uiWrapper: HTMLElement, chrome: number): void {
  if (uiWrapper.classList.contains("mobileMode")) {
    uiWrapper.style.removeProperty("--legend-clamp-height");
    return;
  }

  const uiPadding = getUiPadding(uiWrapper);
  const panelBottom =
    getRequiredElement("shortLegendTrigger").getBoundingClientRect().top - uiPadding;
  const ceiling = getRequiredElement("shortSettingsTrigger").getBoundingClientRect().bottom;
  const clampHeight = Math.max(0, panelBottom - ceiling - CLAMP_GAP_PX - chrome);
  uiWrapper.style.setProperty("--legend-clamp-height", `${clampHeight}px`);
}

function getUiPadding(uiWrapper: HTMLElement): number {
  const padding = parseFloat(getComputedStyle(uiWrapper).getPropertyValue("--ui-padding"));
  return Number.isFinite(padding) ? padding : UI_PADDING_FALLBACK_PX;
}

function getCeiling(uiWrapper: HTMLElement): number {
  if (uiWrapper.classList.contains("mobileMode")) {
    return getRequiredElement("indoorSearchWrapper").getBoundingClientRect().bottom;
  }

  if (uiWrapper.classList.contains("lowHeightMode")) {
    return getRequiredElement("mobileDescriptionCard").getBoundingClientRect().bottom;
  }

  return getRequiredElement("descriptionArea").getBoundingClientRect().bottom;
}

function getFloor(uiWrapper: HTMLElement): number {
  if (uiWrapper.classList.contains("mobileMode")) {
    return getRequiredElement("mobileDescriptionCard").getBoundingClientRect().top;
  }

  return getRequiredElement("indoorSearchWrapper").getBoundingClientRect().top;
}

export default {
  setup,
  update,
  applyPositionFallback,
};
