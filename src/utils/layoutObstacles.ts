export interface Obstacle {
  id: string;
  rect: DOMRect;
}

// Every fixed/absolutely-positioned UI element a popover, the description
// card, or the level control might need to avoid overlapping. Hidden
// elements (display: none) are skipped automatically, so callers don't need
// to know which of these actually exist in the current mode.
const OBSTACLE_ELEMENT_IDS = [
  "indoorSearchWrapper",
  "searchSuggestionsList",
  "mobileDescriptionCard",
  "descriptionArea",
  "legendWrapper",
  "mobileProfilePanel",
  "mobileSettingsPanel",
  "levelControlWrapper",
  "zoomControlWrapper",
  "switch2DViewWrapper",
  "switchWheelchairModeWrapper",
  "quickSettingsWrapper",
];

function getObstacleRects(excludeIds: string[] = []): Obstacle[] {
  return OBSTACLE_ELEMENT_IDS.filter((id) => !excludeIds.includes(id))
    // Use document.getElementById directly (not getRequiredElement) to tolerate missing/hidden elements
    .map((id) => document.getElementById(id))
    .filter((element): element is HTMLElement => element !== null && isVisible(element))
    .map((element) => ({ id: element.id, rect: element.getBoundingClientRect() }));
}

function isVisible(element: HTMLElement): boolean {
  return getComputedStyle(element).display !== "none";
}

function rectsOverlap(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function isWithinViewport(rect: DOMRect): boolean {
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );
}

export default {
  getObstacleRects,
  rectsOverlap,
  isWithinViewport,
};
