import { BuildingInterface } from "../models/buildingInterface";
import { RawOverpassDataResponse } from "../services/httpService";
import { OsmGraph } from "../overpass/OsmGraph";
import { getRequiredArrayValue } from "../utils/requiredHelpers";
import { IndoorDoor } from "./elements/IndoorDoor";
import { IndoorRoom } from "./elements/IndoorRoom";
import { IndoorTactilePaving } from "./elements/IndoorTactilePaving";
import { IndoorWall } from "./elements/IndoorWall";

export interface RawOverpassGraphs {
  buildings: OsmGraph;
  indoor: OsmGraph;
}

export interface IndoorModel {
  rawOverpassData: RawOverpassDataResponse;
  graphs: RawOverpassGraphs;
  buildingInterface: BuildingInterface;
  outlineCoordinates: number[][];
  levels: number[];
  rooms: IndoorRoom[];
  doors: IndoorDoor[];
  walls: IndoorWall[];
  tactilePaving: IndoorTactilePaving[];
}

export function createIndoorModel(
  rawOverpassData: RawOverpassDataResponse,
  buildingInterface: BuildingInterface,
): IndoorModel {
  const graphs = {
    buildings: new OsmGraph(rawOverpassData.buildings),
    indoor: new OsmGraph(rawOverpassData.indoor),
  };
  const rooms = IndoorRoom.collectFromGraph(graphs.indoor);
  const doors = IndoorDoor.collectFromGraph(graphs.indoor);
  const walls = IndoorWall.collectFromGraph(graphs.indoor);
  const tactilePaving = IndoorTactilePaving.collectFromGraph(graphs.indoor);

  return {
    rawOverpassData,
    graphs,
    buildingInterface,
    outlineCoordinates: getBuildingOutlineCoordinates(buildingInterface),
    levels: collectIndoorLevels(rooms),
    rooms,
    doors,
    walls,
    tactilePaving,
  };
}

function collectIndoorLevels(rooms: IndoorRoom[]): number[] {
  const levels = new Set<number>();

  rooms.forEach((room) => room.levels.forEach((level) => levels.add(level)));

  return Array.from(levels).sort((a, b) => -a + b);
}

function getBuildingOutlineCoordinates(buildingInterface: BuildingInterface): number[][] {
  return getRequiredArrayValue(
    (buildingInterface.feature.geometry as GeoJSON.Polygon).coordinates,
    0,
    "Building outline coordinates",
  );
}
