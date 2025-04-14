import * as Maptalks from "maptalks";
import { BuildingInterface } from "../models/buildingInterface";
import BuildingService from "./buildingService";
import HttpService from "./httpService";
import * as BuildingConstantsDefinition from "../../public/strings/buildingConstants.json";
import CoordinateHelpers from "../utils/coordinateHelpers";
import { extractLevels } from "../utils/extractLevels";
import DoorService from "./doorService";

let buildingConstants: Record<string, number>;
let buildingDescription = "";
let geoJson: GeoJSON.FeatureCollection;
const allLevels = new Set<number>();

let buildingInterface: BuildingInterface;

async function fetchBackendData(): Promise<void> {
  await HttpService.fetchOverpassData();

  const currentBuilding = "APB";

  buildingInterface = await BuildingService.handleSearch(BuildingConstantsDefinition[currentBuilding].SEARCH_STRING);	

  // filter indoor elements by bounds of building
  if (buildingInterface !== undefined) {
    geoJson = BuildingService.filterByBounds(
      HttpService.getIndoorData(),
      buildingInterface.boundingBox
    );
  }

  console.log("BuildingService", structuredClone(geoJson));

  // rewrite the geojson so that 
  geoJson.features.forEach(
    (feature) => {
      if (!["Polygon", "LineString"].includes(feature.geometry.type)) { // only use geometries for levels that are actually drawn
        return;
      }

      const levels = extractLevels(feature.properties.level);
      feature.properties.level = levels.map((val) => val.toString());

      levels.forEach((l) => allLevels.add(l));
    }
  )

  // initialize doors
  geoJson.features.forEach(
    (feature) => {
      if (feature.geometry.type != "Point")
        return;

      if (!("door" in feature.properties) || feature.properties.door == "no")
        return

      const levels = new Set<string>();
      extractLevels(feature.properties.level ?? "").forEach(l => levels.add(l.toString()));
      extractLevels(feature.properties.repeat_on ?? "").forEach(l => levels.add(l.toString()));
      DoorService.addDoor(feature.geometry.coordinates, levels, feature.properties);
    }
  )
  // Add rooms to the doors
  geoJson.features.forEach(
    (feature) => {
      if (feature.geometry.type == "Polygon" && "indoor" in feature.properties && feature.properties["indoor"] != "pathway" && feature.properties["area"] != "no") {
        const coords = feature.geometry.coordinates[0].slice(1);
        for (let i = 0; i < coords.length; i++) {
          const coord = coords.at(i);
          if (DoorService.checkIfDoorExists(coord)) {
            DoorService.addRoomToDoor(coord, feature);
            // to correctly rotate door, it must be in line with previous and next coordinate
            const prev = coords.at(i - 1);
            const after = coords.at((i + 1) % coords.length);
            DoorService.calculateDoorOrientation(coord, prev, after);
          }
        }
      }
    }
  )
  
  // build building description
  if (buildingInterface.feature.properties.name !== undefined) {
    buildingDescription += buildingInterface.feature.properties.name;
  
    if (buildingInterface.feature.properties.loc_ref !== undefined) {
      buildingDescription += " (" + buildingInterface.feature.properties.loc_ref + ")";
    }
  }

  // calculate bearing, take two points and orient the map so that both points have a vertical line and point 1 is below (!!!) point 2
  // Then add BEARING_OFFSET (usually 90deg) rotated counterclockwise, so that the line between the points is horizontal again.
  const p1 = (
    geoJson.features.find((feature) => feature.id == "node/" + BuildingConstantsDefinition[currentBuilding].BEARING_CALC_NODE1)
    .geometry as GeoJSON.Point
  ).coordinates;
  const p2 = (
    geoJson.features.find((feature) => feature.id == "node/" + BuildingConstantsDefinition[currentBuilding].BEARING_CALC_NODE2)
    .geometry as GeoJSON.Point
  ).coordinates;

  const standardBearing =((
    // angle of the line between the two points
    Math.atan2(
      p2[0] - p1[0],
      // we need to use mercator projection for the latitude
      CoordinateHelpers.lat2y(p2[1]) - CoordinateHelpers.lat2y(p1[1])
    ) * (180 / Math.PI) + BuildingConstantsDefinition[currentBuilding].BEARING_OFFSET
  // angle is between 0 and 360 after calculation (might even be above 360), maptalks needs it between -180 and 180
  + 180) % 360) - 180;

  buildingConstants = {
    "standardZoom": BuildingConstantsDefinition[currentBuilding].STANDARD_ZOOM,
    "maxZoom": BuildingConstantsDefinition[currentBuilding].MAX_ZOOM,
    "minZoom": BuildingConstantsDefinition[currentBuilding].MIN_ZOOM,
    "standardBearing": standardBearing,
    "standardBearing3DMode": BuildingConstantsDefinition[currentBuilding].STANDARD_BEARING_3D_MODE,
    "standardPitch3DMode": BuildingConstantsDefinition[currentBuilding].STANDARD_PITCH_3D_MODE,
    "standardZoom3DMode": BuildingConstantsDefinition[currentBuilding].STANDARD_ZOOM_3D_MODE
  }
}

function getOutline(): number[][] {
  return (buildingInterface.feature.geometry as GeoJSON.Polygon).coordinates[0];
}

function getBuildingConstants(): Record<string, number> {
  return buildingConstants;
}

function getBuildingDescription(): string {
  return buildingDescription;
}

function getGeoJson(): GeoJSON.FeatureCollection {
  return geoJson;
}

function getAllLevels(): number[] {
  return Array.from(allLevels).sort((a, b) => -a + b); // reverse order
}

function getBoundingBoxExtent(): Maptalks.Extent {
  return new Maptalks.Extent(
    buildingInterface.boundingBox[0],
    buildingInterface.boundingBox[1],
    buildingInterface.boundingBox[2],
    buildingInterface.boundingBox[3]
  );
}

export default {
  getOutline,
  getBuildingConstants,
  getBuildingDescription,
  getGeoJson,
  getBoundingBoxExtent,
  fetchBackendData,
  getAllLevels
};