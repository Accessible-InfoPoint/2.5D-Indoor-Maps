import {
  INDOOR_LEVEL,
  MAP_START_LAT,
  MAP_START_LNG,
  LEVEL_HEIGHT,
  MAP_MAX_LATITUDE_BOUND,
  MAP_MIN_BOUNDS_MARGIN_FACTOR,
  OPACITY_TRANSLUCENT_LAYER,
} from "../../public/strings/settings.json";
import LevelControl from "./ui/levelControl";
import DescriptionArea from "./ui/descriptionArea";
import BuildingService from "../services/buildingService";
import { IndoorLevel } from "./indoorLevel";
import AccessibilityService from "../services/accessibilityService";
import LevelService from "../services/levelService";
import ColorService from "../services/colorService";
import { lang } from "../services/languageService";
import FeatureService from "../services/featureService";
import BackendService, { type BuildingCenter } from "../services/backendService";
import { MapCamera } from "./map/mapCamera";
import { MapBounds, MapCenterConstraint, MapView } from "./map/mapView";
import { MapLibreMapView } from "./map/maplibreMapView";
import { getRequiredFeatureId } from "../utils/geoJsonHelpers";
import { getRequiredArrayValue, getRequiredMapValue } from "../utils/requiredHelpers";
import { getRequiredElement } from "../utils/domHelpers";
import CoordinateHelpers from "../utils/coordinateHelpers";
import { getMotionDuration } from "../utils/motionPreferences";
import { getFeatureLevels } from "../utils/featureLevels";

export class GeoMap {
  private readonly mapView: MapView;
  camera: MapCamera;
  currentLevel = INDOOR_LEVEL;
  indoorLayers: Map<number, IndoorLevel> = new Map();
  selectedFeatures: string[] = [];
  flatMode = true;
  standardCenter: BuildingCenter = [parseFloat(MAP_START_LNG), parseFloat(MAP_START_LAT)];
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
  private isLevelTransitionRunning = false;
  private threePreloadPromise?: Promise<void>;

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
      properties: {
        level: INDOOR_LEVEL,
      },
      type: "Feature",
      geometry: {
        type: "GeometryCollection",
        geometries: [],
      },
    };

    this.mapView = new MapLibreMapView({
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
    this.refreshMapViewportConstraints();
    this.centerMapToBuilding();
    this.mapView.onceIdle(() => {
      void this.preload3DAssets().catch((error: unknown) => {
        console.warn("Could not preload the 3D map assets.", error);
      });
    });

    return lang.searchBuildingFound;
  }

  preload3DAssets(): Promise<void> {
    return Promise.all(
      Array.from(this.indoorLayers.values(), (layer) => layer.preload3DAssets()),
    ).then((): void => undefined);
  }

  preload3DView(): Promise<void> {
    this.threePreloadPromise ??= Promise.all(
      Array.from(this.indoorLayers.values(), (layer) => layer.preload3DView()),
    )
      .then((): void => undefined)
      .catch((error: unknown) => {
        this.threePreloadPromise = undefined;
        throw error;
      });

    return this.threePreloadPromise;
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
          const view = this.mapView.createIndoorLevelView(val, 0, {
            onFeatureSelected: (feature) => this.handleFeatureSelection(feature),
          });

          return [
            val,
            new IndoorLevel(LevelService.getLevelGeoJSON(val), val, view, {
              getSelectedFeatureIds: () => this.selectedFeatures,
              getInfoPointLevel: () => this.infoPointLevel,
              setInfoPoint: (feature, level) => {
                this.infoPoint = feature;
                this.infoPointLevel = level;
              },
            }),
          ] as [number, IndoorLevel];
        }),
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
    this.refreshMapViewportConstraints();

    const center = this.getInitialMapCenter();
    this.standardCenter = [center.x, center.y];

    this.camera.animateToCenter(center, getMotionDuration(350));
    setTimeout(() => {
      this.camera.animateToZoom(this.standardZoom, getMotionDuration(350));
    }, getMotionDuration(350));
    setTimeout(() => {
      // this.indoorLevel.animateAltitude(10, 0, 0, 0.25, 0.5)
      console.log(this.camera.getPosition());
    }, 1000);
  }

  private getInitialMapCenter(): { x: number; y: number } {
    const configuredCenter = this.getConfiguredStandardCenter();

    if (configuredCenter) {
      return {
        x: configuredCenter[0],
        y: configuredCenter[1],
      };
    }

    const boundingBox = BackendService.getBoundingBox();

    return {
      x: (boundingBox[0] + boundingBox[2]) / 2,
      y: (boundingBox[1] + boundingBox[3]) / 2,
    };
  }

  private updateStandardCenter(): void {
    const center = this.getInitialMapCenter();

    this.standardCenter = [center.x, center.y];
  }

  private getConfiguredStandardCenter(): BuildingCenter | undefined {
    const buildingConstants = BackendService.getBuildingConstants();

    if (this.isWheelchairLayoutActive() && buildingConstants.standardCenterWheelchairMode) {
      return buildingConstants.standardCenterWheelchairMode;
    }

    return buildingConstants.standardCenter;
  }

  private isWheelchairLayoutActive(): boolean {
    return getRequiredElement("uiWrapper").classList.contains("wheelchairMode");
  }

  refreshMapViewportConstraints(recenterToStandardCenter = false): void {
    this.updateStandardCenter();
    const bounds = this.expandBuildingBounds(this.getBuildingBounds());

    this.mapView.setViewportPadding({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
    this.mapView.setMaxBounds(bounds);
    this.mapView.setCenterConstraint(
      this.flatMode ? this.getCircularCenterConstraint(bounds) : this.getLockedCenterConstraint(),
    );

    if (recenterToStandardCenter) {
      this.centerCameraOnStandardCenter();
    }
  }

  lockMapCenterToStandardCenter(): void {
    this.updateStandardCenter();
    this.mapView.setCenterConstraint(this.getLockedCenterConstraint());
  }

  centerCameraOnStandardCenter(): void {
    const currentCameraPosition = this.camera.getPosition();

    this.camera.setCenterAndZoom(
      {
        x: this.standardCenter[0],
        y: this.standardCenter[1],
      },
      currentCameraPosition.zoom,
    );
  }

  handleLevelChange(newLevel: number): boolean {
    const animationDuration = getMotionDuration(1);

    if (!this.flatMode && this.isLevelTransitionRunning) return false;

    if (this.flatMode) {
      this.getIndoorLevel(this.currentLevel).hideAll();
      this.currentLevel = newLevel;
      this.getIndoorLevel(this.currentLevel).show2DView();
    } else {
      if (newLevel == this.currentLevel) {
        return true;
      }
      const oldLevel = this.getCurrentLevel();
      const oldLevelTop = this.getLevelAboveOrSelf(oldLevel);
      const oldLevelBottom = this.getLevelBelowOrSelf(oldLevel);

      const newLevelTop = this.getLevelAboveOrSelf(newLevel);
      const newLevelBottom = this.getLevelBelowOrSelf(newLevel);

      const initialHeightOldLevel = oldLevel == oldLevelBottom ? 0 : LEVEL_HEIGHT;
      const finalHeightNewLevel = newLevel == newLevelBottom ? 0 : LEVEL_HEIGHT;
      const difference = this.getLevelDifference(oldLevel, newLevel);
      const offset =
        oldLevel == oldLevelBottom ? -LEVEL_HEIGHT : newLevel == newLevelBottom ? LEVEL_HEIGHT : 0;

      const finalHeightOldLevel = initialHeightOldLevel - LEVEL_HEIGHT * difference - offset;
      const initialHeightNewLevel = finalHeightNewLevel + LEVEL_HEIGHT * difference + offset;

      [newLevel, newLevelTop, newLevelBottom]
        .filter((item) => ![oldLevel, oldLevelTop, oldLevelBottom].includes(item))
        .forEach((element) => {
          this.getIndoorLevel(element).show3DView();
        });
      const animationPromises = [
        this.getIndoorLevel(newLevel).animateAltitude(
          initialHeightNewLevel,
          finalHeightNewLevel,
          Math.abs(difference) == 1 ? OPACITY_TRANSLUCENT_LAYER : 0,
          1,
          animationDuration,
        ),
        this.getIndoorLevel(oldLevel).animateAltitude(
          initialHeightOldLevel,
          finalHeightOldLevel,
          1,
          Math.abs(difference) == 1 ? OPACITY_TRANSLUCENT_LAYER : 0,
          animationDuration,
        ),
      ];

      if (newLevel != newLevelBottom) {
        animationPromises.push(
          this.getIndoorLevel(newLevelBottom).animateAltitude(
            initialHeightNewLevel - LEVEL_HEIGHT,
            finalHeightNewLevel - LEVEL_HEIGHT,
            oldLevel == newLevelBottom
              ? 1
              : oldLevelTop == newLevelBottom
                ? OPACITY_TRANSLUCENT_LAYER
                : 0,
            OPACITY_TRANSLUCENT_LAYER,
            animationDuration,
          ),
        );
      }

      if (newLevel != newLevelTop && newLevelTop != oldLevel) {
        animationPromises.push(
          this.getIndoorLevel(newLevelTop).animateAltitude(
            initialHeightNewLevel + LEVEL_HEIGHT,
            finalHeightNewLevel + LEVEL_HEIGHT,
            oldLevel == newLevelTop
              ? 1
              : oldLevelBottom == newLevelTop
                ? OPACITY_TRANSLUCENT_LAYER
                : 0,
            OPACITY_TRANSLUCENT_LAYER,
            animationDuration,
          ),
        );
      }

      if (
        oldLevelBottom != newLevelTop &&
        oldLevelBottom != newLevel &&
        oldLevel != oldLevelBottom
      ) {
        animationPromises.push(
          this.getIndoorLevel(oldLevelBottom).animateAltitude(
            initialHeightOldLevel - LEVEL_HEIGHT,
            finalHeightOldLevel - LEVEL_HEIGHT,
            OPACITY_TRANSLUCENT_LAYER,
            0,
            animationDuration,
          ),
        );
      }

      if (oldLevelTop != newLevelBottom && oldLevelTop != newLevel && oldLevel != oldLevelTop) {
        animationPromises.push(
          this.getIndoorLevel(oldLevelTop).animateAltitude(
            initialHeightOldLevel + LEVEL_HEIGHT,
            finalHeightOldLevel + LEVEL_HEIGHT,
            OPACITY_TRANSLUCENT_LAYER,
            0,
            animationDuration,
          ),
        );
      }

      this.currentLevel = newLevel;
      this.isLevelTransitionRunning = true;
      LevelControl.setLevelSelectionDisabled(true);

      Promise.all(animationPromises)
        .then(() => {
          BackendService.getAllLevels()
            .filter((item) => ![newLevel, newLevelTop, newLevelBottom].includes(item))
            .forEach((item) => {
              this.getIndoorLevel(item).hideAll();
            });
        })
        .finally(() => {
          this.isLevelTransitionRunning = false;
          LevelControl.setLevelSelectionDisabled(false);
        });
    }

    const message = LevelService.getCurrentLevelDescription(this.currentLevel);
    DescriptionArea.update(message);
    return true;
  }

  // only support whole level differences
  getLevelDifference(level1: number, level2: number): number {
    return (
      BackendService.getAllLevels().indexOf(level1) - BackendService.getAllLevels().indexOf(level2)
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

  selectIndoorFeature(feature: GeoJSON.Feature): void {
    this.selectedFeatures = [getRequiredFeatureId(feature)];
    this.indoorLayers.forEach((layer) => layer.updateLayer());

    const levels = getFeatureLevels(feature);
    if (levels && levels.length > 0) {
      const selectedLevel = [...levels].sort(
        (a, b) => Math.abs(a - this.currentLevel) - Math.abs(b - this.currentLevel),
      )[0];
      if (this.handleLevelChange(selectedLevel)) {
        LevelControl.focusOnLevel(selectedLevel);
      }
    }

    const accessibilityDescription = FeatureService.getAccessibilityDescription(feature);
    DescriptionArea.update(accessibilityDescription);
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

  private getBuildingBounds(): MapBounds {
    const boundingBox = BackendService.getBoundingBox();

    return {
      west: getRequiredArrayValue(boundingBox, 0, "Building bounding box"),
      south: getRequiredArrayValue(boundingBox, 1, "Building bounding box"),
      east: getRequiredArrayValue(boundingBox, 2, "Building bounding box"),
      north: getRequiredArrayValue(boundingBox, 3, "Building bounding box"),
    };
  }

  private getCircularCenterConstraint(bounds: MapBounds): MapCenterConstraint {
    const center = {
      x: this.standardCenter[0],
      y: this.standardCenter[1],
    };
    const projectedCenter = {
      x: center.x,
      y: CoordinateHelpers.lat2y(center.y),
    };
    const radius = [
      [bounds.west, bounds.south],
      [bounds.west, bounds.north],
      [bounds.east, bounds.south],
      [bounds.east, bounds.north],
    ]
      .map(([x, y]) =>
        Math.hypot(x - projectedCenter.x, CoordinateHelpers.lat2y(y) - projectedCenter.y),
      )
      .reduce((max, distance) => Math.max(max, distance), Number.EPSILON);

    return {
      center,
      radius,
    };
  }

  private getLockedCenterConstraint(): MapCenterConstraint {
    return {
      center: {
        x: this.standardCenter[0],
        y: this.standardCenter[1],
      },
      radius: 0,
    };
  }

  private expandBuildingBounds(bounds: MapBounds): MapBounds {
    const lngSpan = Math.max(bounds.east - bounds.west, Number.EPSILON);
    const latSpan = Math.max(bounds.north - bounds.south, Number.EPSILON);
    const lngMargin = lngSpan * MAP_MIN_BOUNDS_MARGIN_FACTOR;
    const latMargin = latSpan * MAP_MIN_BOUNDS_MARGIN_FACTOR;

    return {
      west: bounds.west - lngMargin,
      south: Math.max(bounds.south - latMargin, -MAP_MAX_LATITUDE_BOUND),
      east: bounds.east + lngMargin,
      north: Math.min(bounds.north + latMargin, MAP_MAX_LATITUDE_BOUND),
    };
  }

  private getLevelAboveOrSelf(level: number): number {
    const levels = BackendService.getAllLevels();
    const index = levels.indexOf(level);

    if (index <= 0) return level;

    return getRequiredArrayValue(levels, index - 1, "Building levels");
  }

  private getLevelBelowOrSelf(level: number): number {
    const levels = BackendService.getAllLevels();
    const index = levels.indexOf(level);

    if (index == -1 || index >= levels.length - 1) return level;

    return getRequiredArrayValue(levels, index + 1, "Building levels");
  }
}
