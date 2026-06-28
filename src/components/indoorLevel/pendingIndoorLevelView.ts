import { IndoorLevelView } from "./indoorLevelView";

export class PendingIndoorLevelView implements IndoorLevelView {
  clear(): void {}

  render(): void {}

  drawDoors(): void {}

  hideAll(): void {}

  showAll(): void {}

  show2DView(): void {}

  show3DView(): void {}

  animateAltitude(): Promise<void> {
    return Promise.resolve();
  }

  setAltitudeAndOpacity(): void {}
}
