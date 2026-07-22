import LevelService from "../services/levelService";
import BuildingService from "../services/buildingService";
import BackendService from "../services/backendService";
import UserService from "../services/userService";
import DoorService from "../services/doorService";
import { IndoorDataPipelineEnum } from "../models/indoorDataPipelineEnum";
import { IndoorElementRef } from "../models/indoorElementRef";
import { buildOpeningRenderItemsFromLegacyDoors } from "../indoor/doorRenderBuilder";
import { buildIndoorLevelRenderModel } from "./indoorLevel/indoorLevelRenderBuilder";
import { IndoorLevelRenderModel } from "./indoorLevel/indoorLevelRenderModel";
import { IndoorLevelView } from "./indoorLevel/indoorLevelView";
import { buildRawIndoorLevelRenderModel } from "./indoorLevel/rawIndoorLevelRenderBuilder";

interface IndoorLevelState {
  getSelectedFeatureIds: () => string[];
  getInfoPointLevel: () => number;
  setInfoPoint: (elementRef: IndoorElementRef, level: number) => void;
}

export class IndoorLevel {
  level: number;

  constructor(
    geoJSON: GeoJSON.FeatureCollection,
    level: number,
    private readonly view: IndoorLevelView,
    private readonly state: IndoorLevelState,
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

  preload3DAssets(): Promise<void> {
    return this.view.preload3DAssets();
  }

  preload3DView(): Promise<void> {
    return this.view.preload3DView();
  }

  /**
   * Shows the level in 3D mode and resets altitude and opacity
   */
  show3DView(): void {
    this.view.show3DView();
  }

  private render(geoJSON: GeoJSON.FeatureCollection): void {
    const renderModel = this.buildRenderModel(geoJSON);

    if (renderModel.infoPoint) {
      this.state.setInfoPoint(
        renderModel.infoPoint.elementRef,
        renderModel.infoPoint.levels.length == 1
          ? renderModel.infoPoint.levels[0]
          : this.state.getInfoPointLevel(),
      );
    }

    this.view.render(renderModel, this.state.getSelectedFeatureIds());
  }

  private buildRenderModel(geoJSON: GeoJSON.FeatureCollection): IndoorLevelRenderModel {
    switch (BackendService.getBackendConfig().indoorDataPipeline) {
      case IndoorDataPipelineEnum.geoJsonCompatibility:
      case IndoorDataPipelineEnum.clientGeoJsonCompatibility:
        return {
          ...buildIndoorLevelRenderModel({
            geoJSON,
            buildingGeoJSON: BuildingService.getBuildingGeoJSON(),
            outlineGeometry: BackendService.getBuildingInterface().outlineGeometry,
            level: this.level,
            selectedFeatureIds: this.state.getSelectedFeatureIds(),
            infoPointLevel: this.state.getInfoPointLevel(),
            userProfile: UserService.getCurrentProfile(),
          }),
          openings: buildOpeningRenderItemsFromLegacyDoors(
            DoorService.getDoorsByLevel(this.level),
            this.state.getSelectedFeatureIds(),
          ),
        };
      case IndoorDataPipelineEnum.rawIndoorModel:
        return buildRawIndoorLevelRenderModel({
          model: BackendService.getIndoorModel(),
          level: this.level,
          selectedFeatureIds: this.state.getSelectedFeatureIds(),
          infoPointLevel: this.state.getInfoPointLevel(),
          userProfile: UserService.getCurrentProfile(),
        });
    }
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
    duration = 0.5,
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
