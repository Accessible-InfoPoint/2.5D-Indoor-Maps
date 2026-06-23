import {
  INDOOR_LEVEL,
  MAP_START_LAT,
  MAP_START_LNG,
  LEVEL_HEIGHT,
  OPACITY_TRANSLUCENT_LAYER,
} from "../../public/strings/settings.json";
import LevelControl from "./ui/levelControl";
import DescriptionArea from "./ui/descriptionArea";
import BuildingService from "../services/buildingService";
import LoadingIndicator from "./ui/loadingIndicator";
import { IndoorLevel } from "./indoorLevel";
import AccessibilityService from "../services/accessibilityService";
import LevelService from "../services/levelService";
import ColorService from "../services/colorService";
import { lang } from "../services/languageService";
import FeatureService from "../services/featureService";
import BackendService from "../services/backendService";
import { MapCamera } from "./map/mapCamera";
import { MapView } from "./map/mapView";
import { MaptalksMapView } from "./map/maptalksMapView";
import { getRequiredFeatureId, getRequiredFeatureProperties } from "../utils/geoJsonHelpers";
import { getRequiredArrayValue, getRequiredMapValue } from "../utils/requiredHelpers";

export class GeoMap {
  private readonly mapView: MapView;
  camera: MapCamera;
  currentLevel = INDOOR_LEVEL;
  indoorLayers: Map<number, IndoorLevel> = new Map();
  selectedFeatures: string[] = [];
  flatMode = true;
  standardCenter = [parseFloat(MAP_START_LNG), parseFloat(MAP_START_LAT)];
  standardBearing = 0;
  standardZoom = 0;
  maxZoom = 0;
  minZoom = 0;
  standardZoom3DMode = 0;
  standardPitch3DMode = 0;
  standardBearing3DMode = 0;
  infoPoint: GeoJSON.Feature;
  infoPointLevel = INDOOR_LEVEL;
  configMode = false; // set only during configuration of building constants

  constructor() {
    const buildingConstants = BackendService.getBuildingConstants();
    this.standardZoom = buildingConstants["standardZoom"];
    this.maxZoom = buildingConstants["maxZoom"];
    this.minZoom = buildingConstants["minZoom"];
    this.standardBearing = buildingConstants["standardBearing"];
    this.standardBearing3DMode = buildingConstants["standardBearing3DMode"];
    this.standardPitch3DMode = buildingConstants["standardPitch3DMode"];
    this.standardZoom3DMode = buildingConstants["standardZoom3DMode"];

    // default infoPoint location is on default level (in case no explicit infoPoint is set)
    this.infoPoint = {
      "properties": {
        "level": INDOOR_LEVEL
      },
      "type": "Feature",
      "geometry": {
        type: "GeometryCollection",
        geometries: [],
      }
    };

    this.mapView = new MaptalksMapView({
      configMode: this.configMode,
      standardZoom: this.standardZoom,
      maxZoom: this.maxZoom,
      minZoom: this.minZoom,
    });
    this.camera = this.mapView.camera;

    this.applyStyleFilters();
  }

  showBuilding(): string {
    this.handleBuildingLoad();
    this.centerMapToBuilding();

    return lang.searchBuildingFound;
  }

  handleBuildingLoad(): void {
    LevelControl.handleChange(this);
    LevelService.clearData();

    this.currentLevel = INDOOR_LEVEL;
    this.camera.setBearing(this.standardBearing);

    this.indoorLayers = new Map(
      BackendService.getAllLevels()
        .reverse()
        .map((val) => {
          const view = this.mapView.createIndoorLevelView(
            val,
            0,
            {
              onFeatureSelected: (feature) => this.handleFeatureSelection(feature),
            }
          );

          return [
            val,
              new IndoorLevel(
                LevelService.getLevelGeoJSON(val),
                val,
                view,
                {
                  getSelectedFeatureIds: () => this.selectedFeatures,
                  getInfoPointLevel: () => this.infoPointLevel,
                  setInfoPoint: (feature, level) => {
                    this.infoPoint = feature;
                    this.infoPointLevel = level;
                  },
                }
              ),
          ] as [number, IndoorLevel];
        })
    );
    this.indoorLayers.forEach((layer) => {
      layer.hideAll();
    });
    this.handleLevelChange(INDOOR_LEVEL);

    AccessibilityService.reset();

    const message = BuildingService.getBuildingDescription();
    DescriptionArea.update(message, "selectedBuilding");
  }

  centerMapToBuilding(): void {
    const boundingBox = BackendService.getBoundingBox();
    const center = {
      x: (boundingBox[0] + boundingBox[2]) / 2,
      y: (boundingBox[1] + boundingBox[3]) / 2,
    };

    this.standardCenter = [center.x, center.y];

    this.camera.animateToCenter(
      center,
      350
    );
    setTimeout(() => {
      this.camera.animateToZoom(this.standardZoom, 350);
    }, 350);
    setTimeout(() => {
      // this.indoorLevel.animateAltitude(10, 0, 0, 0.25, 0.5)
      console.log(this.camera.getPosition());
    }, 1000);
  }

  handleLevelChange(newLevel: number): void {
    const animationDuration = 1;

    if (this.flatMode) {
      this.getIndoorLevel(this.currentLevel).hideAll();
      this.currentLevel = newLevel;
      this.getIndoorLevel(this.currentLevel).show2DView();
    } else {
      if (newLevel == this.currentLevel) {
        return;
      }
      const oldLevel = this.getCurrentLevel();
      const oldLevelTop = this.getLevelAboveOrSelf(oldLevel);
      const oldLevelBottom = this.getLevelBelowOrSelf(oldLevel);

      const newLevelTop = this.getLevelAboveOrSelf(newLevel);
      const newLevelBottom = this.getLevelBelowOrSelf(newLevel);

      const initialHeightOldLevel = oldLevel == oldLevelBottom ? 0 : LEVEL_HEIGHT;
      const finalHeightNewLevel = newLevel == newLevelBottom ? 0 : LEVEL_HEIGHT;
      const difference = this.getLevelDifference(oldLevel, newLevel);
      const offset = oldLevel == oldLevelBottom ? -LEVEL_HEIGHT : (newLevel == newLevelBottom ? LEVEL_HEIGHT : 0);

      const finalHeightOldLevel = initialHeightOldLevel - LEVEL_HEIGHT * difference - offset;
      const initialHeightNewLevel = finalHeightNewLevel + LEVEL_HEIGHT * difference + offset;

      [newLevel, newLevelTop, newLevelBottom].filter(item => ![oldLevel, oldLevelTop, oldLevelBottom].includes(item)).forEach(element => {
        this.getIndoorLevel(element).show3DView();
      });
      setTimeout(() => {
        BackendService.getAllLevels().filter(item => ![newLevel, newLevelTop, newLevelBottom].includes(item)).forEach(item => {
          this.getIndoorLevel(item).hideAll();
        })
      }, animationDuration * 1000);

      this.getIndoorLevel(newLevel).animateAltitude(initialHeightNewLevel, finalHeightNewLevel, Math.abs(difference) == 1 ? OPACITY_TRANSLUCENT_LAYER : 0, 1, animationDuration);
      this.getIndoorLevel(oldLevel).animateAltitude(initialHeightOldLevel, finalHeightOldLevel, 1, Math.abs(difference) == 1 ? OPACITY_TRANSLUCENT_LAYER : 0, animationDuration);

      if (newLevel != newLevelBottom) {
        this.getIndoorLevel(newLevelBottom).animateAltitude(initialHeightNewLevel - LEVEL_HEIGHT, finalHeightNewLevel - LEVEL_HEIGHT, oldLevel == newLevelBottom ? 1 : oldLevelTop == newLevelBottom ? OPACITY_TRANSLUCENT_LAYER : 0, OPACITY_TRANSLUCENT_LAYER, animationDuration);
      }

      if (newLevel != newLevelTop && newLevelTop != oldLevel) {
        this.getIndoorLevel(newLevelTop).animateAltitude(initialHeightNewLevel + LEVEL_HEIGHT, finalHeightNewLevel + LEVEL_HEIGHT, oldLevel == newLevelTop ? 1 : oldLevelBottom == newLevelTop ? OPACITY_TRANSLUCENT_LAYER : 0, OPACITY_TRANSLUCENT_LAYER, animationDuration);
      }

      if (oldLevelBottom != newLevelTop && oldLevelBottom != newLevel && oldLevel != oldLevelBottom) {
        this.getIndoorLevel(oldLevelBottom).animateAltitude(initialHeightOldLevel - LEVEL_HEIGHT, finalHeightOldLevel - LEVEL_HEIGHT, OPACITY_TRANSLUCENT_LAYER, 0, animationDuration);
      }

      if (oldLevelTop != newLevelBottom && oldLevelTop != newLevel && oldLevel != oldLevelTop) {
        this.getIndoorLevel(oldLevelTop).animateAltitude(initialHeightOldLevel + LEVEL_HEIGHT, finalHeightOldLevel + LEVEL_HEIGHT, OPACITY_TRANSLUCENT_LAYER, 0, animationDuration);
      }

      this.currentLevel = newLevel;
    }

    const message = LevelService.getCurrentLevelDescription(this.currentLevel);
    DescriptionArea.update(message);
  }

  // only support whole level differences
  getLevelDifference(level1: number, level2: number): number {
    return (
      BackendService.getAllLevels().indexOf(level1) -
      BackendService.getAllLevels().indexOf(level2)
    );
  }

  getCurrentLevel(): number {
    return this.currentLevel;
  }

  handleFeatureSelection(feature: GeoJSON.Feature): void {
    console.log(feature);

    const accessibilityDescription = FeatureService.getAccessibilityDescription(feature);
    DescriptionArea.update(accessibilityDescription, "description");

    this.selectedFeatures = [getRequiredFeatureId(feature)];
    // TODO: might need to optimize this, needs a long time to update all layers at the moment
    // idea: only update the layers that are needed
    this.indoorLayers.forEach((layer) => layer.updateLayer());
  }

  handleIndoorSearch(searchString: string): void {
    if (searchString) {
      const results = BuildingService.runIndoorSearch(searchString);
      if (results.length != 0) {
        this.selectedFeatures = results.map((feature) => getRequiredFeatureId(feature));
        this.indoorLayers.forEach((layer) => layer.updateLayer());

        // from the levels of the feature, select the nearest to the current level
        const result = getRequiredArrayValue(results, 0, "Indoor search results");
        const selectedLevel = getRequiredArrayValue(
          (getRequiredFeatureProperties(result).level as number[])
            .sort((a, b) => Math.abs(a - this.currentLevel) - Math.abs(b - this.currentLevel)),
          0,
          "Indoor search result levels"
        );
        LevelControl.focusOnLevel(selectedLevel);
        this.handleLevelChange(selectedLevel);

        const accessibilityDescription =
          FeatureService.getAccessibilityDescription(result);
        DescriptionArea.update(accessibilityDescription);
      } else LoadingIndicator.error(lang.searchNotFound);
    } else LoadingIndicator.error(lang.searchEmpty);
  }

  applyStyleFilters = (): void => {
    this.mapView.setBaseLayerOpacity(ColorService.getEnvOpacity() / 100);
    this.mapView.setSaturation((ColorService.getColorStrength() * 2) / 100);

    //wall weight rendered per feature -> feature service
  };

  refreshSettings(): void {
    this.applyStyleFilters();
    AccessibilityService.reset();
    this.indoorLayers.forEach((layer) => layer.updateLayer());
    const message = LevelService.getCurrentLevelDescription(this.currentLevel);
    DescriptionArea.update(message);
  }

  private getIndoorLevel(level: number): IndoorLevel {
    return getRequiredMapValue(this.indoorLayers, level, "Indoor layers");
  }

  private getLevelAboveOrSelf(level: number): number {
    const levels = BackendService.getAllLevels();
    const index = levels.indexOf(level);

    if (index <= 0)
      return level;

    return getRequiredArrayValue(levels, index - 1, "Building levels");
  }

  private getLevelBelowOrSelf(level: number): number {
    const levels = BackendService.getAllLevels();
    const index = levels.indexOf(level);

    if (index == -1 || index >= levels.length - 1)
      return level;

    return getRequiredArrayValue(levels, index + 1, "Building levels");
  }
}
