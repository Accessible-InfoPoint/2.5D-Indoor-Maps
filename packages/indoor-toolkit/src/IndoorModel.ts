import { OverpassJson } from "./models/overpassJson";
import { IndoorDiagnostic, IndoorDiagnosticOptions, IndoorDiagnostics } from "./diagnostics";
import { IndoorElementRegistry } from "./IndoorElementRegistry";
import { IndoorTopology } from "./IndoorTopology";
import { OsmGraph } from "./overpass/OsmGraph";
import { IndoorColumn } from "./elements/IndoorColumn";
import { IndoorDoor } from "./elements/IndoorDoor";
import { IndoorHandrail } from "./elements/IndoorHandrail";
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
import { extractLevels, LevelValue } from "./utils/extractLevels";

/**
 * Options for model creation.
 *
 * Diagnostics are collected silently by default. Pass `onDiagnostic` to stream
 * warnings/errors into an editor or validator, or set `logDiagnostics` to also
 * forward formatted diagnostics to `console.warn`.
 */
export interface CreateIndoorModelOptions extends IndoorDiagnosticOptions {
  /**
   * Numeric levels that intentionally do not exist in this building.
   *
   * Stair pathway spans may use semicolon-separated level lists. Missing levels
   * listed here do not count as breaks, so `level=1;3` is accepted when `2` is
   * non-existent.
   */
  nonExistentLevels?: LevelValue;
}

/**
 * Parsed representation of one raw indoor Overpass JSON dataset.
 *
 * The model keeps the raw graph available while exposing typed indoor elements,
 * topology helpers, parsed levels, and diagnostics. It is renderer-independent:
 * callers decide how to style, route through, validate, or serialize the data.
 */
export interface IndoorModel {
  /** Original raw indoor Overpass JSON passed to `createIndoorModel`. */
  rawIndoorData: OverpassJson;
  /** Indexed raw OSM graph with node, way, relation, and reverse-reference lookup. */
  graph: OsmGraph;
  /** Parser warnings and errors collected during eager parsing and lazy geometry access. */
  diagnostics: IndoorDiagnostic[];
  /** Typed collections of parsed indoor elements and lookup helpers. */
  elements: IndoorElementRegistry;
  /** Derived factual relationships between parsed rooms, openings, walls, and stairs. */
  topology: IndoorTopology;
  /** Numeric indoor levels derived from room-like elements and explicit level outlines. */
  levels: number[];
  /** Optional display labels from `indoor=level + level:ref=*`, keyed by numeric level. */
  levelLabels: Map<number, string>;
  /** Connected stair pathway and landing components used by vertical connections. */
  stairPathNetwork: IndoorStairPathNetwork;
}

/**
 * Parse raw indoor Overpass JSON into the Indoor Toolkit domain model.
 *
 * The caller is responsible for loading and filtering the relevant Overpass
 * data. This function does not fetch data, select buildings, or produce render
 * items.
 *
 * @example
 * ```ts
 * const model = createIndoorModel(indoorData, {
 *   onDiagnostic: (diagnostic) => console.warn(diagnostic.message),
 * });
 *
 * const roomsOnLevel0 = model.elements.rooms.filter((room) => room.hasLevel(0));
 * ```
 */
export function createIndoorModel(
  rawIndoorData: OverpassJson,
  options: CreateIndoorModelOptions = {},
): IndoorModel {
  const diagnostics = new IndoorDiagnostics(options);
  const nonExistentLevels = extractLevels(options.nonExistentLevels, {
    diagnostics,
    tagName: "non_existent_levels",
  });
  const graph = new OsmGraph(rawIndoorData);
  const rooms = IndoorRoom.collectFromGraph(graph, diagnostics);
  const levelOutlines = IndoorLevelOutline.collectFromGraph(graph, diagnostics);
  const doors = IndoorDoor.collectFromGraph(graph, diagnostics);
  const handrails = IndoorHandrail.collectFromGraph(graph, diagnostics);
  const columns = IndoorColumn.collectFromGraph(graph, diagnostics);
  const pointFeatures = IndoorPointFeature.collectFromGraph(graph, diagnostics);
  const walls = IndoorWall.collectFromGraph(graph, diagnostics);
  const tactilePaving = IndoorTactilePaving.collectFromGraph(graph, diagnostics);
  const stepAreas = IndoorStepArea.collectFromGraph(graph, diagnostics);
  const stairPathways = IndoorStairPathway.collectFromGraph(graph, diagnostics, nonExistentLevels);
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
