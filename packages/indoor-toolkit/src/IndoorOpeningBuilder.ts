import { IndoorDiagnostics } from "./diagnostics";
import { OsmGraph } from "./overpass/OsmGraph";
import { nodeToPosition } from "./utils/overpassJsonHelpers";
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
import {
  IndoorLandingInstance,
  IndoorStairPathwayInstance,
} from "./verticalConnections/IndoorStairPathNetwork";
import { IndoorVerticalConnection } from "./verticalConnections/IndoorVerticalConnection";
import { getInterpolatedPathLevels } from "./verticalConnections/pathLevelInterpolation";

interface IndoorOpeningBuilderOptions {
  graph: OsmGraph;
  rooms: IndoorRoom[];
  walls: IndoorWall[];
  doors: IndoorDoor[];
  verticalConnections: IndoorVerticalConnection[];
  diagnostics?: IndoorDiagnostics;
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
  const pathwayLandingOpenings = buildPathwayLandingOpenings(options);

  return [...doorOpenings, ...inferredOpenings, ...pathwayLandingOpenings];
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
            options.diagnostics,
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
  diagnostics: IndoorDiagnostics | undefined,
): OpenStaircaseOpeningNode[] {
  const geometry = pathwayInstance.source.geometry;

  if (geometry === undefined) {
    warnOpeningBuilderIssue(
      diagnostics,
      pathwayInstance.source.id,
      pathwayInstance.source.tags,
      pathwayInstance.source.levels,
      "missing-pathway-geometry",
      `Cannot infer openings for stair pathway ${pathwayInstance.source.id}: pathway geometry is unavailable.`,
    );
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
    warnOpeningBuilderIssue(
      options.diagnostics,
      opening.footprint.id,
      opening.footprint.tags,
      opening.footprint.levels,
      "missing-opening-node",
      `Cannot build inferred staircase opening for ${opening.footprint.id} at node/${opening.nodeId}: node is missing from the OSM graph.`,
    );
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
    diagnostics: options.diagnostics,
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

function buildPathwayLandingOpenings(options: IndoorOpeningBuilderOptions): IndoorOpening[] {
  const openingsById = new Map<string, IndoorOpening>();

  options.verticalConnections.forEach((connection) =>
    connection.pathComponents.forEach((component) =>
      component.pathwayInstances.forEach((pathwayInstance) =>
        component.landingInstances.forEach((landingInstance) =>
          collectPathwayLandingOpenings(options, pathwayInstance, landingInstance).forEach(
            (opening) => openingsById.set(opening.id, opening),
          ),
        ),
      ),
    ),
  );

  return Array.from(openingsById.values());
}

function collectPathwayLandingOpenings(
  options: IndoorOpeningBuilderOptions,
  pathwayInstance: IndoorStairPathwayInstance,
  landingInstance: IndoorLandingInstance,
): IndoorOpening[] {
  const geometry = pathwayInstance.source.geometry;

  if (geometry === undefined) {
    warnOpeningBuilderIssue(
      options.diagnostics,
      pathwayInstance.source.id,
      pathwayInstance.source.tags,
      pathwayInstance.source.levels,
      "missing-pathway-geometry",
      `Cannot infer pathway/landing openings for stair pathway ${pathwayInstance.source.id}: pathway geometry is unavailable.`,
    );
    return [];
  }

  const landingNodeIds = new Set(landingInstance.nodeIds);
  const pathLevels = getInterpolatedPathLevels(geometry.coordinates, pathwayInstance);

  return pathwayInstance.nodeIds
    .map((nodeId, index): IndoorOpening | undefined =>
      landingNodeIds.has(nodeId) &&
      pathLevels[index] !== undefined &&
      Math.abs(pathLevels[index] - landingInstance.level) < 0.000001
        ? buildPathwayLandingOpening(options, pathwayInstance, landingInstance, nodeId)
        : undefined,
    )
    .filter((opening): opening is IndoorOpening => opening !== undefined);
}

function buildPathwayLandingOpening(
  options: IndoorOpeningBuilderOptions,
  pathwayInstance: IndoorStairPathwayInstance,
  landingInstance: IndoorLandingInstance,
  nodeId: number,
): IndoorOpening | undefined {
  const node = options.graph.getNode(nodeId);
  const id = `pathway-landing-opening/${pathwayInstance.id}/${landingInstance.id}/node/${nodeId}`;

  if (node === undefined) {
    warnOpeningBuilderIssue(
      options.diagnostics,
      id,
      {},
      [landingInstance.level],
      "missing-opening-node",
      `Cannot build pathway/landing opening ${id}: node/${nodeId} is missing from the OSM graph.`,
    );
    return undefined;
  }

  return {
    id,
    kind: "pathway-landing",
    nodeId,
    coordinate: nodeToPosition(node),
    tags: {},
    levels: [landingInstance.level],
    widthMeters: pathwayInstance.source.widthMeters,
    connectedRooms: [],
    connectedWalls: [],
    connectedPathwayInstances: [pathwayInstance],
    connectedLandingInstances: [landingInstance],
    sources: [
      { role: "pathway-node", element: node },
      { role: "pathway", element: pathwayInstance.source.sourceElement },
      { role: "landing", element: landingInstance.source.sourceElement },
    ],
  };
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

function warnOpeningBuilderIssue(
  diagnostics: IndoorDiagnostics | undefined,
  id: string,
  tags: Record<string, string>,
  levels: number[],
  code: string,
  message: string,
): void {
  if (diagnostics === undefined) {
    console.warn(`[IndoorOpeningBuilder] ${message}`);
    return;
  }

  diagnostics.warn({
    code: `IndoorOpeningBuilder.${code}`,
    message,
    elementRef: {
      id,
      tags,
      levels,
    },
  });
}
