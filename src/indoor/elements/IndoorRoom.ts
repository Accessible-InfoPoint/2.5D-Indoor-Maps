import {
  OverpassElement,
  OverpassNode,
  OverpassRelation,
  OverpassWay,
} from "../../models/overpassJson";
import { OsmGraph } from "../../overpass/OsmGraph";
import { nodeToPosition } from "../../utils/overpassJsonHelpers";
import { isRawIndoorRoomElement } from "../rawIndoorElementFilters";
import { IndoorElement } from "./IndoorElement";

/**
 * Handles all rooms and areas:
 * - regular rooms
 * - corridor
 * - area (e.g. foyer)
 * - special rooms (toilets, staircases)
 * - this does not handle 3D visualizations of staircases and 2D stairs (which are different from staircases: LINK) # TODO
 *
 * Styling of elements is done in rawIndoorLevelRenderBuilder.ts
 */
export class IndoorRoom extends IndoorElement {
  private static readonly emittedWarnings = new Set<string>();

  static collectFromGraph(graph: OsmGraph): IndoorRoom[] {
    return graph.elements
      .filter(isRawIndoorRoomElement)
      .map((element) => new IndoorRoom(graph, element));
  }

  constructor(graph: OsmGraph, sourceElement: OverpassElement) {
    super(graph, sourceElement);
  }

  get indoorKind(): string | undefined {
    return this.tags.indoor;
  }

  toGeoJsonFeature(): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | undefined {
    const geometry = this.toGeoJsonGeometry();

    if (geometry === undefined) {
      return undefined;
    }

    return {
      type: "Feature",
      id: this.id,
      properties: { ...this.tags },
      geometry,
    };
  }

  private toGeoJsonGeometry(): GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined {
    switch (this.sourceElement.type) {
      case "way":
        return this.getWayPolygon(this.sourceElement);
      case "relation":
        return this.getRelationGeometry(this.sourceElement);
      case "node":
        return undefined;
    }
  }

  private getWayPolygon(way: OverpassWay): GeoJSON.Polygon | undefined {
    const ring = this.getWayRing(way);

    return ring === undefined
      ? undefined
      : {
          type: "Polygon",
          coordinates: [ring],
        };
  }

  private getRelationGeometry(
    relation: OverpassRelation,
  ): GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined {
    const outerRings = this.getRelationRingsByRole(relation, "outer");

    if (outerRings.length == 0) {
      this.warnOnce(
        "missing-outer-ring",
        `Cannot render room relation ${this.id}: no complete outer ring was found.`,
      );
      return undefined;
    }

    const innerRings = this.getRelationRingsByRole(relation, "inner");
    const polygons = outerRings.map((outerRing) => [outerRing]);

    innerRings.forEach((innerRing) => {
      const containingPolygon = polygons.find((polygon) => ringContainsRing(polygon[0], innerRing));

      if (containingPolygon !== undefined) {
        containingPolygon.push(innerRing);
      } else {
        this.warnOnce(
          "unassigned-inner-ring",
          `Ignoring inner ring in room relation ${this.id}: it is not contained by any outer ring.`,
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

  private getRelationRingsByRole(
    relation: OverpassRelation,
    role: "outer" | "inner",
  ): GeoJSON.Position[][] {
    const unsupportedWayMembers = relation.members.filter(
      (member) => member.type == "way" && member.role != "outer" && member.role != "inner",
    );

    if (unsupportedWayMembers.length > 0) {
      this.warnOnce(
        "unsupported-member-roles",
        `Ignoring ${unsupportedWayMembers.length} way member(s) in room relation ${this.id}: ` +
          "only outer and inner roles are supported.",
      );
    }

    const completeWays: OverpassWay[] = [];

    relation.members
      .filter((member) => member.type == "way" && member.role == role)
      .forEach((member) => {
        const way = this.graph.getWay(member.ref);

        if (way === undefined) {
          this.warnOnce(
            `missing-${role}-way-${member.ref}`,
            `Ignoring missing ${role} way/${member.ref} in room relation ${this.id}.`,
          );
          return;
        }

        const missingNodeIds = this.graph.getMissingWayNodeIds(way);

        if (missingNodeIds.length > 0) {
          this.warnOnce(
            `missing-${role}-way-nodes-${way.id}`,
            `Ignoring ${role} way/${way.id} in room relation ${this.id}: ` +
              `missing node(s) ${missingNodeIds.join(", ")}.`,
          );
          return;
        }

        completeWays.push(way);
      });

    const result = buildRingsFromWays(completeWays, this.graph);

    result.incompleteChains.forEach((chain) => {
      const wayList = chain.wayIds.map((wayId) => `way/${wayId}`).join(", ");

      this.warnOnce(
        `incomplete-${role}-chain-${chain.wayIds.join("-")}`,
        `Ignoring incomplete ${role} ring in room relation ${this.id}: ` +
          `way chain ${wayList} does not close.`,
      );
    });

    return result.rings;
  }

  private getWayRing(way: OverpassWay): GeoJSON.Position[] | undefined {
    const missingNodeIds = this.graph.getMissingWayNodeIds(way);

    if (missingNodeIds.length > 0) {
      this.warnOnce(
        "missing-way-nodes",
        `Cannot render room way/${way.id}: missing node(s) ${missingNodeIds.join(", ")}.`,
      );
      return undefined;
    }

    const nodes = this.graph.getWayNodes(way);

    if (nodes.length < 3) {
      this.warnOnce(
        "too-few-way-nodes",
        `Cannot render room way/${way.id}: at least three nodes are required.`,
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

  private warnOnce(code: string, message: string): void {
    const warningKey = `${this.id}:${code}`;

    if (IndoorRoom.emittedWarnings.has(warningKey)) {
      return;
    }

    IndoorRoom.emittedWarnings.add(warningKey);
    console.warn(`[IndoorRoom] ${message}`);
  }
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
