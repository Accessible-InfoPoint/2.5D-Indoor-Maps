import { OverpassJson } from "./models/overpassJson";
import { IndoorDiagnostic, IndoorDiagnosticOptions, IndoorDiagnostics } from "./diagnostics";
import { IndoorElementRegistry } from "./IndoorElementRegistry";
import { IndoorTopology } from "./IndoorTopology";
import { OsmGraph } from "./overpass/OsmGraph";
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
import { buildIndoorVerticalConnections } from "./verticalConnections/IndoorVerticalConnection";
import { IndoorStairPathNetwork } from "./verticalConnections/IndoorStairPathNetwork";
import { buildIndoorOpenings } from "./IndoorOpeningBuilder";

export type CreateIndoorModelOptions = IndoorDiagnosticOptions;

export interface IndoorModel {
  rawIndoorData: OverpassJson;
  graph: OsmGraph;
  diagnostics: IndoorDiagnostic[];
  elements: IndoorElementRegistry;
  topology: IndoorTopology;
  levels: number[];
  levelLabels: Map<number, string>;
  stairPathNetwork: IndoorStairPathNetwork;
}

export function createIndoorModel(
  rawIndoorData: OverpassJson,
  options: CreateIndoorModelOptions = {},
): IndoorModel {
  const diagnostics = new IndoorDiagnostics(options);
  const graph = new OsmGraph(rawIndoorData);
  const rooms = IndoorRoom.collectFromGraph(graph, diagnostics);
  const levelOutlines = IndoorLevelOutline.collectFromGraph(graph, diagnostics);
  const doors = IndoorDoor.collectFromGraph(graph, diagnostics);
  const handrails = IndoorHandrail.collectFromGraph(graph, diagnostics);
  const columns = IndoorColumn.collectFromGraph(graph, diagnostics);
  const infoPoints = IndoorInfoPoint.collectFromGraph(graph, diagnostics);
  const pointFeatures = IndoorPointFeature.collectFromGraph(graph, diagnostics);
  const walls = IndoorWall.collectFromGraph(graph, diagnostics);
  const tactilePaving = IndoorTactilePaving.collectFromGraph(graph, diagnostics);
  const stepAreas = IndoorStepArea.collectFromGraph(graph, diagnostics);
  const stairPathways = IndoorStairPathway.collectFromGraph(graph, diagnostics);
  const stairLandings = IndoorLanding.collectFromGraph(graph, diagnostics);
  const stairPathNetwork = new IndoorStairPathNetwork(stairPathways, stairLandings);
  const verticalConnections = buildIndoorVerticalConnections(graph, rooms, stairPathNetwork);
  const openings = buildIndoorOpenings({
    graph,
    rooms,
    walls,
    doors,
    verticalConnections,
    diagnostics,
  });
  const elements = new IndoorElementRegistry({
    levelOutlines,
    rooms,
    doors,
    openings,
    handrails,
    columns,
    infoPoints,
    pointFeatures,
    walls,
    tactilePaving,
    stepAreas,
    stairPathways,
    stairLandings,
    verticalConnections,
  });
  const topology = new IndoorTopology(graph, elements);

  return {
    rawIndoorData,
    graph,
    diagnostics: diagnostics.diagnostics,
    elements,
    topology,
    levels: collectIndoorLevels(rooms, levelOutlines),
    levelLabels: collectLevelLabels(levelOutlines),
    stairPathNetwork,
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
