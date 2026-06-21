import DescriptionArea from "./ui/descriptionArea";
import FeatureService from "../services/featureService";
import LevelService from "../services/levelService";
import { geoMap } from "../main";
import BuildingService from "../services/buildingService";
import BackendService from "../services/backendService";
import UserService from "../services/userService";
import DoorService from "../services/doorService";
import { buildIndoorLevelRenderModel } from "./indoorLevel/indoorLevelRenderBuilder";
import { MaptalksIndoorLevelView } from "./indoorLevel/maptalksIndoorLevelView";


export class IndoorLayer {
  private readonly view: MaptalksIndoorLevelView;
  level: number;

  constructor(geoJSON: GeoJSON.FeatureCollection, level: number, altitude = 0) {
    this.level = level;
    this.view = new MaptalksIndoorLevelView(
      level,
      altitude,
      geoMap.mapInstance,
      (feature) => this.handleClick(feature)
    );

    this.render(geoJSON);
  }

  /**
   * Clear all layers, as threeLayer does not support this feature it is deleted and created new
   */
  clearIndoorLayer(): void {
    this.view.clear();
  }

  /**
   * Redraws all layers
   */
  updateLayer(): void {
    this.clearIndoorLayer();
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
   * Hides all 3D layers and shows 2D layers and resets altitude and opacity
   */
  hide3D(): void {
    this.view.hide3D();
  }

  /**
   * Hides all 2D layers and shows 3D layers and resets altitude and opacity
   */
  show3D(): void {
    this.view.show3D();
  }

  private render(geoJSON: GeoJSON.FeatureCollection): void {
    const renderModel = buildIndoorLevelRenderModel({
      geoJSON,
      buildingGeoJSON: BuildingService.getBuildingGeoJSON(),
      outlineCoordinates: BackendService.getOutline(),
      level: this.level,
      selectedFeatureIds: geoMap.selectedFeatures,
      infoPointLevel: geoMap.infoPointLevel,
      userProfile: UserService.getCurrentProfile(),
    });

    if (renderModel.infoPoint) {
      geoMap.infoPoint = renderModel.infoPoint.feature;
      geoMap.infoPointLevel = renderModel.infoPoint.levels.length == 1
        ? renderModel.infoPoint.levels[0]
        : geoMap.infoPointLevel;
    }

    this.view.render(renderModel, geoMap.selectedFeatures);
    this.view.drawDoors(DoorService.getDoorsByLevel(this.level));
  }

  /**
   * Select feature when clicked
   */
  handleClick(feature: GeoJSON.Feature<any, any>): void {
    console.log(feature);

    const accessibilityDescription = FeatureService.getAccessibilityDescription(feature);
    DescriptionArea.update(accessibilityDescription, "description");

    geoMap.selectedFeatures = [feature.id.toString()];
    // TODO: might need to optimize this, needs a long time to update all layers at the moment
    // idea: only update the layers that are needed
    geoMap.indoorLayers.forEach((layer) => layer.updateLayer());
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
