import { IndoorColumn } from "./elements/IndoorColumn";
import { IndoorDoor } from "./elements/IndoorDoor";
import { IndoorElement } from "./elements/IndoorElement";
import { IndoorHandrail } from "./elements/IndoorHandrail";
import { IndoorLanding } from "./elements/IndoorLanding";
import { IndoorLevelOutline } from "./elements/IndoorLevelOutline";
import { IndoorOpening } from "./elements/IndoorOpening";
import { IndoorPointFeature } from "./elements/IndoorPointFeature";
import { IndoorRoom } from "./elements/IndoorRoom";
import { IndoorStairPathway } from "./elements/IndoorStairPathway";
import { IndoorStepArea } from "./elements/IndoorStepArea";
import { IndoorTactilePaving } from "./elements/IndoorTactilePaving";
import { IndoorWall } from "./elements/IndoorWall";
import { IndoorElementRef } from "./models/indoorElementRef";
import { IndoorVerticalConnection } from "./verticalConnections/IndoorVerticalConnection";

/**
 * Any object that can participate in model-level lookup, selection, or level filtering.
 */
export type IndoorModelElement = IndoorElement | IndoorOpening | IndoorVerticalConnection;

/**
 * Concrete element collections used to construct an `IndoorElementRegistry`.
 */
export interface IndoorElementRegistryData {
  /** Explicit `indoor=level` outlines. */
  levelOutlines: IndoorLevelOutline[];
  /** Room-like areas: rooms, corridors, open areas, and vertical connection footprints. */
  rooms: IndoorRoom[];
  /** Explicit OSM door nodes. */
  doors: IndoorDoor[];
  /** Pass-through openings derived from doors or inferred open staircase connections. */
  openings: IndoorOpening[];
  /** Standalone `barrier=handrail` ways. */
  handrails: IndoorHandrail[];
  /** Columns mapped as nodes, ways, or relations. */
  columns: IndoorColumn[];
  /** Point-like information, accessibility, entrance, stair, and category features. */
  pointFeatures: IndoorPointFeature[];
  /** Indoor wall lines or wall areas. */
  walls: IndoorWall[];
  /** Tactile paving line ways. */
  tactilePaving: IndoorTactilePaving[];
  /** `area:highway=steps` areas used by stair tooling and renderers. */
  stepAreas: IndoorStepArea[];
  /** Stair middle-line ways. */
  stairPathways: IndoorStairPathway[];
  /** Stair landing areas. */
  stairLandings: IndoorLanding[];
  /** Vertical connections assembled from footprints, pathways, and landings. */
  verticalConnections: IndoorVerticalConnection[];
}

/**
 * Central access point for typed indoor element collections.
 *
 * Prefer the named arrays, such as `elements.rooms`, when the expected kind is
 * known. Use `getById`, `getByRef`, or `getByLevel` for UI flows such as search,
 * selection, inspection, and layer filtering.
 */
export class IndoorElementRegistry implements IndoorElementRegistryData {
  /** All registry elements in stable collection order. */
  readonly all: IndoorModelElement[];

  readonly levelOutlines: IndoorLevelOutline[];
  readonly rooms: IndoorRoom[];
  readonly doors: IndoorDoor[];
  readonly openings: IndoorOpening[];
  readonly handrails: IndoorHandrail[];
  readonly columns: IndoorColumn[];
  readonly pointFeatures: IndoorPointFeature[];
  readonly walls: IndoorWall[];
  readonly tactilePaving: IndoorTactilePaving[];
  readonly stepAreas: IndoorStepArea[];
  readonly stairPathways: IndoorStairPathway[];
  readonly stairLandings: IndoorLanding[];
  readonly verticalConnections: IndoorVerticalConnection[];

  private readonly elementsById = new Map<string, IndoorModelElement>();

  constructor(data: IndoorElementRegistryData) {
    this.levelOutlines = data.levelOutlines;
    this.rooms = data.rooms;
    this.doors = data.doors;
    this.openings = data.openings;
    this.handrails = data.handrails;
    this.columns = data.columns;
    this.pointFeatures = data.pointFeatures;
    this.walls = data.walls;
    this.tactilePaving = data.tactilePaving;
    this.stepAreas = data.stepAreas;
    this.stairPathways = data.stairPathways;
    this.stairLandings = data.stairLandings;
    this.verticalConnections = data.verticalConnections;
    this.all = [
      ...this.levelOutlines,
      ...this.rooms,
      ...this.doors,
      ...this.openings,
      ...this.handrails,
      ...this.columns,
      ...this.pointFeatures,
      ...this.walls,
      ...this.tactilePaving,
      ...this.stepAreas,
      ...this.stairPathways,
      ...this.stairLandings,
      ...this.verticalConnections,
    ];

    this.all.forEach((element) => this.elementsById.set(element.id, element));
  }

  /** Look up a parsed element by normalized id, for example `way/123` or `node/456`. */
  getById(id: string): IndoorModelElement | undefined {
    return this.elementsById.get(id);
  }

  /** Resolve a lightweight reference produced by search, selection, diagnostics, or an element. */
  getByRef(ref: IndoorElementRef): IndoorModelElement | undefined {
    return this.getById(ref.id);
  }

  /**
   * Return elements that should be considered present on a level.
   *
   * For vertical connections this includes touched stair spans, not only exact
   * authored level tags.
   */
  getByLevel(level: number): IndoorModelElement[] {
    return this.all.filter((element) => elementHasLevel(element, level));
  }
}

function elementHasLevel(element: IndoorModelElement, level: number): boolean {
  if ("hasLevel" in element) {
    return element.hasLevel(level);
  }

  if ("levels" in element) {
    return element.levels.includes(level);
  }

  return element.pathComponents.some((component) =>
    component.pathwayInstances.some(
      (pathway) => level >= pathway.span.from && level <= pathway.span.to,
    ),
  );
}
