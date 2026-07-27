import { OsmGraph } from "../overpass/OsmGraph";
import { nodeToPosition } from "../utils/overpassJsonHelpers";
import { IndoorDoor } from "./elements/IndoorDoor";
import {
  buildIndoorOpeningForNode,
  getRoomsContainingNode,
  IndoorOpening,
  IndoorOpeningSource,
} from "./elements/IndoorOpening";
import { IndoorRoom } from "./elements/IndoorRoom";
import { IndoorWall } from "./elements/IndoorWall";
import { getRawElementNodeIds } from "./rawElementNodeIds";
import { IndoorStairPathwayInstance } from "./verticalConnections/IndoorStairPathNetwork";
import { IndoorVerticalConnection } from "./verticalConnections/IndoorVerticalConnection";
import { getInterpolatedPathLevels } from "./verticalConnections/pathLevelInterpolation";

interface IndoorOpeningBuilderOptions {
  graph: OsmGraph;
  rooms: IndoorRoom[];
  walls: IndoorWall[];
  doors: IndoorDoor[];
  verticalConnections: IndoorVerticalConnection[];
}

interface OpenStaircaseOpeningNode {
  level: number;
  nodeId: number;
  widthMeters: number;
  footprint: IndoorRoom;
  sources: IndoorOpeningSource[];
}

export function buildIndoorOpenings(options: IndoorOpeningBuilderOptions): IndoorOpening[] {
  const staircaseOpeningNodes = collectOpenStaircaseOpeningNodes(options);
  const staircaseOpeningNodesByKey =
    groupStaircaseOpeningNodesByLevelAndNode(staircaseOpeningNodes);
  const explicitDoorOpeningKeys = new Set<string>();
  const doorOpenings = options.doors.flatMap((door) =>
    door.levels
      .map((level): IndoorOpening | undefined => {
        const roomsOnLevel = options.rooms.filter((room) => room.hasLevel(level));
        const wallsOnLevel = options.walls.filter((wall) => wall.hasLevel(level));
        const staircaseOpening = staircaseOpeningNodesByKey.get(
          getLevelNodeKey(level, door.sourceElement.id),
        );
        const opening = door.toOpening(
          roomsOnLevel,
          wallsOnLevel,
          staircaseOpening?.widthMeters,
          [level],
          staircaseOpening?.sources,
        );

        if (opening !== undefined) {
          explicitDoorOpeningKeys.add(getLevelNodeKey(level, door.sourceElement.id));
        }

        return opening;
      })
      .filter((opening): opening is IndoorOpening => opening !== undefined),
  );
  const inferredOpenings = staircaseOpeningNodes
    .filter(
      (opening) => !explicitDoorOpeningKeys.has(getLevelNodeKey(opening.level, opening.nodeId)),
    )
    .map((opening): IndoorOpening | undefined => buildInferredStaircaseOpening(options, opening))
    .filter((opening): opening is IndoorOpening => opening !== undefined);

  return [...doorOpenings, ...inferredOpenings];
}

function collectOpenStaircaseOpeningNodes(
  options: IndoorOpeningBuilderOptions,
): OpenStaircaseOpeningNode[] {
  const openingsByKey = new Map<string, OpenStaircaseOpeningNode>();

  options.verticalConnections
    .filter(
      (connection): connection is IndoorVerticalConnection & { footprint: IndoorRoom } =>
        connection.kind == "open" && connection.footprint !== undefined,
    )
    .forEach((connection) => {
      const footprintNodeIds = new Set(
        getRawElementNodeIds(options.graph, connection.footprint.sourceElement),
      );

      connection.pathComponents.forEach((component) =>
        component.pathwayInstances.forEach((pathwayInstance) => {
          collectPathwayOpeningNodes(
            pathwayInstance,
            footprintNodeIds,
            connection.footprint,
          ).forEach((opening) => {
            const key = `${opening.level}:${opening.footprint.id}:${opening.nodeId}`;
            const previous = openingsByKey.get(key);

            openingsByKey.set(key, {
              ...opening,
              widthMeters: Math.max(previous?.widthMeters ?? 0, opening.widthMeters),
              sources: mergeSources(previous?.sources ?? [], opening.sources),
            });
          });
        }),
      );
    });

  return Array.from(openingsByKey.values()).filter((opening) =>
    getRoomsContainingNode(
      options.graph,
      options.rooms.filter((room) => room.hasLevel(opening.level)),
      opening.nodeId,
    ).some((room) => room.id == opening.footprint.id),
  );
}

function collectPathwayOpeningNodes(
  pathwayInstance: IndoorStairPathwayInstance,
  footprintNodeIds: Set<number>,
  footprint: IndoorRoom,
): OpenStaircaseOpeningNode[] {
  const geometry = pathwayInstance.source.geometry;

  if (geometry === undefined) {
    return [];
  }

  const pathLevels = getInterpolatedPathLevels(geometry.coordinates, pathwayInstance);

  return pathwayInstance.nodeIds
    .map((nodeId, index): OpenStaircaseOpeningNode | undefined => {
      const level = findMatchingFootprintLevel(pathLevels[index], footprint);

      return footprintNodeIds.has(nodeId) && level !== undefined
        ? {
            level,
            nodeId,
            widthMeters: pathwayInstance.source.widthMeters,
            footprint,
            sources: [
              { role: "pathway", element: pathwayInstance.source.sourceElement },
              { role: "footprint", element: footprint.sourceElement },
            ],
          }
        : undefined;
    })
    .filter((opening): opening is OpenStaircaseOpeningNode => opening !== undefined);
}

function buildInferredStaircaseOpening(
  options: IndoorOpeningBuilderOptions,
  opening: OpenStaircaseOpeningNode,
): IndoorOpening | undefined {
  const node = options.graph.getNode(opening.nodeId);

  if (node === undefined) {
    return undefined;
  }

  const roomsOnLevel = options.rooms.filter((room) => room.hasLevel(opening.level));
  const connectedRooms = getRoomsContainingNode(options.graph, roomsOnLevel, opening.nodeId);

  return buildIndoorOpeningForNode({
    id: `opening/${opening.footprint.id}/node/${opening.nodeId}@${opening.level}`,
    kind: "opening",
    graph: options.graph,
    nodeId: opening.nodeId,
    coordinate: nodeToPosition(node),
    tags: {},
    levels: [opening.level],
    connectedRooms: [
      opening.footprint,
      ...connectedRooms.filter((room) => room.id != opening.footprint.id),
    ],
    connectedWalls: [],
    fallbackWidthMeters: opening.widthMeters,
    sources: [{ role: "pathway-node", element: node }, ...opening.sources],
  });
}

function groupStaircaseOpeningNodesByLevelAndNode(
  openings: OpenStaircaseOpeningNode[],
): Map<string, OpenStaircaseOpeningNode> {
  const openingsByKey = new Map<string, OpenStaircaseOpeningNode>();

  openings.forEach((opening) => {
    const key = getLevelNodeKey(opening.level, opening.nodeId);
    const previous = openingsByKey.get(key);

    openingsByKey.set(key, {
      ...opening,
      widthMeters: Math.max(previous?.widthMeters ?? 0, opening.widthMeters),
      sources: mergeSources(previous?.sources ?? [], opening.sources),
    });
  });

  return openingsByKey;
}

function findMatchingFootprintLevel(
  pathLevel: number | undefined,
  footprint: IndoorRoom,
): number | undefined {
  return footprint.levels.find(
    (level) => pathLevel !== undefined && Math.abs(level - pathLevel) < 0.000001,
  );
}

function getLevelNodeKey(level: number, nodeId: number): string {
  return `${level}:${nodeId}`;
}

function mergeSources(
  previousSources: IndoorOpeningSource[],
  nextSources: IndoorOpeningSource[],
): IndoorOpeningSource[] {
  const sourcesByKey = new Map<string, IndoorOpeningSource>();

  [...previousSources, ...nextSources].forEach((source) =>
    sourcesByKey.set(`${source.role}:${source.element.type}/${source.element.id}`, source),
  );

  return Array.from(sourcesByKey.values());
}
