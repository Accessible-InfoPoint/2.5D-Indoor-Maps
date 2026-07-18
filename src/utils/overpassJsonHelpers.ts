import {
  OverpassElement,
  OverpassJson,
  OverpassNode,
  OverpassRelation,
  OverpassWay,
} from "../models/overpassJson";

export function isOverpassJson(value: unknown): value is OverpassJson {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { elements?: unknown }).elements) &&
    (value as { elements: unknown[] }).elements.every(isOverpassElement)
  );
}

export function getOverpassElementKey(element: OverpassElement): string {
  return `${element.type}/${element.id}`;
}

function isOverpassElement(value: unknown): value is OverpassElement {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const element = value as Partial<OverpassElement>;

  if (typeof element.id !== "number") {
    return false;
  }

  switch (element.type) {
    case "node":
      return isOverpassNode(element as Partial<OverpassNode>);
    case "way":
      return isOverpassWay(element as Partial<OverpassWay>);
    case "relation":
      return isOverpassRelation(element as Partial<OverpassRelation>);
    default:
      return false;
  }
}

function isOverpassNode(element: Partial<OverpassNode>): boolean {
  return typeof element.lat === "number" && typeof element.lon === "number";
}

function isOverpassWay(element: Partial<OverpassWay>): boolean {
  return (
    Array.isArray(element.nodes) && element.nodes.every((nodeId) => typeof nodeId === "number")
  );
}

function isOverpassRelation(element: Partial<OverpassRelation>): boolean {
  return (
    Array.isArray(element.members) &&
    element.members.every(
      (member) =>
        typeof member === "object" &&
        member !== null &&
        ["node", "way", "relation"].includes(member.type) &&
        typeof member.ref === "number" &&
        typeof member.role === "string",
    )
  );
}
