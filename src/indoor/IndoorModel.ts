import { BuildingInterface } from "../models/buildingInterface";
import { RawOverpassDataResponse } from "../services/httpService";
import { OsmGraph } from "../overpass/OsmGraph";
import { IndoorColumn } from "./elements/IndoorColumn";
import { IndoorDoor } from "./elements/IndoorDoor";
import { IndoorHandrail } from "./elements/IndoorHandrail";
import { IndoorInfoPoint } from "./elements/IndoorInfoPoint";
import { IndoorLanding } from "./elements/IndoorLanding";
import { IndoorLevelOutline } from "./elements/IndoorLevelOutline";
import { IndoorPointFeature } from "./elements/IndoorPointFeature";
import { IndoorRoom } from "./elements/IndoorRoom";
import { IndoorStepArea } from "./elements/IndoorStepArea";
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
  levels: number[];
  levelLabels: Map<number, string>;
  levelOutlines: IndoorLevelOutline[];
  rooms: IndoorRoom[];
  doors: IndoorDoor[];
  handrails: IndoorHandrail[];
  columns: IndoorColumn[];
  infoPoints: IndoorInfoPoint[];
  pointFeatures: IndoorPointFeature[];
  walls: IndoorWall[];
  tactilePaving: IndoorTactilePaving[];
  stepAreas: IndoorStepArea[];
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
  const levelOutlines = IndoorLevelOutline.collectFromGraph(graphs.indoor);
  const doors = IndoorDoor.collectFromGraph(graphs.indoor);
  const handrails = IndoorHandrail.collectFromGraph(graphs.indoor);
  const columns = IndoorColumn.collectFromGraph(graphs.indoor);
  const infoPoints = IndoorInfoPoint.collectFromGraph(graphs.indoor);
  const pointFeatures = IndoorPointFeature.collectFromGraph(graphs.indoor);
  const walls = IndoorWall.collectFromGraph(graphs.indoor);
  const tactilePaving = IndoorTactilePaving.collectFromGraph(graphs.indoor);
  const stepAreas = IndoorStepArea.collectFromGraph(graphs.indoor);
  const stairPathways = IndoorStairPathway.collectFromGraph(graphs.indoor);
  const stairLandings = IndoorLanding.collectFromGraph(graphs.indoor);
  const stairPathNetwork = new IndoorStairPathNetwork(stairPathways, stairLandings);
  const verticalConnections = buildIndoorVerticalConnections(
    graphs.indoor,
    rooms,
    stairPathNetwork,
  );

  return {
    rawOverpassData,
    graphs,
    buildingInterface,
    levels: collectIndoorLevels(rooms, levelOutlines),
    levelLabels: collectLevelLabels(levelOutlines),
    levelOutlines,
    rooms,
    doors,
    handrails,
    columns,
    infoPoints,
    pointFeatures,
    walls,
    tactilePaving,
    stepAreas,
    stairPathways,
    stairLandings,
    stairPathNetwork,
    verticalConnections,
  };
}

function collectIndoorLevels(rooms: IndoorRoom[], levelOutlines: IndoorLevelOutline[]): number[] {
  const levels = new Set<number>();

  rooms.forEach((room) => room.levels.forEach((level) => levels.add(level)));
  levelOutlines.forEach((outline) => outline.levels.forEach((level) => levels.add(level)));

  return Array.from(levels).sort((a, b) => -a + b);
}

function collectLevelLabels(levelOutlines: IndoorLevelOutline[]): Map<number, string> {
  const labels = new Map<number, string>();

  levelOutlines.forEach((outline) => {
    const label = outline.label;

    if (label === undefined) {
      return;
    }

    outline.levels.forEach((level) => {
      if (!labels.has(level)) {
        labels.set(level, label);
      }
    });
  });

  return labels;
}
