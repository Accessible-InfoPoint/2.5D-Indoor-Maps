import { getRequiredElement } from "../../utils/domHelpers";

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

  const ceiling = getCeiling(uiWrapper);
  const floor = getFloor(uiWrapper);
  const clampHeight = Math.max(0, floor - ceiling - 2 * CLAMP_GAP_PX);

  uiWrapper.style.setProperty("--popover-clamp-height", `${clampHeight}px`);
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
};
