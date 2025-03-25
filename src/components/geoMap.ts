import {
  INDOOR_LEVEL,
  MAP_START_LAT,
  MAP_START_LNG,
  CARTO_TILE_SERVER,
  CARTO_TILE_SUBDOMAINS,
  CARTO_ATTRIBUTION,
  LEVEL_HEIGHT,
  OPACITY_TRANSLUCENT_LAYER,
  SOCKET_SERVER
} from "../../public/strings/constants.json";
import LevelControl from "./ui/levelControl";
import DescriptionArea from "./ui/descriptionArea";
import BuildingService from "../services/buildingService";
import LoadingIndicator from "./ui/loadingIndicator";
import { IndoorLayer } from "./indoorLayer";
import AccessibilityService from "../services/accessibilityService";
import Accessibility from "../utils/makeAccessible";
import LevelService from "../services/levelService";
import ColorService from "../services/colorService";
import { lang } from "../services/languageService";
import FeatureService from "../services/featureService";
import * as Maptalks from "maptalks";
import levelService from "../services/levelService";
import backendService from "../services/backendService";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const io = require('socket.io-client');

export class GeoMap {
  mapInstance: Maptalks.Map = null;
  flatMapInstance: Maptalks.Map = null;
  currentLevel = INDOOR_LEVEL;
  indoorLayers: Map<string, IndoorLayer>;
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
  configMode = true; // set only during configuration of building constants

  state = {
    connected: false,
  };

  constructor() {
    console.log(backendService.getGeoJson())
    const buildingConstants = backendService.getBuildingConstants();
    this.standardZoom = buildingConstants["standardZoom"];
    this.maxZoom = buildingConstants["maxZoom"];
    this.minZoom = buildingConstants["minZoom"];
    this.standardBearing = buildingConstants["standardBearing"];
    this.standardBearing3DMode = buildingConstants["standardBearing3DMode"];
    this.standardPitch3DMode = buildingConstants["standardPitch3DMode"];
    this.standardZoom3DMode = buildingConstants["standardZoom3DMode"];

    this.mapInstance = new Maptalks.Map("map", {
      center: [parseFloat(MAP_START_LNG), parseFloat(MAP_START_LAT)],
      zoom: this.standardZoom,
      maxZoom: this.maxZoom,
      minZoom: this.minZoom,
      dragRotate: this.configMode,
      dragPitch: this.configMode,
      baseLayer: new Maptalks.TileLayer("carto", {
        urlTemplate: CARTO_TILE_SERVER,
        subdomains: CARTO_TILE_SUBDOMAINS,
        attribution: CARTO_ATTRIBUTION,
      }),
    });

    this.flatMapInstance = new Maptalks.Map("flatMap", {
      center: [parseFloat(MAP_START_LNG), parseFloat(MAP_START_LAT)],
      zoom: this.standardZoom,
      maxZoom: this.maxZoom,
      minZoom: this.minZoom,
      baseLayer: new Maptalks.TileLayer("carto", {
        urlTemplate: CARTO_TILE_SERVER,
        subdomains: CARTO_TILE_SUBDOMAINS,
        attribution: CARTO_ATTRIBUTION,
      }),
    });
    this.mapInstance
      .on("moveend", this.makeAccessible)
      .on("load", this.makeAccessible)
      .on("zoomend", this.makeAccessible);

    this.mapInstance.on("moving moveend", () => {
      this.flatMapInstance.setCenter(this.mapInstance.getCenter());
    });

    this.mapInstance.on("zooming zoomend", () => {
      if (this.configMode)
        console.log("zoom", this.mapInstance.getZoom());
      this.flatMapInstance.setCenterAndZoom(
        this.mapInstance.getCenter(),
        this.mapInstance.getZoom()
      );
    });

    this.mapInstance.on("rotate", () => {
      if (this.configMode)
        console.log("bearing", this.mapInstance.getBearing());
      this.flatMapInstance.setBearing(this.mapInstance.getBearing());
    });

    this.mapInstance.on("pitch", () => {
      if (this.configMode)
        console.log("pitch", this.mapInstance.getPitch());
    });

    this.makeAccessible();
    this.applyStyleFilters();

    const socket = io(SOCKET_SERVER);

    socket.on("connect", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.state.connected = true;
    });

    socket.on("disconnect", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.state.connected = false;
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    socket.on('UPDATE_COORDINATES', (data) => {
      const newCorners = data.corners; // Receive the new coordinates

      // Update the LineString with the new coordinates
      this.indoorLayers.forEach(
        (layer) => {
          if (layer.rectangleInstance && layer.level == data.level) {
            layer.rectangleInstance.clear();
            const rectangle = new Maptalks.Polygon(newCorners, {
              symbol: {
                polygonFill: "#000000",
                polygonOpacity: 0.0,
                lineColor: "#ff0000",
                lineWidth: 2
              }
            });
            layer.rectangleInstance.addGeometry(rectangle);
          }
        }
      )
    });
  }

  add(obj: Maptalks.Layer): Maptalks.Layer {
    return obj.addTo(this.mapInstance);
  }

  remove(obj: Maptalks.Layer): void {
    this.mapInstance.removeLayer(obj);
  }

  makeAccessible(): void {
    Accessibility.removeShadowPane();
    Accessibility.silenceTileImages();
    Accessibility.silenceMapMarkers();
    Accessibility.silenceLeafletAttribution();
    //accessibility.silenceZoomControls();
    //accessibility.silenceCenteringButton();
    Accessibility.silenceMapPane();
    //accessibility.silenceBottomLeafletControls();
  }

  showBuilding(): string {
    this.handleBuildingChange();
    this.centerMapToBuilding();

    return lang.searchBuildingFound;
  }

  handleBuildingChange(): void {
    LevelControl.handleChange();
    LevelService.clearData();

    this.currentLevel = "0";
    this.mapInstance.setBearing(this.standardBearing);

    this.indoorLayers = new Map(
      LevelService.getLevelNames()
        .reverse()
        .map((val) => [
          val,
          new IndoorLayer(LevelService.getLevelGeoJSON(val), val, 0),
        ])
    );
    this.indoorLayers.forEach((layer) => {
      layer.hideAll();
    });
    this.handleLevelChange("0");

    AccessibilityService.reset();

    const message = BuildingService.getBuildingDescription();
    DescriptionArea.update(message, "selectedBuilding");
  }

  centerMapToBuilding(): void {
    const ext = new Maptalks.Polygon(backendService.getBoundingBox()).getExtent();

    this.standardCenter = [ext.getCenter().x, ext.getCenter().y];

    this.mapInstance.animateTo(
      { center: ext.getCenter() },
      { duration: 350 }
    );
    setTimeout(() => {
      this.mapInstance.animateTo(
        {
          zoom: this.standardZoom
        },
        { duration: 350 }
      );
    }, 350);
    setTimeout(() => {
      // this.indoorLayer.animateAltitude(10, 0, 0, 0.25, 0.5)
      console.log(this.mapInstance.getCenter(), this.mapInstance.getZoom());
    }, 1000);
  }

  handleLevelChange(newLevel: string): void {
    const animationDuration = 1;

    if (this.flatMode) {
      this.indoorLayers.get(this.currentLevel).hideAll();
      this.currentLevel = newLevel;
      this.indoorLayers.get(this.currentLevel).hide3D();
    } else {
      if (newLevel == this.currentLevel) {
        return;
      }
      const oldLevel = this.getCurrentLevel();
      const oldLevelTop = levelService.getLevelNames()[0] == this.getCurrentLevel()
          ? this.getCurrentLevel()
          : levelService.getLevelNames()[levelService.getLevelNames().indexOf(this.getCurrentLevel()) - 1];
      const oldLevelBottom = levelService.getLevelNames()[levelService.getLevelNames().length - 1] == this.getCurrentLevel()
          ? this.getCurrentLevel()
          : levelService.getLevelNames()[levelService.getLevelNames().indexOf(this.getCurrentLevel()) + 1];

      const newLevelTop = levelService.getLevelNames()[0] == newLevel
          ? newLevel
          : levelService.getLevelNames()[levelService.getLevelNames().indexOf(newLevel) - 1];
      const newLevelBottom = levelService.getLevelNames()[levelService.getLevelNames().length - 1] == newLevel
          ? newLevel
          : levelService.getLevelNames()[levelService.getLevelNames().indexOf(newLevel) + 1];

      const initialHeightOldLevel = oldLevel == oldLevelBottom ? 0 : LEVEL_HEIGHT;
      const finalHeightNewLevel = newLevel == newLevelBottom ? 0 : LEVEL_HEIGHT;
      const difference = this.getLevelDifference(oldLevel, newLevel);
      const offset = oldLevel == oldLevelBottom ? -LEVEL_HEIGHT : newLevel == newLevelBottom ? LEVEL_HEIGHT : 0;

      const finalHeightOldLevel = initialHeightOldLevel - LEVEL_HEIGHT * difference - offset;
      const initialHeightNewLevel = finalHeightNewLevel + LEVEL_HEIGHT * difference + offset;

      [newLevel, newLevelTop, newLevelBottom].filter(item => ![oldLevel, oldLevelTop, oldLevelBottom].includes(item)).forEach(element => {
        this.indoorLayers.get(element).show3D();
      });
      setTimeout(() => {
        levelService.getLevelNames().filter(item => ![newLevel, newLevelTop, newLevelBottom].includes(item)).forEach(item => {
          this.indoorLayers.get(item).hideAll();
        })
      }, animationDuration * 1000);

      this.indoorLayers.get(newLevel).animateAltitude(initialHeightNewLevel, finalHeightNewLevel, Math.abs(difference) == 1 ? OPACITY_TRANSLUCENT_LAYER : 0, 1, animationDuration);
      this.indoorLayers.get(oldLevel).animateAltitude(initialHeightOldLevel, finalHeightOldLevel, 1, Math.abs(difference) == 1 ? OPACITY_TRANSLUCENT_LAYER : 0, animationDuration);

      if (newLevel != newLevelBottom) {
        this.indoorLayers.get(newLevelBottom).animateAltitude(initialHeightNewLevel - LEVEL_HEIGHT, finalHeightNewLevel - LEVEL_HEIGHT, oldLevel == newLevelBottom ? 1 : oldLevelTop == newLevelBottom ? OPACITY_TRANSLUCENT_LAYER : 0, OPACITY_TRANSLUCENT_LAYER, animationDuration);
      }

      if (newLevel != newLevelTop && newLevelTop != oldLevel) {
        this.indoorLayers.get(newLevelTop).animateAltitude(initialHeightNewLevel + LEVEL_HEIGHT, finalHeightNewLevel + LEVEL_HEIGHT, oldLevel == newLevelTop ? 1 : oldLevelBottom == newLevelTop ? OPACITY_TRANSLUCENT_LAYER : 0, OPACITY_TRANSLUCENT_LAYER, animationDuration);
      }

      if (oldLevelBottom != newLevelTop && oldLevelBottom != newLevel && oldLevel != oldLevelBottom) {
        this.indoorLayers.get(oldLevelBottom).animateAltitude(initialHeightOldLevel - LEVEL_HEIGHT, finalHeightOldLevel - LEVEL_HEIGHT, OPACITY_TRANSLUCENT_LAYER, 0, animationDuration);
      }

      if (oldLevelTop != newLevelBottom && oldLevelTop != newLevel && oldLevel != oldLevelTop) {
        this.indoorLayers.get(oldLevelTop).animateAltitude(initialHeightOldLevel + LEVEL_HEIGHT, finalHeightOldLevel + LEVEL_HEIGHT, OPACITY_TRANSLUCENT_LAYER, 0, animationDuration);
      }

      this.currentLevel = newLevel;
    }

    const message = LevelService.getCurrentLevelDescription();
    DescriptionArea.update(message);
  }

  // only support whole level differences
  getLevelDifference(level1: string, level2: string): number {
    return (
      levelService.getLevelNames().indexOf(level1) -
      levelService.getLevelNames().indexOf(level2)
    );
  }

  getCurrentLevel(): string {
    return this.currentLevel;
  }

  handleIndoorSearch(searchString: string): void {
    if (searchString) {
      const results = BuildingService.runIndoorSearch(searchString);
      if (results.length != 0) {
        this.selectedFeatures = results.map((feature) => feature.id.toString());
        this.indoorLayers.forEach((layer) => layer.updateLayer());

        const selectedLevel = results[0].properties.level.toString();
        LevelControl.focusOnLevel(selectedLevel);
        this.handleLevelChange(selectedLevel);

        const feature = results[0];
        const accessibilityDescription =
          FeatureService.getAccessibilityDescription(feature);
        DescriptionArea.update(accessibilityDescription);
      } else LoadingIndicator.error(lang.searchNotFound);
    } else LoadingIndicator.error(lang.searchEmpty);
  }

  applyStyleFilters = (): void => {
    this.mapInstance
      .getBaseLayer()
      .setOpacity(ColorService.getEnvOpacity() / 100);
    document.getElementById("map").style.filter = `saturate(${
      (ColorService.getColorStrength() * 2) / 100
    })`;

    //wall weight rendered per feature -> feature service
  };
}
