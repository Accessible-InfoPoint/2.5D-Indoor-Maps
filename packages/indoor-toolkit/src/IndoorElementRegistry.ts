import { IndoorColumn } from "./elements/IndoorColumn";
import { IndoorDoor } from "./elements/IndoorDoor";
import { IndoorElement } from "./elements/IndoorElement";
import { IndoorHandrail } from "./elements/IndoorHandrail";
import { IndoorInfoPoint } from "./elements/IndoorInfoPoint";
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

export type IndoorModelElement = IndoorElement | IndoorOpening | IndoorVerticalConnection;

export interface IndoorElementRegistryData {
  levelOutlines: IndoorLevelOutline[];
  rooms: IndoorRoom[];
  doors: IndoorDoor[];
  openings: IndoorOpening[];
  handrails: IndoorHandrail[];
  columns: IndoorColumn[];
  infoPoints: IndoorInfoPoint[];
  pointFeatures: IndoorPointFeature[];
  walls: IndoorWall[];
  tactilePaving: IndoorTactilePaving[];
  stepAreas: IndoorStepArea[];
  stairPathways: IndoorStairPathway[];
  stairLandings: IndoorLanding[];
  verticalConnections: IndoorVerticalConnection[];
}

export class IndoorElementRegistry implements IndoorElementRegistryData {
  readonly all: IndoorModelElement[];

  readonly levelOutlines: IndoorLevelOutline[];
  readonly rooms: IndoorRoom[];
  readonly doors: IndoorDoor[];
  readonly openings: IndoorOpening[];
  readonly handrails: IndoorHandrail[];
  readonly columns: IndoorColumn[];
  readonly infoPoints: IndoorInfoPoint[];
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
    this.infoPoints = data.infoPoints;
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
      ...this.infoPoints,
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

  getById(id: string): IndoorModelElement | undefined {
    return this.elementsById.get(id);
  }

  getByRef(ref: IndoorElementRef): IndoorModelElement | undefined {
    return this.getById(ref.id);
  }

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
