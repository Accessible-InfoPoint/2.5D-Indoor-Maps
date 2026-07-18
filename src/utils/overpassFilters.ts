import { OverpassElement, OverpassJson, OverpassNode } from "../models/overpassJson";
import { getOverpassElementKey, normalizeOverpassElementKey } from "./overpassJsonHelpers";

export interface FilterOverpassByBoundsOptions {
  bearingNodeIds?: Array<number | string>;
}

interface OverpassIndex {
  elementsByKey: Map<string, OverpassElement>;
  nodesById: Map<number, OverpassNode>;
}

export function filterOverpassByElementIds(
  overpassJson: OverpassJson,
  elementIds: Array<number | string>,
): OverpassJson {
  const index = buildOverpassIndex(overpassJson);
  const includedKeys = new Set<string>();

  elementIds
    .map((elementId) => normalizeOverpassElementKey(elementId))
    .filter((key): key is string => key !== undefined)
    .forEach((key) => includeElementWithDependencies(key, index, includedKeys));

  return withFilteredElements(overpassJson, includedKeys);
}

export function filterOverpassByBounds(
  overpassJson: OverpassJson,
  boundingBox: number[],
  options: FilterOverpassByBoundsOptions = {},
): OverpassJson {
  const index = buildOverpassIndex(overpassJson);
  const includedKeys = new Set<string>();
  const bearingNodeKeys = new Set(
    (options.bearingNodeIds ?? [])
      .map((nodeId) => normalizeOverpassElementKey(nodeId, "node"))
      .filter((nodeId): nodeId is string => nodeId !== undefined),
  );

  overpassJson.elements.forEach((element) => {
    const key = getOverpassElementKey(element);

    if (
      bearingNodeKeys.has(key) ||
      (isRelevantRawIndoorElement(element) &&
        elementTouchesBoundingBox(element, boundingBox, index))
    ) {
      includeElementWithDependencies(key, index, includedKeys);
    }
  });

  return withFilteredElements(overpassJson, includedKeys);
}

function buildOverpassIndex(overpassJson: OverpassJson): OverpassIndex {
  const elementsByKey = new Map<string, OverpassElement>();
  const nodesById = new Map<number, OverpassNode>();

  overpassJson.elements.forEach((element) => {
    elementsByKey.set(getOverpassElementKey(element), element);

    if (element.type === "node") {
      nodesById.set(element.id, element);
    }
  });

  return {
    elementsByKey,
    nodesById,
  };
}

function includeElementWithDependencies(
  key: string,
  index: OverpassIndex,
  includedKeys: Set<string>,
): void {
  if (includedKeys.has(key)) {
    return;
  }

  const element = index.elementsByKey.get(key);

  if (element === undefined) {
    return;
  }

  includedKeys.add(key);

  if (element.type === "way") {
    element.nodes.forEach((nodeId) =>
      includeElementWithDependencies(`node/${nodeId}`, index, includedKeys),
    );
  } else if (element.type === "relation") {
    element.members.forEach((member) =>
      includeElementWithDependencies(`${member.type}/${member.ref}`, index, includedKeys),
    );
  }
}

function elementTouchesBoundingBox(
  element: OverpassElement,
  boundingBox: number[],
  index: OverpassIndex,
  visitedKeys = new Set<string>(),
): boolean {
  const key = getOverpassElementKey(element);

  if (visitedKeys.has(key)) {
    return false;
  }

  visitedKeys.add(key);

  switch (element.type) {
    case "node":
      return nodeIsInsideBoundingBox(element, boundingBox);
    case "way":
      return element.nodes.some((nodeId) => {
        const node = index.nodesById.get(nodeId);

        return node !== undefined && nodeIsInsideBoundingBox(node, boundingBox);
      });
    case "relation":
      return element.members.some((member) => {
        const memberElement = index.elementsByKey.get(`${member.type}/${member.ref}`);

        return (
          memberElement !== undefined &&
          elementTouchesBoundingBox(memberElement, boundingBox, index, visitedKeys)
        );
      });
  }
}

function nodeIsInsideBoundingBox(node: OverpassNode, boundingBox: number[]): boolean {
  const [west, south, east, north] = boundingBox;

  return node.lon >= west && node.lon <= east && node.lat >= south && node.lat <= north;
}

function isRelevantRawIndoorElement(element: OverpassElement): boolean {
  const tags = element.tags;

  return (
    tags !== undefined &&
    (tags.level !== undefined ||
      tags.repeat_on !== undefined ||
      tags.indoor !== undefined ||
      tags.door !== undefined)
  );
}

function withFilteredElements(overpassJson: OverpassJson, includedKeys: Set<string>): OverpassJson {
  return {
    ...overpassJson,
    elements: overpassJson.elements.filter((element) =>
      includedKeys.has(getOverpassElementKey(element)),
    ),
  };
}
