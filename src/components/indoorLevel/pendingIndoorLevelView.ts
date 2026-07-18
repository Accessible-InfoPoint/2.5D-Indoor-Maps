import { IndoorLevelView } from "./indoorLevelView";

export class PendingIndoorLevelView implements IndoorLevelView {
  clear(): void {}

  render(): void {}

  hideAll(): void {}

  showAll(): void {}

  show2DView(): void {}

  preload3DAssets(): Promise<void> {
    return Promise.resolve();
  }

  preload3DView(): Promise<void> {
    return Promise.resolve();
  }

  show3DView(): void {}

  animateAltitude(): Promise<void> {
    return Promise.resolve();
  }

  setAltitudeAndOpacity(): void {}
}
