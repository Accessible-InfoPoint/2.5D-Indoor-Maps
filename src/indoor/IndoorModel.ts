import { BuildingInterface } from "../models/buildingInterface";
import { RawOverpassDataResponse } from "../services/httpService";
import { OsmGraph } from "../overpass/OsmGraph";
import { getRequiredArrayValue } from "../utils/requiredHelpers";
import { IndoorColumn } from "./elements/IndoorColumn";
import { IndoorDoor } from "./elements/IndoorDoor";
import { IndoorInfoPoint } from "./elements/IndoorInfoPoint";
import { IndoorLanding } from "./elements/IndoorLanding";
import { IndoorPointFeature } from "./elements/IndoorPointFeature";
import { IndoorRoom } from "./elements/IndoorRoom";
import { IndoorStairPathway } from "./elements/IndoorStairPathway";
import { IndoorTactilePaving } from "./elements/IndoorTactilePaving";
import { IndoorWall } from "./elements/IndoorWall";
import {
  buildIndoorVerticalConnections,
  IndoorVerticalConnection,
} from "./verticalConnections/IndoorVerticalConnection";
import { IndoorStairPathNetwork } from "./verticalConnections/IndoorStairPathNetwork";

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
  columns: IndoorColumn[];
  infoPoints: IndoorInfoPoint[];
  pointFeatures: IndoorPointFeature[];
  walls: IndoorWall[];
  tactilePaving: IndoorTactilePaving[];
  stairPathways: IndoorStairPathway[];
  stairLandings: IndoorLanding[];
  stairPathNetwork: IndoorStairPathNetwork;
  verticalConnections: IndoorVerticalConnection[];
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
  const columns = IndoorColumn.collectFromGraph(graphs.indoor);
  const infoPoints = IndoorInfoPoint.collectFromGraph(graphs.indoor);
  const pointFeatures = IndoorPointFeature.collectFromGraph(graphs.indoor);
  const walls = IndoorWall.collectFromGraph(graphs.indoor);
  const tactilePaving = IndoorTactilePaving.collectFromGraph(graphs.indoor);
  const stairPathways = IndoorStairPathway.collectFromGraph(graphs.indoor);
  const stairLandings = IndoorLanding.collectFromGraph(graphs.indoor);
  const stairPathNetwork = new IndoorStairPathNetwork(stairPathways, stairLandings);
  const verticalConnections = buildIndoorVerticalConnections(
    graphs.indoor,
    rooms,
    stairPathNetwork,
  );
  console.log(verticalConnections);

  return {
    rawOverpassData,
    graphs,
    buildingInterface,
    outlineCoordinates: getBuildingOutlineCoordinates(buildingInterface),
    levels: collectIndoorLevels(rooms),
    rooms,
    doors,
    columns,
    infoPoints,
    pointFeatures,
    walls,
    tactilePaving,
    stairPathways,
    stairLandings,
    stairPathNetwork,
    verticalConnections,
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
