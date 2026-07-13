import {
  INDOOR_LEVEL,
  VISIBLE_LEVEL_CONTROLS,
  START_LEVEL_CONTROL_POSITION,
} from "../../../public/strings/settings.json";
import LevelService from "../../services/levelService";
import type { GeoMap } from "../geoMap";
import { lang } from "../../services/languageService";
import { getRequiredElement } from "../../utils/domHelpers";
import OverlayExclusivityService from "../../services/overlayExclusivityService";
import LayoutObstacles from "../../utils/layoutObstacles";

let offset = 1;
const minOffset = 0;
let maxOffset = 0;
let numLevels = 0;
let allLevelNames: string[] = [];

function handleLoad(geoMap: GeoMap): void {
  //reCreate

  remove();
  create(geoMap);
}

function create(geoMap: GeoMap): void {
  const levelNames = LevelService.getLevelNames();
  render(levelNames, geoMap);
}

function remove(): void {
  getRequiredElement("levelControl").innerHTML = "";
}

function render(allLevelNamesParam: string[], geoMap: GeoMap): void {
  const levelControl = getRequiredElement("levelControl");
  allLevelNames = allLevelNamesParam;
  numLevels = allLevelNames.length;

  allLevelNames.forEach((level: string) => {
    const changeToLevel = lang.changeLevel + level;
    const levelLi = document.createElement("li");
    const levelBtn = document.createElement("button");
    levelBtn.className = "square";
    levelBtn.innerHTML = level;
    levelBtn.setAttribute("title", changeToLevel);
    levelBtn.setAttribute("aria-label", changeToLevel);
    levelBtn.setAttribute("tabindex", "0");

    updateLevelButtonState(levelBtn, level == INDOOR_LEVEL.toString()); // TODO: Check for level ref, name might not be simply numerical

    levelBtn.addEventListener("click", () => {
      const didChangeLevel = geoMap.handleLevelChange(parseFloat(level));
      if (!didChangeLevel) return;

      for (const element of levelControl.children) {
        if (element.firstElementChild instanceof HTMLButtonElement) {
          updateLevelButtonState(element.firstElementChild, false);
        }
      }
      updateLevelButtonState(levelBtn, true);
      updateToggleLabel(level);
      collapseLevelControl();
    });

    levelLi.appendChild(levelBtn);
    levelControl.appendChild(levelLi);
  });

  setWindow();
  updateToggleLabel(INDOOR_LEVEL.toString());

  const index = allLevelNames.findIndex((level) => level == INDOOR_LEVEL.toString());
  offset = index - START_LEVEL_CONTROL_POSITION; // current should be second to last in visible
  maxOffset = numLevels - VISIBLE_LEVEL_CONTROLS;
  offset = Math.max(minOffset, Math.min(maxOffset, offset));
  disableLevelShifters();
  setMargin();
}

function moveUp(): void {
  offset -= 1;
  offset = Math.max(minOffset, Math.min(maxOffset, offset));
  disableLevelShifters();
  setMargin();
}
function moveDown(): void {
  offset += 1;
  offset = Math.max(minOffset, Math.min(maxOffset, offset));
  disableLevelShifters();
  setMargin();
}

function setWindow(): void {
  const levelControl = getRequiredElement("levelControl");
  const levelShiftUp = getRequiredElement("levelShiftUp");
  const levelShiftDown = getRequiredElement("levelShiftDown");
  const levelControlWindow = getRequiredElement("levelControlWindow");
  const levelControlWrapper = getRequiredElement("levelControlWrapper");

  const size = parseInt(getComputedStyle(levelControl).getPropertyValue("--button-size"));
  const gap = parseInt(getComputedStyle(levelControl).getPropertyValue("--level-control-gap"));

  let shownLevels = Math.min(VISIBLE_LEVEL_CONTROLS, numLevels);
  applyWindowSize(levelControlWindow, shownLevels, size, gap);

  if (levelControlWrapper.classList.contains("expanded")) {
    while (shownLevels > 1 && collidesWithOtherUi(levelControlWrapper)) {
      shownLevels -= 1;
      applyWindowSize(levelControlWindow, shownLevels, size, gap);
    }
  }

  if (numLevels <= shownLevels) {
    levelShiftUp.style.display = "none";
    levelShiftDown.style.display = "none";
  } else {
    levelShiftUp.style.display = "inline-block";
    levelShiftDown.style.display = "inline-block";
  }

  updateShiftIcons();
}

function applyWindowSize(
  levelControlWindow: HTMLElement,
  shownLevels: number,
  size: number,
  gap: number,
): void {
  if (isHorizontalLevelLayout()) {
    levelControlWindow.style.width = shownLevels * size + (shownLevels - 1) * gap + "px";
    levelControlWindow.style.height = "auto";
  } else {
    levelControlWindow.style.height = shownLevels * size + (shownLevels - 1) * gap + "px";
    levelControlWindow.style.width = "auto";
  }
}

// Measures the wrapper's OWN current rendered rect (rather than modeling
// which edge it grows from) so this works regardless of whether the control
// is left- or right-anchored, on mobile or desktop, handed or not — the
// browser has already resolved the anchor direction by the time this reads
// getBoundingClientRect().
function collidesWithOtherUi(levelControlWrapper: HTMLElement): boolean {
  const rect = levelControlWrapper.getBoundingClientRect();
  const obstacles = LayoutObstacles.getObstacleRects(["levelControlWrapper"]);
  return (
    !LayoutObstacles.isWithinViewport(rect) ||
    obstacles.some((obstacle) => LayoutObstacles.rectsOverlap(rect, obstacle.rect))
  );
}

// The paging icons must point along whichever axis the control currently
// pages on. isHorizontalLevelLayout() can flip on a live viewport resize
// (shortMode/lowHeightMode) with no explicit user action, so this needs to
// run everywhere setWindow() does — not just on the wheelchair toggle, which
// used to be the only thing that ever changed the layout axis.
function updateShiftIcons(): void {
  const levelShiftUpLabel = getRequiredElement("levelShiftUpLabel");
  const levelShiftDownLabel = getRequiredElement("levelShiftDownLabel");

  if (isHorizontalLevelLayout()) {
    levelShiftUpLabel.textContent = "chevron_left";
    levelShiftDownLabel.textContent = "navigate_next";
  } else {
    levelShiftUpLabel.textContent = "expand_less";
    levelShiftDownLabel.textContent = "expand_more";
  }
}

function setMargin(): void {
  const levelControl = getRequiredElement("levelControl");

  if (isHorizontalLevelLayout()) {
    const size = parseInt(getComputedStyle(levelControl).getPropertyValue("--button-size"));
    const gap = parseInt(getComputedStyle(levelControl).getPropertyValue("--level-control-gap"));
    levelControl.style.marginLeft = -1 * (size + gap) * offset + "px";
    levelControl.style.marginTop = "0px";
  } else {
    const size = parseInt(getComputedStyle(levelControl).getPropertyValue("--button-size"));
    const gap = parseInt(getComputedStyle(levelControl).getPropertyValue("--level-control-gap"));
    levelControl.style.marginTop = -1 * (size + gap) * offset + "px";
    levelControl.style.marginLeft = "0px";
  }
}

function disableLevelShifters(): void {
  const levelShiftUp = getRequiredElement("levelShiftUp");
  const levelShiftDown = getRequiredElement("levelShiftDown");

  if (offset == minOffset) {
    levelShiftUp.setAttribute("disabled", "disabled");
  } else {
    levelShiftUp.removeAttribute("disabled");
  }
  if (offset == maxOffset) {
    levelShiftDown.setAttribute("disabled", "disabled");
  } else {
    levelShiftDown.removeAttribute("disabled");
  }
}

function setLevelSelectionDisabled(disabled: boolean): void {
  for (const element of getRequiredElement("levelControl").children) {
    const levelButton = element.firstElementChild;
    if (levelButton instanceof HTMLButtonElement) {
      levelButton.disabled = disabled;
    }
  }
}

function focusOnLevel(selectedLevel: number): void {
  const levelControl = getRequiredElement("levelControl");
  const list = levelControl.children;
  for (const item of list) {
    if (item.firstChild?.textContent === selectedLevel.toString()) {
      if (item.children[0] instanceof HTMLButtonElement) {
        updateLevelButtonState(item.children[0], true);
      }
    } else if (item.children[0] instanceof HTMLButtonElement) {
      updateLevelButtonState(item.children[0], false);
    }
  }

  updateToggleLabel(selectedLevel.toString());

  const index = allLevelNames.findIndex((level) => level == selectedLevel.toString());
  if (index < offset) {
    // level is above in height what is currently visible
    // we need to shift offset down
    offset = Math.max(index, minOffset);
  }
  if (index > offset + VISIBLE_LEVEL_CONTROLS - 1) {
    // level is above in height what is currently visible
    // we need to shift offset down
    offset = Math.min(index - VISIBLE_LEVEL_CONTROLS - 1, maxOffset);
  }

  disableLevelShifters();
  setMargin();
}

function setupControlShifter(): void {
  const up = getRequiredElement("levelShiftUp");
  up.addEventListener("click", () => {
    moveUp();
  });
  const down = getRequiredElement("levelShiftDown");
  down.addEventListener("click", () => {
    moveDown();
  });
}

function updateLevelButtonState(button: HTMLButtonElement, active: boolean): void {
  button.classList.toggle("active", active);
  if (active) {
    button.setAttribute("aria-current", "true");
  } else {
    button.removeAttribute("aria-current");
  }
}

function setupCollapseToggle(): void {
  const toggle = getRequiredElement("levelControlToggle");
  const wrapper = getRequiredElement("levelControlWrapper");

  OverlayExclusivityService.registerOverlay("levelControlWrapper", collapseLevelControl);

  toggle.addEventListener("click", () => {
    const expanded = wrapper.classList.toggle("expanded");
    toggle.setAttribute("aria-expanded", expanded.toString());
    if (expanded) {
      OverlayExclusivityService.notifyOpened("levelControlWrapper");
    }
    setWindow();
  });
}

function collapseLevelControl(): void {
  getRequiredElement("levelControlWrapper").classList.remove("expanded");
  getRequiredElement("levelControlToggle").setAttribute("aria-expanded", "false");
}

function updateToggleLabel(level: string): void {
  getRequiredElement("levelControlToggleLabel").textContent = level;
}

function isHorizontalLevelLayout(): boolean {
  const uiWrapper = getRequiredElement("uiWrapper");
  if (uiWrapper.classList.contains("lowHeightMode")) return true;

  return (
    uiWrapper.classList.contains("wheelchairMode") && !uiWrapper.classList.contains("mobileMode")
  );
}

export default {
  handleChange: handleLoad,
  focusOnLevel,
  setupControlShifter,
  setupCollapseToggle,
  setMargin,
  setWindow,
  setLevelSelectionDisabled,
};
