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

export class OsmGraph {
  readonly elements: OverpassElement[];
  readonly elementsByKey = new Map<string, OverpassElement>();
  readonly nodesById = new Map<number, OverpassNode>();
  readonly waysById = new Map<number, OverpassWay>();
  readonly relationsById = new Map<number, OverpassRelation>();
  readonly waysByNodeId = new Map<number, OverpassWay[]>();
  readonly relationsByMember = new Map<string, OverpassRelation[]>();

  constructor(readonly overpassJson: OverpassJson) {
    this.elements = [...overpassJson.elements];
    this.indexElements();
    this.indexReverseReferences();
  }

  getById(elementKey: string): OverpassElement | undefined;
  getById(type: OverpassElementType, id: number | string): OverpassElement | undefined;
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

  getNode(id: number | string): OverpassNode | undefined {
    return this.nodesById.get(Number(id));
  }

  getWay(id: number | string): OverpassWay | undefined {
    return this.waysById.get(Number(id));
  }

  getRelation(id: number | string): OverpassRelation | undefined {
    return this.relationsById.get(Number(id));
  }

  hasElement(element: OverpassElement | string): boolean {
    const key =
      typeof element === "string" ? normalizeOverpassElementKey(element) : this.keyOf(element);

    return key !== undefined && this.elementsByKey.has(key);
  }

  keyOf(element: OverpassElement): string {
    return getOverpassElementKey(element);
  }

  getWaysForNode(node: OverpassNode | number | string): OverpassWay[] {
    const nodeId = typeof node === "object" ? node.id : Number(node);

    return this.waysByNodeId.get(nodeId) ?? [];
  }

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

  getWayNodes(way: OverpassWay | number | string): OverpassNode[] {
    const resolvedWay = typeof way === "object" ? way : this.getWay(way);

    if (resolvedWay === undefined) {
      return [];
    }

    return resolvedWay.nodes
      .map((nodeId) => this.nodesById.get(nodeId))
      .filter((node): node is OverpassNode => node !== undefined);
  }

  getMissingWayNodeIds(way: OverpassWay | number | string): number[] {
    const resolvedWay = typeof way === "object" ? way : this.getWay(way);

    if (resolvedWay === undefined) {
      return [];
    }

    return resolvedWay.nodes.filter((nodeId) => !this.nodesById.has(nodeId));
  }

  getRelationMembers(relation: OverpassRelation | number | string): OverpassElement[] {
    const resolvedRelation = typeof relation === "object" ? relation : this.getRelation(relation);

    if (resolvedRelation === undefined) {
      return [];
    }

    return resolvedRelation.members
      .map((member) => this.getById(member.type, member.ref))
      .filter((element): element is OverpassElement => element !== undefined);
  }

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
