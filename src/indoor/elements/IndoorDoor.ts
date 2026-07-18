import { DoorRenderItem } from "../../components/indoorLevel/indoorLevelRenderModel";
import { OverpassNode, OverpassRelation, OverpassWay } from "../../models/overpassJson";
import { OsmGraph } from "../../overpass/OsmGraph";
import ColorService from "../../services/colorService";
import FeatureService from "../../services/featureService";
import { getRequiredFeatureId, getRequiredFeatureProperties } from "../../utils/geoJsonHelpers";
import { calculateDoorOrientationGeometry } from "../doorOrientation";
import { IndoorRoom } from "./IndoorRoom";
import { IndoorElement } from "./IndoorElement";

export class IndoorDoor extends IndoorElement {
  static collectFromGraph(graph: OsmGraph): IndoorDoor[] {
    return Array.from(graph.nodesById.values())
      .filter((node) => isRawDoorNode(node))
      .map((node) => new IndoorDoor(graph, node));
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

  buildRenderItems(rooms: IndoorRoom[], selectedFeatureIds: string[]): DoorRenderItem[] {
    const connectedRooms = this.getConnectedRooms(rooms);
    const connectedRoomFeatures = connectedRooms
      .map((room) => room.toGeoJsonFeature())
      .filter(
        (feature): feature is GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> =>
          feature !== undefined,
      );

    if (connectedRoomFeatures.length == 0) {
      return [];
    }

    const orientationGeometry = this.calculateOrientation(connectedRooms);

    if (orientationGeometry === undefined) {
      return [];
    }

    return [
      {
        coordinates: orientationGeometry.orientation,
        symbol: {
          lineColor: getDoorColor(connectedRoomFeatures, selectedFeatureIds),
          lineWidth: FeatureService.getFeatureStyle(connectedRoomFeatures[0])["lineWidth"],
        },
        debug: orientationGeometry.debug,
      },
    ];
  }

  private calculateOrientation(rooms: IndoorRoom[]) {
    const wayContext = this.findWayContext(rooms);

    if (wayContext === undefined) {
      console.warn(
        `[IndoorDoor] Cannot calculate orientation for door ${this.id}: no containing room way was found.`,
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

  private findWayContext(rooms: IndoorRoom[]): DoorWayContext | undefined {
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
}

interface DoorWayContext {
  previousNodeId: number;
  afterNodeId: number;
}

function isRawDoorNode(node: OverpassNode): boolean {
  return node.tags?.door !== undefined;
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

function getDoorColor(
  connectedRoomFeatures: GeoJSON.Feature[],
  selectedFeatureIds: string[],
): string {
  if (
    connectedRoomFeatures.some((feature) =>
      selectedFeatureIds.includes(getRequiredFeatureId(feature)),
    )
  ) {
    return ColorService.getCurrentColors().roomColorS;
  }

  const nonCorridorRoom = connectedRoomFeatures.find((feature) => {
    const properties = getRequiredFeatureProperties(feature);

    return !(["corridor", "area"].includes(properties.indoor) && properties.stairs !== "yes");
  });

  return FeatureService.getFeatureStyle(nonCorridorRoom ?? connectedRoomFeatures[0])["polygonFill"];
}

function nodeToPosition(node: OverpassNode): GeoJSON.Position {
  return [node.lon, node.lat];
}
