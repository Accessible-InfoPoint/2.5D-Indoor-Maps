import {
  OverpassElement,
  OverpassJson,
  OverpassNode,
  OverpassRelation,
  OverpassRelationMember,
  OverpassWay,
} from "../models/overpassJson";
import { getOverpassElementKey, normalizeOverpassElementKey } from "../utils/overpassJsonHelpers";

export type OverpassElementType = OverpassElement["type"];

/**
 * Indexed view over raw Overpass JSON.
 *
 * `OsmGraph` preserves OSM semantics that GeoJSON would erase: ids, node order,
 * way membership, relation membership, and reverse references.
 */
export class OsmGraph {
  /** Raw elements in input order. */
  readonly elements: OverpassElement[];
  /** Elements keyed by `node/1`, `way/2`, or `relation/3`. */
  readonly elementsByKey = new Map<string, OverpassElement>();
  /** Node lookup by numeric OSM id. */
  readonly nodesById = new Map<number, OverpassNode>();
  /** Way lookup by numeric OSM id. */
  readonly waysById = new Map<number, OverpassWay>();
  /** Relation lookup by numeric OSM id. */
  readonly relationsById = new Map<number, OverpassRelation>();
  /** Reverse lookup: ways containing a node id. */
  readonly waysByNodeId = new Map<number, OverpassWay[]>();
  /** Reverse lookup: relations containing a member key such as `way/123`. */
  readonly relationsByMember = new Map<string, OverpassRelation[]>();

  constructor(readonly overpassJson: OverpassJson) {
    this.elements = [...overpassJson.elements];
    this.indexElements();
    this.indexReverseReferences();
  }

  getById(elementKey: string): OverpassElement | undefined;
  getById(type: OverpassElementType, id: number | string): OverpassElement | undefined;
  /**
   * Look up any element either by normalized key (`way/123`) or by type and id.
   */
  getById(
    typeOrElementKey: OverpassElementType | string,
    id?: number | string,
  ): OverpassElement | undefined {
    const key =
      id === undefined
        ? normalizeOverpassElementKey(typeOrElementKey)
        : normalizeOverpassElementKey(id, typeOrElementKey as OverpassElementType);

    return key === undefined ? undefined : this.elementsByKey.get(key);
  }

  /** Look up a node by numeric id or numeric string. */
  getNode(id: number | string): OverpassNode | undefined {
    return this.nodesById.get(Number(id));
  }

  /** Look up a way by numeric id or numeric string. */
  getWay(id: number | string): OverpassWay | undefined {
    return this.waysById.get(Number(id));
  }

  /** Look up a relation by numeric id or numeric string. */
  getRelation(id: number | string): OverpassRelation | undefined {
    return this.relationsById.get(Number(id));
  }

  /** Return whether the graph contains an element or normalized element key. */
  hasElement(element: OverpassElement | string): boolean {
    const key =
      typeof element === "string" ? normalizeOverpassElementKey(element) : this.keyOf(element);

    return key !== undefined && this.elementsByKey.has(key);
  }

  /** Build the normalized id key for an element, for example `node/123`. */
  keyOf(element: OverpassElement): string {
    return getOverpassElementKey(element);
  }

  /** Return ways that contain the given node. */
  getWaysForNode(node: OverpassNode | number | string): OverpassWay[] {
    const nodeId = typeof node === "object" ? node.id : Number(node);

    return this.waysByNodeId.get(nodeId) ?? [];
  }

  /** Return relations that directly reference the given member. */
  getRelationsForMember(
    member: OverpassElement | OverpassRelationMember | string,
  ): OverpassRelation[] {
    const key =
      typeof member === "string"
        ? normalizeOverpassElementKey(member)
        : "ref" in member
          ? `${member.type}/${member.ref}`
          : this.keyOf(member);

    return key === undefined ? [] : (this.relationsByMember.get(key) ?? []);
  }

  /** Resolve a way's node ids to available node elements, skipping missing nodes. */
  getWayNodes(way: OverpassWay | number | string): OverpassNode[] {
    const resolvedWay = typeof way === "object" ? way : this.getWay(way);

    if (resolvedWay === undefined) {
      return [];
    }

    return resolvedWay.nodes
      .map((nodeId) => this.nodesById.get(nodeId))
      .filter((node): node is OverpassNode => node !== undefined);
  }

  /** Return node ids referenced by a way but missing from this graph. */
  getMissingWayNodeIds(way: OverpassWay | number | string): number[] {
    const resolvedWay = typeof way === "object" ? way : this.getWay(way);

    if (resolvedWay === undefined) {
      return [];
    }

    return resolvedWay.nodes.filter((nodeId) => !this.nodesById.has(nodeId));
  }

  /** Resolve a relation's members to available graph elements, skipping missing members. */
  getRelationMembers(relation: OverpassRelation | number | string): OverpassElement[] {
    const resolvedRelation = typeof relation === "object" ? relation : this.getRelation(relation);

    if (resolvedRelation === undefined) {
      return [];
    }

    return resolvedRelation.members
      .map((member) => this.getById(member.type, member.ref))
      .filter((element): element is OverpassElement => element !== undefined);
  }

  /** Return relation members that are referenced but missing from this graph. */
  getMissingRelationMembers(
    relation: OverpassRelation | number | string,
  ): OverpassRelationMember[] {
    const resolvedRelation = typeof relation === "object" ? relation : this.getRelation(relation);

    if (resolvedRelation === undefined) {
      return [];
    }

    return resolvedRelation.members.filter(
      (member) => this.getById(member.type, member.ref) === undefined,
    );
  }

  private indexElements(): void {
    this.elements.forEach((element) => {
      this.elementsByKey.set(this.keyOf(element), element);

      switch (element.type) {
        case "node":
          this.nodesById.set(element.id, element);
          break;
        case "way":
          this.waysById.set(element.id, element);
          break;
        case "relation":
          this.relationsById.set(element.id, element);
          break;
      }
    });
  }

  private indexReverseReferences(): void {
    this.waysById.forEach((way) => {
      Array.from(new Set(way.nodes)).forEach((nodeId) => {
        const ways = this.waysByNodeId.get(nodeId) ?? [];
        ways.push(way);
        this.waysByNodeId.set(nodeId, ways);
      });
    });

    this.relationsById.forEach((relation) => {
      relation.members.forEach((member) => {
        const key = `${member.type}/${member.ref}`;
        const relations = this.relationsByMember.get(key) ?? [];
        relations.push(relation);
        this.relationsByMember.set(key, relations);
      });
    });
  }
}
