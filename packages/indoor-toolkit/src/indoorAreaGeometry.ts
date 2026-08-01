import {
  OverpassElement,
  OverpassNode,
  OverpassRelation,
  OverpassWay,
} from "./models/overpassJson";
import { IndoorDiagnostics } from "./diagnostics";
import { IndoorElementRef } from "./models/indoorElementRef";
import { OsmGraph } from "./overpass/OsmGraph";
import { nodeToPosition } from "./utils/overpassJsonHelpers";

export interface IndoorAreaGeometryOptions {
  /** Raw OSM graph used to resolve way nodes and relation members. */
  graph: OsmGraph;
  /** Normalized id of the parsed element whose geometry is being built. */
  elementId: string;
  /** Human-readable element kind used in diagnostic messages. */
  elementKind: string;
  /** Prefix used for diagnostic codes. */
  warningPrefix: string;
  /** Per-element warning keys already emitted for lazy geometry access. */
  emittedWarnings: Set<string>;
  /** Optional diagnostic collector. Falls back to `console.warn` when absent. */
  diagnostics?: IndoorDiagnostics;
  /** Parsed element reference attached to diagnostics. */
  elementRef?: IndoorElementRef;
  /** Raw source element attached to diagnostics. */
  sourceElement?: OverpassElement;
}

/**
 * Build polygon geometry for an area-like way.
 *
 * The ring is closed automatically when the first node is not repeated. Returns
 * `undefined` and records diagnostics for missing or too-short geometry.
 */
export function getWayPolygonGeometry(
  way: OverpassWay,
  options: IndoorAreaGeometryOptions,
): GeoJSON.Polygon | undefined {
  const ring = getWayRing(way, options);

  return ring === undefined
    ? undefined
    : {
        type: "Polygon",
        coordinates: [ring],
      };
}

/**
 * Build polygon or multipolygon geometry for an area-like relation.
 *
 * Supports `outer` and `inner` way members, multiple outer rings, multiple
 * holes, and rings assembled from connected way chains.
 */
export function getRelationAreaGeometry(
  relation: OverpassRelation,
  options: IndoorAreaGeometryOptions,
): GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined {
  const outerRings = getRelationRingsByRole(relation, "outer", options);

  if (outerRings.length == 0) {
    warnOnce(
      "missing-outer-ring",
      `Cannot render ${options.elementKind} relation ${options.elementId}: ` +
        "no complete outer ring was found.",
      options,
    );
    return undefined;
  }

  const innerRings = getRelationRingsByRole(relation, "inner", options);
  const polygons = outerRings.map((outerRing) => [outerRing]);

  innerRings.forEach((innerRing) => {
    const containingPolygon = polygons.find((polygon) => ringContainsRing(polygon[0], innerRing));

    if (containingPolygon !== undefined) {
      containingPolygon.push(innerRing);
    } else {
      warnOnce(
        "unassigned-inner-ring",
        `Ignoring inner ring in ${options.elementKind} relation ${options.elementId}: ` +
          "it is not contained by any outer ring.",
        options,
      );
    }
  });

  if (polygons.length == 1) {
    return {
      type: "Polygon",
      coordinates: polygons[0],
    };
  }

  return {
    type: "MultiPolygon",
    coordinates: polygons,
  };
}

function getRelationRingsByRole(
  relation: OverpassRelation,
  role: "outer" | "inner",
  options: IndoorAreaGeometryOptions,
): GeoJSON.Position[][] {
  const unsupportedWayMembers = relation.members.filter(
    (member) => member.type == "way" && member.role != "outer" && member.role != "inner",
  );

  if (unsupportedWayMembers.length > 0) {
    warnOnce(
      "unsupported-member-roles",
      `Ignoring ${unsupportedWayMembers.length} way member(s) in ${options.elementKind} ` +
        `relation ${options.elementId}: only outer and inner roles are supported.`,
      options,
    );
  }

  const completeWays: OverpassWay[] = [];

  relation.members
    .filter((member) => member.type == "way" && member.role == role)
    .forEach((member) => {
      const way = options.graph.getWay(member.ref);

      if (way === undefined) {
        warnOnce(
          `missing-${role}-way-${member.ref}`,
          `Ignoring missing ${role} way/${member.ref} in ${options.elementKind} ` +
            `relation ${options.elementId}.`,
          options,
        );
        return;
      }

      const missingNodeIds = options.graph.getMissingWayNodeIds(way);

      if (missingNodeIds.length > 0) {
        warnOnce(
          `missing-${role}-way-nodes-${way.id}`,
          `Ignoring ${role} way/${way.id} in ${options.elementKind} ` +
            `relation ${options.elementId}: missing node(s) ${missingNodeIds.join(", ")}.`,
          options,
        );
        return;
      }

      completeWays.push(way);
    });

  const result = buildRingsFromWays(completeWays, options.graph);

  result.incompleteChains.forEach((chain) => {
    const wayList = chain.wayIds.map((wayId) => `way/${wayId}`).join(", ");

    warnOnce(
      `incomplete-${role}-chain-${chain.wayIds.join("-")}`,
      `Ignoring incomplete ${role} ring in ${options.elementKind} relation ${options.elementId}: ` +
        `way chain ${wayList} does not close.`,
      options,
    );
  });

  return result.rings;
}

function getWayRing(
  way: OverpassWay,
  options: IndoorAreaGeometryOptions,
): GeoJSON.Position[] | undefined {
  const missingNodeIds = options.graph.getMissingWayNodeIds(way);

  if (missingNodeIds.length > 0) {
    warnOnce(
      "missing-way-nodes",
      `Cannot render ${options.elementKind} way/${way.id}: ` +
        `missing node(s) ${missingNodeIds.join(", ")}.`,
      options,
    );
    return undefined;
  }

  const nodes = options.graph.getWayNodes(way);

  if (nodes.length < 3) {
    warnOnce(
      "too-few-way-nodes",
      `Cannot render ${options.elementKind} way/${way.id}: at least three nodes are required.`,
      options,
    );
    return undefined;
  }

  const ring = nodes.map(nodeToPosition);
  const first = ring[0];
  const last = ring.at(-1);

  if (first === undefined || last === undefined) {
    return undefined;
  }

  if (first[0] != last[0] || first[1] != last[1]) {
    ring.push([...first]);
  }

  return ring;
}

interface RingBuildResult {
  rings: GeoJSON.Position[][];
  incompleteChains: RingBuildChain[];
}

interface RingBuildChain {
  nodeIds: number[];
  wayIds: number[];
}

function buildRingsFromWays(ways: OverpassWay[], graph: OsmGraph): RingBuildResult {
  const chains = ways
    .map((way) => ({
      nodeIds: [...way.nodes],
      wayIds: [way.id],
    }))
    .filter((chain) => chain.nodeIds.length >= 2);
  const rings: GeoJSON.Position[][] = [];
  const incompleteChains: RingBuildChain[] = [];

  while (chains.length > 0) {
    const chain = chains.shift()!;
    let changed = true;

    while (!isClosedNodeChain(chain.nodeIds) && changed) {
      changed = false;

      for (let i = 0; i < chains.length; i++) {
        if (tryMergeChain(chain, chains[i])) {
          chains.splice(i, 1);
          changed = true;
          break;
        }
      }
    }

    if (isClosedNodeChain(chain.nodeIds) && chain.nodeIds.length >= 4) {
      const ring = chain.nodeIds
        .map((nodeId) => graph.getNode(nodeId))
        .filter((node): node is OverpassNode => node !== undefined)
        .map(nodeToPosition);

      if (ring.length == chain.nodeIds.length) {
        rings.push(ring);
      }
    } else {
      incompleteChains.push(chain);
    }
  }

  return {
    rings,
    incompleteChains,
  };
}

function tryMergeChain(target: RingBuildChain, candidate: RingBuildChain): boolean {
  const targetFirst = target.nodeIds[0];
  const targetLast = target.nodeIds.at(-1);
  const candidateFirst = candidate.nodeIds[0];
  const candidateLast = candidate.nodeIds.at(-1);

  if (
    targetFirst === undefined ||
    targetLast === undefined ||
    candidateFirst === undefined ||
    candidateLast === undefined
  ) {
    return false;
  }

  if (targetLast == candidateFirst) {
    target.nodeIds.push(...candidate.nodeIds.slice(1));
    target.wayIds.push(...candidate.wayIds);
    return true;
  }

  if (targetLast == candidateLast) {
    target.nodeIds.push(...candidate.nodeIds.slice(0, -1).reverse());
    target.wayIds.push(...candidate.wayIds);
    return true;
  }

  if (targetFirst == candidateLast) {
    target.nodeIds.unshift(...candidate.nodeIds.slice(0, -1));
    target.wayIds.unshift(...candidate.wayIds);
    return true;
  }

  if (targetFirst == candidateFirst) {
    target.nodeIds.unshift(...candidate.nodeIds.slice(1).reverse());
    target.wayIds.unshift(...candidate.wayIds);
    return true;
  }

  return false;
}

function isClosedNodeChain(chain: number[]): boolean {
  return chain.length > 1 && chain[0] == chain.at(-1);
}

function ringContainsRing(outerRing: GeoJSON.Position[], innerRing: GeoJSON.Position[]): boolean {
  const innerPoint = innerRing[0];

  return innerPoint !== undefined && pointInRing(innerPoint, outerRing);
}

function pointInRing(point: GeoJSON.Position, ring: GeoJSON.Position[]): boolean {
  let inside = false;
  const [x, y] = point;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function warnOnce(code: string, message: string, options: IndoorAreaGeometryOptions): void {
  const warningKey = `${options.elementId}:${code}`;

  if (options.emittedWarnings.has(warningKey)) {
    return;
  }

  options.emittedWarnings.add(warningKey);
  if (options.diagnostics === undefined) {
    console.warn(`[${options.warningPrefix}] ${message}`);
    return;
  }

  options.diagnostics.warn({
    code: `${options.warningPrefix}.${code}`,
    message,
    elementRef: options.elementRef,
    sourceElement: options.sourceElement,
  });
}
