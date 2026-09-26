export type MobileHandedness = "right" | "left";

const handednessKey = "mobileHandedness";
const showZoomButtonsKey = "mobileShowZoomButtons";

function getHandedness(): MobileHandedness {
  return localStorage.getItem(handednessKey) === "left" ? "left" : "right";
}

function setHandedness(handedness: MobileHandedness): void {
  localStorage.setItem(handednessKey, handedness);
}

function getShowZoomButtons(): boolean {
  return localStorage.getItem(showZoomButtonsKey) === "true";
}

function setShowZoomButtons(show: boolean): void {
  localStorage.setItem(showZoomButtonsKey, show.toString());
}

export default {
  getHandedness,
  setHandedness,
  getShowZoomButtons,
  setShowZoomButtons,
};
