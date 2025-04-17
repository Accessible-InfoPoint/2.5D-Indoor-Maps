import DescriptionArea from "./ui/descriptionArea";
import FeatureService from "../services/featureService";
import LevelService from "../services/levelService";
import { geoMap } from "../main";
import ColorService, { colors } from "../services/colorService";
import {
  MARKERS_IMG_DIR,
  ICONS,
} from "../../public/strings/constants.json";
import {
  STAIRCASE_OPACITY,
  STAIRCASE_OUTLINE_OPACITY,
  LEVEL_HEIGHT
} from "../../public/strings/settings.json";
import * as Maptalks from "maptalks";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import PolygonCenter from "geojson-polygon-center";
import { MarkerClusterLayer } from "./markerClusterLayer";
import { BaseObject, ThreeLayer } from "maptalks.three";
import { simpleStaircase } from "./threejs/simpleStaircase";
import {
  complexStaircase,
  filterConnectedPathways,
} from "./threejs/complexStaircase";
import BuildingService from "../services/buildingService";
import { DoubleSide, MeshBasicMaterial, Plane, Vector3 } from "three";
import BackendService from "../services/backendService";
import UserService from "../services/userService";
import { UserGroupEnum } from "../models/userGroupEnum";
import DoorService from "../services/doorService";
import { DoorDataInterface } from "../models/doorDataInterface";


export class IndoorLayer {
  // Layers
  private readonly roomsInstance: Maptalks.VectorLayer;
  private readonly roomNumbersInstance: Maptalks.VectorLayer;
  private readonly doorsInstance: Maptalks.VectorLayer;
  private readonly outlineInstance: Maptalks.VectorLayer;
  private readonly positionLayer: Maptalks.VectorLayer;
  private readonly markers: MarkerClusterLayer;
  private threeLayer: ThreeLayer;
  // meshes and materials for threeJs
  meshes: BaseObject[] = [];
  levelDiff: string;

  staircaseMaterial = new MeshBasicMaterial({
    color: colors.stairsColor,
    opacity: STAIRCASE_OPACITY,
    transparent: true,
    side: DoubleSide,
  });
  staircaseOutlineMaterial = new MeshBasicMaterial({
    color: colors.stairsColor,
    opacity: STAIRCASE_OUTLINE_OPACITY,
    transparent: true,
    side: DoubleSide,
  });
  staircaseSelectedMaterial = new MeshBasicMaterial({
    color: colors.roomColorS,
    opacity: STAIRCASE_OPACITY,
    transparent: true,
    side: DoubleSide,
  });
  staircaseSelectedOutlineMaterial = new MeshBasicMaterial({
    color: colors.roomColorS,
    opacity: STAIRCASE_OUTLINE_OPACITY,
    transparent: true,
    side: DoubleSide,
  });

  altitude: number;
  level: string;

  constructor(geoJSON: GeoJSON.FeatureCollection, level = "", altitude = 0) {
    // initialize level (as ID) and altitude
    this.altitude = altitude;
    this.level = level;

    this.roomsInstance = new Maptalks.VectorLayer("indoor" + level, undefined, {
      enableAltitude: true /* cssFilter: "grayscale(50%)"*/,
    });
    this.roomNumbersInstance = new Maptalks.VectorLayer(
      "roomNumbers" + level,
      undefined,
      {
        enableAltitude: true,
        altitude: altitude,
        minZoom: 20.5,
      }
    );
    this.doorsInstance = new Maptalks.VectorLayer("doors" + level, undefined, {
      enableAltitude: true,
      altitude: altitude,
    });
    this.positionLayer = new Maptalks.VectorLayer(
      "positionLayer" + level,
      undefined,
      {
        enableAltitude: true,
        altitude: altitude,
      }
    );
    this.outlineInstance = new Maptalks.VectorLayer(
      "outline" + level,
      undefined,
      {
        enableAltitude: true,
        altitude: altitude
      }
    );

    // define options for markerClusterLayer, especially default symbol
    this.markers = new MarkerClusterLayer(
      "markerCluster" + level,
      this,
      undefined,
      {
        symbol: {
          markerFile: MARKERS_IMG_DIR + ICONS.ADDITIONAL,
          markerWidth: 48,
          markerHeight: 48,
          markerHorizontalAlignment: "middle",
          markerVerticalAlignment: "middle",
        },
      },
      {
        enableAltitude: true,
        altitude: altitude,
      }
    );

    this.threeLayer = new ThreeLayer("stairs" + level, {
      forceRenderOnMoving: true,
      forceRenderOnRotating: true,
    });

    // draw layer and room labels
    this.drawIndoorLayerByGeoJSON(geoJSON);
    this.drawDoors(DoorService.getDoorsByLevel(level));
    // add layers to map instance
    this.roomsInstance = this.roomsInstance.addTo(geoMap.mapInstance);
    this.roomNumbersInstance = this.roomNumbersInstance.addTo(geoMap.mapInstance);
    this.doorsInstance = this.doorsInstance.addTo(geoMap.mapInstance);
    this.outlineInstance = this.outlineInstance.addTo(geoMap.mapInstance);
    this.threeLayer = this.threeLayer.addTo(geoMap.mapInstance);
    this.markers = this.markers.addTo(geoMap.mapInstance);
    this.positionLayer.addTo(geoMap.mapInstance);
  }

  /**
   * Clear all layers, as threeLayer does not support this feature it is deleted and created new
   */
  clearIndoorLayer(): void {
    this.roomsInstance.clear();
    this.roomNumbersInstance.clear();
    this.doorsInstance.clear();
    this.markers.clear();
    this.positionLayer.clear();
    this.outlineInstance.clear();
    const tempVisibility = this.threeLayer.isVisible();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    geoMap.mapInstance.removeLayer(this.threeLayer);
    this.threeLayer = new ThreeLayer("stairs" + this.level, {
      forceRenderOnMoving: true,
      forceRenderOnRotating: true,
    });
    if (!tempVisibility) {
      this.threeLayer.hide();
    }
    this.threeLayer = this.threeLayer.addTo(geoMap.mapInstance);
  }

  /**
   * Redraws all layers
   */
  updateLayer(): void {
    this.clearIndoorLayer();
    this.drawIndoorLayerByGeoJSON(LevelService.getLevelGeoJSON(this.level));
    this.drawDoors(DoorService.getDoorsByLevel(this.level));
  }

  /**
   * Hides all layers and resets altitude and opacity
   */
  hideAll(): void {
    this.threeLayer.hide();
    this.outlineInstance.hide();
    this.doorsInstance.hide();
    this.markers.getLayer().hide();
    this.roomNumbersInstance.hide();
    this.roomsInstance.hide();
    this.positionLayer.hide();
    this.setAltitudeAndOpacity(0, 1);
  }

  /**
   * Shows all layers and resets altitude and opacity
   */
  showAll(): void {
    this.threeLayer.show();
    this.outlineInstance.show();
    this.doorsInstance.show();
    this.markers.getLayer().show();
    this.roomNumbersInstance.show();
    this.roomsInstance.show();
    this.positionLayer.show();
    this.setAltitudeAndOpacity(0, 1);
  }

  /**
   * Hides all 3D layers and shows 2D layers and resets altitude and opacity
   */
  hide3D(): void {
    this.threeLayer.hide();
    this.outlineInstance.hide();
    this.doorsInstance.show();
    this.markers.getLayer().show();
    this.roomNumbersInstance.show();
    this.roomsInstance.show();
    this.positionLayer.show();
    this.setAltitudeAndOpacity(0, 1);
  }

  /**
   * Hides all 2D layers and shows 3D layers and resets altitude and opacity
   */
  show3D(): void {
    this.threeLayer.show();
    this.outlineInstance.show();
    this.doorsInstance.hide();
    this.markers.getLayer().hide();
    this.roomNumbersInstance.hide();
    this.roomsInstance.hide();
    this.positionLayer.show();
    this.setAltitudeAndOpacity(0, 0);
  }

  /**
   * Draws on all layers
   */
  private drawIndoorLayerByGeoJSON(geoJSON: GeoJSON.FeatureCollection) {
    this.markers.clear();

    // filter out all positions of doors
    const doors = geoJSON.features
      .filter((feature) => "door" in feature.properties)
      .map((feature) => (feature.geometry as GeoJSON.Point).coordinates);

    // add building outline to outlineLayer
    const outlineGeo = new Maptalks.Polygon(BackendService.getOutline());
    outlineGeo.updateSymbol({ polygonFill: "#4d4d4d", polygonOpacity : 0.8});
    this.outlineInstance.addGeometry(outlineGeo);

    // decide for each feature whether to draw and in which layer
    geoJSON.features.forEach((feature) => {
      // set position of infoPoint
      if (feature.properties["information"] == "tactile_map") {
        geoMap.infoPoint = feature;
        new Maptalks.Marker((feature.geometry as GeoJSON.Point).coordinates, {
          properties: {
            name: "i",
          },
          symbol: [
            {
              markerType: "pin",
              markerFill: "rgb(255, 195, 195)",
              markerLineColor: "#000000",
              markerLineWidth: 2,
              markerWidth: 80,
              markerHeight: 70,
            } as Maptalks.VectorMarkerSymbol,
            {
              textFaceName: "sans-serif",
              textName: "{name}",
              textSize: 18,
              textDy: -35,
            } as Maptalks.TextSymbol,
          ],
        }).addTo(this.positionLayer);
      }

      // polygons, which are indoor can be rooms and areas
      // OSM does not encode anything in the geometry type, pathways (stair-middle-line) and tactile paving might also be classified as polygons, when the start and end point is the same
      if (feature.geometry.type == "Polygon" && "indoor" in feature.properties && feature.properties["indoor"] != "pathway" && feature.properties["area"] != "no") { // TODO: move to helper function as it is reused in backendService
        const geo = Maptalks.GeoJSON.toGeometry(feature);
        // set the specified style
        geo.updateSymbol(FeatureService.getFeatureStyle(feature));
        // if room is currently selected
        if (geoMap.selectedFeatures.includes(feature.id.toString())) {
          // color room in selected color and set pattern if in wheelchair mode and room is wheelchair accessible
          let pattern_fill: string = null;
          if ("wheelchair" in feature.properties && feature.properties["wheelchair"] == "yes") {
            const lineWidth = FeatureService.getWallWeight(feature) + ColorService.getLineThickness() / 20;
            const size = lineWidth <= 2 ? "small" : (lineWidth <= 4 ? "medium" : "large");
            pattern_fill = "/images/pattern_fill/" + ColorService.getCurrentProfile() + "_" + size + "_roomColorS.png";
          }
          geo.updateSymbol({
            polygonFill: colors.roomColorS,
            polygonPatternFile: pattern_fill,
          });

          // calculate difference between this level and level of infoPoint
          if (geoMap.infoPoint != null) {
            const diff = parseFloat(this.level) - parseFloat(geoMap.infoPoint.properties.level);
            if (diff > 0) {
              this.levelDiff = "+" + diff.toString();
            } else {
              this.levelDiff = diff.toString();
            }
          } else {
            this.levelDiff = "";
          }

          // if feature is in multiple levels, we only want to display the position marker on the nearest layer to the current position (infoPoint)
          if (
            !Array.isArray(feature.properties["level"]) ||
            Math.min(...(feature.properties["level"] as string[]).map(level => Math.abs(parseFloat(level) - parseFloat(geoMap.infoPoint.properties.level)))).toString() == this.levelDiff
          ) {
            // add position Marker of selected room
            new Maptalks.Marker(PolygonCenter(feature.geometry).coordinates, {
              properties: { name: this.levelDiff },
              symbol: [
                {
                  markerType: "pin",
                  markerFill: "rgb(195, 255, 195)",
                  markerLineColor: "#000000",
                  markerLineWidth: 2,
                  markerWidth: 80,
                  markerHeight: 70,
                } as Maptalks.VectorMarkerSymbol,
                {
                  textFaceName: "sans-serif",
                  textName: "{name}",
                  textSize: 18,
                  textDy: -35,
                } as Maptalks.TextSymbol,
              ],
            }).addTo(this.positionLayer);
          }
          // add selected room to outline
          this.outlineInstance.addGeometry(geo.copy());
        }
        // add to outline if feature is corridor, area, elevator or stairs
        if ((feature.properties["indoor"] == "corridor" || feature.properties["indoor"] == "area" || feature.properties["highway"] == "elevator" || feature.properties["stairs"] == "yes") && !geoMap.selectedFeatures.includes(feature.id.toString())) {
          this.outlineInstance.addGeometry(geo.copy());
        }
        geo.on("click", () => this.handleClick(feature)); // select feature when clicked
        this.roomsInstance.addGeometry(geo);
        this.showRoomNumber(feature); // generate room number / name
        this.addMarker(feature); // add accessibility marker for certain rooms
      } else if (feature.properties["tactile_paving"]) {
        // tactile paving is only allowed LineString
        const geo = Maptalks.GeoJSON.toGeometry(feature);
        const style = FeatureService.getFeatureStyle(feature);
        style["polygonOpacity"] = 0;
        style["lineDasharray"] = [10, 10];
        geo.updateSymbol(style);
        this.roomsInstance.addGeometry(geo);
      } else if (feature.geometry.type == "Point") {
        // usually doors
        this.addMarker(feature);
      } else {
        // console.log(feature)
        // We don't look at these points, maybe in future? (TODO)
      }
    });
    this.markers.updateMarkers();

    // section for staircases
    // closed staircases (also called simple) are defined by rooms that are also stairs
    // open staircases (complex) are defined by being areas and therefore not enclosed by walls

    // filter some features
    // lowestPoints is needed for complex staircases (pathWays in the middle defines the stair, lowest point is the starting point of that stair)
    // allNodes is nodes of all levels, usually you only get geojson of the current level
    const lowestPoints = BuildingService.getBuildingGeoJSON().features.filter(
      (feature) => "point:lowest" in feature.properties
    );
    const pathways = geoJSON.features.filter(
      (feature) =>
        "indoor" in feature.properties &&
        feature.properties["indoor"] == "pathway"
    );
    const allNodes = BuildingService.getBuildingGeoJSON().features.filter(
      (feature) => feature.geometry.type == "Point"
    );

    const onclick = (feature: GeoJSON.Feature) => this.handleClick(feature); // onclick for threejs objects

    // cache some variables and consts, as this changes inside the anonymous function
    const meshes: BaseObject[] = [];
    const material1 = this.staircaseMaterial;
    const material2 = this.staircaseOutlineMaterial;
    const selectedMaterial1 = this.staircaseSelectedMaterial;
    const selectedMaterial2 = this.staircaseSelectedOutlineMaterial;
    const altitude = this.altitude;
    const selected = geoMap.selectedFeatures;
    const level = this.level;

    this.threeLayer.prepareToDraw = function() {
      this.getRenderer().context.clippingPlanes = [new Plane(new Vector3(0, 0, -1), this.altitudeToVector3(2.25 * LEVEL_HEIGHT, 2.25 * LEVEL_HEIGHT).x)];

      // add simple staircases
      meshes.push(
        // filter out staircases on top level
        // when something is level 0-3, it is represented as [0, 1, 2, 3], but level 3 should not have it displayed
        ...geoJSON.features.filter(feat => 
          FeatureService.isSimpleStaircase(feat) &&
          (
            !Array.isArray(feat.properties.level) ||
            Array.isArray(feat.properties.level) &&
            (feat.properties.level.at(-1) != level)
          )
        ).filter(feat =>
          UserService.getCurrentProfile() != UserGroupEnum.wheelchairUsers ||
          (
            UserService.getCurrentProfile() == UserGroupEnum.wheelchairUsers &&
            "wheelchair" in feat.properties && feat.properties["wheelchair"] == "yes"
          )
        ).flatMap(feature => 
          simpleStaircase( // generate simpleStaircase from this geometry
            (feature.geometry as GeoJSON.Polygon).coordinates[0],
            altitude,
            selected.includes(feature.id.toString()) ? selectedMaterial1 : material1,
            selected.includes(feature.id.toString()) ? selectedMaterial2 : material2,
            this,
            () => onclick(feature)
          )
        )
      );
      // add complex staircases
      geoJSON.features.filter(feat => 
        FeatureService.isComplexStaircase(feat) &&
        (
          !Array.isArray(feat.properties.level) ||
          Array.isArray(feat.properties.level) &&
          (feat.properties.level.at(-1) != level)
        )
      ).filter(feat =>
        UserService.getCurrentProfile() != UserGroupEnum.wheelchairUsers ||
        (
          UserService.getCurrentProfile() == UserGroupEnum.wheelchairUsers &&
          "wheelchair" in feat.properties && feat.properties["wheelchair"] == "yes"
        )
      ).forEach(feature => {
        meshes.push( // complex staircases generate multiple meshes (bottom and 2 sides)
          ...complexStaircase(
            filterConnectedPathways(feature, doors, lowestPoints, pathways, level),
            allNodes,
            altitude,
            selected.includes(feature.id.toString()) ? selectedMaterial1 : material1,
            this,
            () => onclick(feature)
          )
        );
      });
      this.addMesh(meshes);
    }

    // also save references to meshes directly for changing altitude later
    this.meshes = meshes;
    this.meshes.forEach((mesh) => mesh.setAltitude(altitude));
  }

  private drawDoors(doors: DoorDataInterface[]): void {
    doors.forEach(door => {
      if (door.rooms.length == 0) {
        console.log("empty door", door);
        return;
      }
      let color = "";

      if (door.rooms.every(feature => ["corridor", "area"].includes(feature.properties.indoor)))
        color = FeatureService.getFeatureStyle(Array.from(door.rooms)[0])["polygonFill"] // if every room connected is a corridor or an area (for rooms bordering an area), we draw it in corridor color
      else
        color = FeatureService.getFeatureStyle(Array.from(door.rooms).filter(feature => !["corridor", "area"].includes(feature.properties.indoor))[0])["polygonFill"] // else we draw it in the color of the not-corridor (or not-area)

      if (door.rooms.some(feature => geoMap.selectedFeatures.includes(feature.id.toString())))
        color = colors.roomColorS; // at least one room is selected, color door in selected room color

      const doorLine = new Maptalks.LineString(
        door.orientation,
        {
          symbol: {
            lineColor: color,
            lineWidth: FeatureService.getFeatureStyle(Array.from(door.rooms)[0])["lineWidth"],
          },
        }
      );
      this.doorsInstance.addGeometry(doorLine);
    })
  }

  /**
   * Add correct accessibility marker
   */
  private addMarker(feature: GeoJSON.Feature<any, any>): void {
    const marker = FeatureService.getAccessibilityMarker(feature);
    if (marker) {
      marker.setId(feature.id.toString());
      this.markers.addMarkers({ marker: marker, feature: feature });
    }
  }

  /**
   * Add Text-Marker to center of feature, if feature contains a room identifier
   */
  private showRoomNumber(feature: GeoJSON.Feature<any, any>): void {
    const {
      indoor,
      stairs,
      ref: roomNo,
      handrail,
      amenity,
    } = feature.properties;

    //only rooms; no toilets/..
    if (roomNo && indoor == "room" && !amenity && !handrail && !stairs) {
      new Maptalks.Marker(PolygonCenter(feature.geometry).coordinates, {
        symbol: {
          textName: roomNo,
          textHorizontalAlignment: "middle",
          textVerticalAlignment: "middle",
          textFill: "#000",
          textOpacity: 1,
          textHaloFill: "#fff",
          textHaloRadius: 5,
        } as Maptalks.TextSymbol,
      }).addTo(this.roomNumbersInstance);
    }
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
    let startTime: number | null = null;
    const layers = [
      this.positionLayer,
      this.outlineInstance,
    ];
    const threelayer = this.threeLayer;
    const meshes = this.meshes;
    const material1 = this.staircaseMaterial;
    const material2 = this.staircaseOutlineMaterial;
    const selectedMaterial1 = this.staircaseSelectedMaterial;
    const selectedMaterial2 = this.staircaseSelectedOutlineMaterial;
    this.altitude = end;

    function easeOutCubic(x: number): number {
      return 1 - Math.pow(1 - x, 3);
    }

    function animate(time: number) {
      if (!startTime) startTime = time;
      const elapsed = (time - startTime) / 1000; // convert to seconds
      const progress = Math.min(elapsed / duration, 1);

      const altitude = start + easeOutCubic(progress) * (end - start);
      const opacity = opacityStart + progress * (opacityEnd - opacityStart);

      layers.forEach((l) => l.setOptions({ altitude, opacity }));
      meshes.forEach((mesh) => {
        mesh.setAltitude(altitude);
      });
      threelayer.renderScene();
      material1.opacity = opacity * STAIRCASE_OPACITY;
      material2.opacity = opacity * STAIRCASE_OUTLINE_OPACITY;
      selectedMaterial1.opacity = opacity * STAIRCASE_OPACITY;
      selectedMaterial2.opacity = opacity * STAIRCASE_OUTLINE_OPACITY;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame((time) => {
        startTime = time;
        animate(time);
        setTimeout(resolve, duration * 1000); // resolve after the duration
      });
    });
  }

  /**
   * Set altitude and opacity after animating it, it usually stays at 0 opacity and is set again with this function
   */
  setAltitudeAndOpacity(altitude: number, opacity: number): void {
    [this.roomsInstance, this.roomNumbersInstance, this.doorsInstance, this.markers.getLayer()].forEach((l) => l.setOptions({ altitude, opacity }));
  }
}
