import { UserGroupEnum } from "../../models/userGroupEnum";
import UserService from "../../services/userService";
import LevelControl from "./levelControl";
import { getRequiredElement } from "../../utils/domHelpers";

const wheelchairModeKey = "wheelchairMode";
const uiPaddingFallback = 15;
let quickSettingsLayoutFrame: number | undefined;
let quickSettingsLayoutObserverSetup = false;

function applyStoredLayout(): void {
  getRequiredElement("uiWrapper")
    .classList
    .toggle("wheelchairMode", localStorage.getItem(wheelchairModeKey) == "true");
}

function setup(onSettingsChanged: () => void, onLayoutChanged: () => void): void {
  applyStoredLayout();
  setupQuickSettingsLayoutObserver();

  const uiWrapper = getRequiredElement("uiWrapper");
  const levelControl = getRequiredElement("levelControl");
  const indoorSearchWrapper = getRequiredElement("indoorSearchWrapper");

  getRequiredElement("switchWheelchairMode").onclick = () => {
    levelControl.classList.remove("transition");
    
    uiWrapper.classList.toggle("wheelchairMode");
    localStorage.setItem(wheelchairModeKey, uiWrapper.classList.contains("wheelchairMode").toString());
    if (uiWrapper.classList.contains("wheelchairMode")) {
      if (UserService.getCurrentProfile() != UserGroupEnum.wheelchairUsers) {
        UserService.setProfile(UserGroupEnum.wheelchairUsers);
        onSettingsChanged();
      }
    }
    replaceIcons();

    LevelControl.setWindow();
    LevelControl.setMargin();
    setTimeout(() => {
      levelControl.classList.add("transition");
    }, 200)

    if (uiWrapper.classList.contains("wheelchairMode")) {
      setIndoorSearchWheelchairLayout();
    } else {
      indoorSearchWrapper.style.removeProperty("left");
      indoorSearchWrapper.style.removeProperty("right");
      requestQuickSettingsLayoutUpdate();
    }

    onLayoutChanged();
  };

  if (localStorage.getItem(wheelchairModeKey) == "true") {
    setTimeout(() => {
      setIndoorSearchWheelchairLayout();
      onLayoutChanged();
    }, 200)
  }

  replaceIcons();
  requestQuickSettingsLayoutUpdate();
}

function replaceIcons(): void {
  const switchWheelchairModeIcon = getRequiredElement<HTMLImageElement>("switchWheelchairModeIcon");
  const levelShiftUpLabel = getRequiredElement("levelShiftUpLabel");
  const levelShiftDownLabel = getRequiredElement("levelShiftDownLabel");

  if (getRequiredElement("uiWrapper").classList.contains("wheelchairMode")) {
    switchWheelchairModeIcon.src = "\\images\\screen_all.svg";
    levelShiftUpLabel.innerHTML = "chevron_left";
    levelShiftDownLabel.innerHTML = "navigate_next";
  } else {
    switchWheelchairModeIcon.src = "\\images\\screen_bottom.svg";
    levelShiftUpLabel.innerHTML = "expand_less";
    levelShiftDownLabel.innerHTML = "expand_more";
  }
}

function setIndoorSearchWheelchairLayout(): void {
  const indoorSearchWrapper = getRequiredElement("indoorSearchWrapper");
  const levelControlWrapper = getRequiredElement("levelControlWrapper");
  const quickSettingsWrapper = getRequiredElement("quickSettingsWrapper");

  indoorSearchWrapper.style.left = (levelControlWrapper.offsetLeft + levelControlWrapper.offsetWidth + 15 + 12) + "px";
  indoorSearchWrapper.style.right = (document.body.clientWidth - quickSettingsWrapper.offsetLeft + 15 + 50) + "px";
}

function setupQuickSettingsLayoutObserver(): void {
  if (quickSettingsLayoutObserverSetup) {
    return;
  }

  quickSettingsLayoutObserverSetup = true;

  window.addEventListener("resize", requestQuickSettingsLayoutUpdate);

  if (typeof ResizeObserver === "undefined") {
    return;
  }

  const observer = new ResizeObserver(requestQuickSettingsLayoutUpdate);
  observer.observe(getRequiredElement("quickSettingsWrapper"));
  observer.observe(getRequiredElement("legendWrapper"));
}

function requestQuickSettingsLayoutUpdate(): void {
  if (quickSettingsLayoutFrame !== undefined) {
    cancelAnimationFrame(quickSettingsLayoutFrame);
  }

  quickSettingsLayoutFrame = requestAnimationFrame(() => {
    quickSettingsLayoutFrame = undefined;
    updateQuickSettingsLayout();
  });
}

function updateQuickSettingsLayout(): void {
  const uiWrapper = getRequiredElement("uiWrapper");
  const quickSettingsWrapper = getRequiredElement("quickSettingsWrapper");

  if (uiWrapper.classList.contains("wheelchairMode")) {
    quickSettingsWrapper.style.removeProperty("--quick-settings-center-y");
    quickSettingsWrapper.style.removeProperty("--quick-settings-max-height");
    return;
  }

  const legendWrapper = getRequiredElement("legendWrapper");
  const uiPadding = getUiPadding(uiWrapper);
  const uiRect = uiWrapper.getBoundingClientRect();
  const legendRect = legendWrapper.getBoundingClientRect();
  const quickSettingsHeight = quickSettingsWrapper.getBoundingClientRect().height;
  const maxHeight = Math.max(0, legendRect.top - uiRect.top - 2 * uiPadding);
  const minCenterY = uiPadding + quickSettingsHeight / 2;
  const maxCenterY = legendRect.top - uiRect.top - uiPadding - quickSettingsHeight / 2;
  const centeredY = uiRect.height / 2;
  const clampedCenterY = Math.max(minCenterY, Math.min(centeredY, maxCenterY));

  quickSettingsWrapper.style.setProperty("--quick-settings-center-y", `${clampedCenterY}px`);
  quickSettingsWrapper.style.setProperty("--quick-settings-max-height", `${maxHeight}px`);
}

function getUiPadding(uiWrapper: HTMLElement): number {
  const uiPadding = parseFloat(getComputedStyle(uiWrapper).getPropertyValue("--ui-padding"));
  return Number.isFinite(uiPadding) ? uiPadding : uiPaddingFallback;
}

export default {
  applyStoredLayout,
  setup,
};
