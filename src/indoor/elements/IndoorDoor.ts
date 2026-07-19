import { DoorRenderItem } from "../../components/indoorLevel/indoorLevelRenderModel";
import { OverpassNode, OverpassRelation, OverpassWay } from "../../models/overpassJson";
import { OsmGraph } from "../../overpass/OsmGraph";
import ColorService from "../../services/colorService";
import FeatureService from "../../services/featureService";
import { nodeToPosition } from "../../utils/overpassJsonHelpers";
import { calculateDoorOrientationGeometry } from "../doorOrientation";
import { isNeutralDoorColorRoomTags } from "../indoorTagFilters";
import { isRawIndoorDoorElement } from "../rawIndoorElementFilters";
import { IndoorRoom } from "./IndoorRoom";
import { IndoorElement } from "./IndoorElement";
import { IndoorWall } from "./IndoorWall";

export class IndoorDoor extends IndoorElement {
  private static readonly emittedWarnings = new Set<string>();

  static collectFromGraph(graph: OsmGraph): IndoorDoor[] {
    return graph.elements.filter(isRawIndoorDoorElement).map((node) => new IndoorDoor(graph, node));
  }

  constructor(
    graph: OsmGraph,
    readonly sourceElement: OverpassNode,
  ) {
    super(graph, sourceElement);
  }

  get coordinate(): GeoJSON.Position {
    return [this.sourceElement.lon, this.sourceElement.lat];
  }

  toGeoJsonFeature(): GeoJSON.Feature<GeoJSON.Point> {
    return {
      type: "Feature",
      id: this.id,
      properties: { ...this.tags },
      geometry: {
        type: "Point",
        coordinates: this.coordinate,
      },
    };
  }

  getConnectedRooms(rooms: IndoorRoom[]): IndoorRoom[] {
    return rooms.filter((room) => this.isPartOfRoom(room));
  }

  getConnectedWalls(walls: IndoorWall[]): IndoorWall[] {
    const connectedWalls = walls.filter((wall) => wall.includesNode(this.sourceElement.id));

    connectedWalls
      .filter((wall) => wall.isAreaWall)
      .forEach((wall) =>
        this.warnOnce(
          `area-wall-${wall.id}`,
          `Cannot connect door ${this.id} to area wall ${wall.id}: area walls are renderable areas, not pass-through wall lines.`,
        ),
      );

    return connectedWalls.filter((wall) => !wall.isAreaWall);
  }

  buildRenderItems(
    rooms: IndoorRoom[],
    walls: IndoorWall[],
    selectedFeatureIds: string[],
  ): DoorRenderItem[] {
    const connectedRooms = this.getConnectedRooms(rooms);
    const connectedWalls = this.getConnectedWalls(walls);

    if (connectedRooms.length == 0 && connectedWalls.length == 0) {
      return [];
    }

    const orientationGeometry = this.calculateOrientation(connectedRooms, connectedWalls);

    if (orientationGeometry === undefined) {
      return [];
    }

    return [
      {
        coordinates: orientationGeometry.orientation,
        symbol: {
          lineColor: getDoorColor(connectedRooms, selectedFeatureIds),
          lineWidth: getDoorLineWidth(connectedWalls, connectedRooms),
        },
        debug: orientationGeometry.debug,
      },
    ];
  }

  private calculateOrientation(rooms: IndoorRoom[], walls: IndoorWall[]) {
    const wayContext = this.findWayContext(rooms, walls);

    if (wayContext === undefined) {
      console.warn(
        `[IndoorDoor] Cannot calculate orientation for door ${this.id}: no containing room or wall way was found.`,
      );
      return undefined;
    }

    const previousNode = this.graph.getNode(wayContext.previousNodeId);
    const afterNode = this.graph.getNode(wayContext.afterNodeId);

    if (previousNode === undefined || afterNode === undefined) {
      console.warn(
        `[IndoorDoor] Cannot calculate orientation for door ${this.id}: surrounding room nodes are missing.`,
      );
      return undefined;
    }

    return calculateDoorOrientationGeometry(
      this.coordinate,
      nodeToPosition(previousNode),
      nodeToPosition(afterNode),
      getDoorWidth(this.tags),
    );
  }

  private findWayContext(rooms: IndoorRoom[], walls: IndoorWall[]): DoorWayContext | undefined {
    for (const wall of walls) {
      const context = getDoorWayContext(wall.sourceElement, this.sourceElement.id);

      if (context !== undefined) {
        return context;
      }
    }

    for (const room of rooms) {
      const way = this.findContainingWay(room);

      if (way === undefined) {
        continue;
      }

      const context = getDoorWayContext(way, this.sourceElement.id);

      if (context !== undefined) {
        return context;
      }
    }

    return undefined;
  }

  private findContainingWay(room: IndoorRoom): OverpassWay | undefined {
    if (
      room.sourceElement.type == "way" &&
      room.sourceElement.nodes.includes(this.sourceElement.id)
    ) {
      return room.sourceElement;
    }

    if (room.sourceElement.type == "relation") {
      return findRelationWayContainingNode(this.graph, room.sourceElement, this.sourceElement.id);
    }

    return undefined;
  }

  private isPartOfRoom(room: IndoorRoom): boolean {
    return this.findContainingWay(room) !== undefined;
  }

  private warnOnce(code: string, message: string): void {
    const warningKey = `${this.id}:${code}`;

    if (IndoorDoor.emittedWarnings.has(warningKey)) {
      return;
    }

    IndoorDoor.emittedWarnings.add(warningKey);
    console.warn(`[IndoorDoor] ${message}`);
  }
}

interface DoorWayContext {
  previousNodeId: number;
  afterNodeId: number;
}

function getDoorWayContext(way: OverpassWay, doorNodeId: number): DoorWayContext | undefined {
  const nodeIndex = way.nodes.findIndex((nodeId) => nodeId == doorNodeId);

  if (nodeIndex < 0) {
    return undefined;
  }

  const previousNodeId = way.nodes[nodeIndex - 1];
  const afterNodeId = way.nodes[nodeIndex + 1];

  if (previousNodeId === undefined || afterNodeId === undefined) {
    return undefined;
  }

  return {
    previousNodeId,
    afterNodeId,
  };
}

function findRelationWayContainingNode(
  graph: OsmGraph,
  relation: OverpassRelation,
  nodeId: number,
): OverpassWay | undefined {
  return relation.members
    .filter((member) => member.type == "way")
    .map((member) => graph.getWay(member.ref))
    .find((way) => way?.nodes.includes(nodeId));
}

function getDoorWidth(tags: Record<string, string>): number {
  const width = parseFloat(tags.width ?? "");

  return isNaN(width) ? 1 : width;
}

function getDoorColor(connectedRooms: IndoorRoom[], selectedFeatureIds: string[]): string {
  if (connectedRooms.some((room) => selectedFeatureIds.includes(room.id))) {
    return ColorService.getCurrentColors().roomColorS;
  }

  const nonCorridorRoom = connectedRooms.find((room) => !isNeutralDoorColorRoomTags(room.tags));

  if (connectedRooms.length == 0) {
    return "#ffffff";
  }

  return FeatureService.getIndoorFillStyleFromTags(nonCorridorRoom?.tags ?? connectedRooms[0].tags)
    .polygonFill;
}

function getDoorLineWidth(connectedWalls: IndoorWall[], connectedRooms: IndoorRoom[]): number {
  if (connectedWalls.length > 0) {
    return FeatureService.getLineWidthFromTags(connectedWalls[0].tags);
  }

  if (connectedRooms.length > 0) {
    return FeatureService.getLineWidthFromTags(connectedRooms[0].tags);
  }

  return 1;
}
