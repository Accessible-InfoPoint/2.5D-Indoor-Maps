import LevelService from "../services/levelService";
import BuildingService from "../services/buildingService";
import BackendService from "../services/backendService";
import UserService from "../services/userService";
import DoorService from "../services/doorService";
import { buildIndoorLevelRenderModel } from "./indoorLevel/indoorLevelRenderBuilder";
import { IndoorLevelView } from "./indoorLevel/indoorLevelView";

interface IndoorLevelState {
  getSelectedFeatureIds: () => string[];
  getInfoPointLevel: () => number;
  setInfoPoint: (feature: GeoJSON.Feature, level: number) => void;
}

export class IndoorLevel {
  level: number;

  constructor(
    geoJSON: GeoJSON.FeatureCollection,
    level: number,
    private readonly view: IndoorLevelView,
    private readonly state: IndoorLevelState
  ) {
    this.level = level;

    this.render(geoJSON);
  }

  clear(): void {
    this.view.clear();
  }

  /**
   * Redraws all layers
   */
  updateLayer(): void {
    this.clear();
    this.render(LevelService.getLevelGeoJSON(this.level));
  }

  /**
   * Hides all layers and resets altitude and opacity
   */
  hideAll(): void {
    this.view.hideAll();
  }

  /**
   * Shows all layers and resets altitude and opacity
   */
  showAll(): void {
    this.view.showAll();
  }

  /**
   * Shows the level in 2D mode and resets altitude and opacity
   */
  show2DView(): void {
    this.view.show2DView();
  }

  /**
   * Shows the level in 3D mode and resets altitude and opacity
   */
  show3DView(): void {
    this.view.show3DView();
  }

  private render(geoJSON: GeoJSON.FeatureCollection): void {
    const renderModel = buildIndoorLevelRenderModel({
      geoJSON,
      buildingGeoJSON: BuildingService.getBuildingGeoJSON(),
      outlineCoordinates: BackendService.getOutline(),
      level: this.level,
      selectedFeatureIds: this.state.getSelectedFeatureIds(),
      infoPointLevel: this.state.getInfoPointLevel(),
      userProfile: UserService.getCurrentProfile(),
    });

    if (renderModel.infoPoint) {
      this.state.setInfoPoint(
        renderModel.infoPoint.feature,
        renderModel.infoPoint.levels.length == 1
          ? renderModel.infoPoint.levels[0]
          : this.state.getInfoPointLevel()
      );
    }

    this.view.render(renderModel, this.state.getSelectedFeatureIds());
    this.view.drawDoors(DoorService.getDoorsByLevel(this.level), this.state.getSelectedFeatureIds());
  }

  /**
   * Animate the altitude and opacity of layers
   * @param start - Where the animations starts from
   * @param end - Where the animation ends
   * @param OpacityStart - Where the opacity starts from
   * @param OpacityEnd - Where the opacity ends
   * @param duration - Duration of the animation
   */
  async animateAltitude(
    start: number,
    end: number,
    opacityStart: number,
    opacityEnd: number,
    duration = 0.5
  ): Promise<void> {
    await this.view.animateAltitude(start, end, opacityStart, opacityEnd, duration);
  }

  /**
   * Set altitude and opacity after animating it, it usually stays at 0 opacity and is set again with this function
   */
  setAltitudeAndOpacity(altitude: number, opacity: number): void {
    this.view.setAltitudeAndOpacity(altitude, opacity);
  }
}
