import { getRequiredElement } from "../../utils/domHelpers";
import LayoutObstacles from "../../utils/layoutObstacles";

const CLAMP_GAP_PX = 10;

let observer: ResizeObserver | undefined;
let updateFrame: number | undefined;

function setup(): void {
  if (observer || typeof ResizeObserver === "undefined") return;

  window.addEventListener("resize", requestUpdate);

  observer = new ResizeObserver(requestUpdate);
  observer.observe(getRequiredElement("indoorSearchWrapper"));
  observer.observe(getRequiredElement("mobileDescriptionCard"));
  observer.observe(getRequiredElement("descriptionArea"));
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
    return;
  }

  refreshOpenPanelPositions();
}

const CENTERED_PANEL_IDS = ["legendWrapper", "mobileProfilePanel", "mobileSettingsPanel"];

function applyPositionFallback(panelId: string): void {
  if (!CENTERED_PANEL_IDS.includes(panelId)) return;

  const panel = getRequiredElement(panelId);
  const uiWrapper = getRequiredElement("uiWrapper");

  panel.classList.remove("centered");

  const { ceiling, floor } = computeVerticalBudget(panel);
  // max-height applies to the content box only (these panels are all
  // content-box, the CSS default) — the actual rendered (border-box) height
  // is this plus padding and border on top, so that has to come off the
  // budget or the visible box still reaches past whatever obstacle the
  // clamp is meant to clear.
  const chrome = getVerticalChrome(panel);
  const clampHeight = Math.max(0, floor - ceiling - 2 * CLAMP_GAP_PX - chrome);
  uiWrapper.style.setProperty("--popover-clamp-height", `${clampHeight}px`);

  const rect = panel.getBoundingClientRect();
  const obstacles = LayoutObstacles.getObstacleRects([panelId]);
  const collides =
    !LayoutObstacles.isWithinViewport(rect) ||
    obstacles.some((obstacle) => LayoutObstacles.rectsOverlap(rect, obstacle.rect));

  if (!collides) return;

  const centerY = ceiling + (floor - ceiling) / 2;
  uiWrapper.style.setProperty("--popover-clamp-top", `${centerY}px`);
  panel.classList.add("centered");
}

// Only obstacles that horizontally overlap the panel's own column can ever
// visually collide with it, regardless of how tall it grows — e.g. the
// search bar and description card are both narrowed to leave the
// legend/profile/settings column clear, so they must not constrain this
// panel's height just because they happen to sit at an overlapping y-range.
// Falls back to the viewport edges when no obstacle shares the column in a
// given direction, so the panel can grow to fill genuinely free space.
function computeVerticalBudget(panel: HTMLElement): { ceiling: number; floor: number } {
  const rect = panel.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  const obstacles = LayoutObstacles.getObstacleRects([panel.id]);

  let ceiling = 0;
  let floor = window.innerHeight;

  obstacles.forEach(({ rect: obstacleRect }) => {
    const sharesColumn = obstacleRect.left < rect.right && obstacleRect.right > rect.left;
    if (!sharesColumn) return;

    if (obstacleRect.bottom <= midY) {
      ceiling = Math.max(ceiling, obstacleRect.bottom);
    } else if (obstacleRect.top >= midY) {
      floor = Math.min(floor, obstacleRect.top);
    }
  });

  return { ceiling, floor };
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

export default {
  setup,
  update,
  applyPositionFallback,
};
