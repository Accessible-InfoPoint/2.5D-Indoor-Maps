import { IndoorStairPathwayInstance } from "./IndoorStairPathNetwork";

export function getInterpolatedPathLevels(
  coordinates: GeoJSON.Position[],
  instance: IndoorStairPathwayInstance,
): number[] {
  const nodeLevels = instance.source.nodeLevels.map((level) =>
    level === undefined ? undefined : level + instance.repeatOffset,
  );
  const anchors = getPathLevelAnchors(coordinates.length, nodeLevels, instance.nodeIds, instance);
  const levels: number[] = [];

  for (let anchorIndex = 0; anchorIndex < anchors.length - 1; anchorIndex++) {
    const start = anchors[anchorIndex];
    const end = anchors[anchorIndex + 1];

    for (let index = start.index; index < end.index; index++) {
      const ratio =
        end.index == start.index ? 0 : (index - start.index) / (end.index - start.index);
      levels[index] = start.level + (end.level - start.level) * ratio;
    }
  }

  const lastAnchor = anchors.at(-1);

  if (lastAnchor !== undefined) {
    levels[lastAnchor.index] = lastAnchor.level;
  }

  return levels;
}

function getPathLevelAnchors(
  coordinateCount: number,
  nodeLevels: Array<number | undefined>,
  nodeIds: number[],
  instance: IndoorStairPathwayInstance,
): Array<{ index: number; level: number }> {
  if (coordinateCount == 0) {
    return [];
  }

  const anchors: Array<{ index: number; level: number }> = [];
  const firstNodeLevel = nodeLevels[0];
  const lastNodeLevel = getLastPathNodeLevel(coordinateCount, nodeLevels, nodeIds, instance);

  anchors.push({
    index: 0,
    level: firstNodeLevel ?? instance.span.from,
  });

  nodeLevels.slice(1, -1).forEach((level, slicedIndex) => {
    if (level !== undefined) {
      anchors.push({
        index: slicedIndex + 1,
        level,
      });
    }
  });

  if (coordinateCount > 1) {
    anchors.push({
      index: coordinateCount - 1,
      level: lastNodeLevel ?? instance.span.to,
    });
  }

  return anchors;
}

function getLastPathNodeLevel(
  coordinateCount: number,
  nodeLevels: Array<number | undefined>,
  nodeIds: number[],
  instance: IndoorStairPathwayInstance,
): number | undefined {
  const lastNodeLevel = nodeLevels[coordinateCount - 1];

  if (!isClosedPathEndpoint(coordinateCount, nodeIds) || lastNodeLevel === undefined) {
    return lastNodeLevel;
  }

  const firstNodeLevel = nodeLevels[0];
  const lastInteriorNodeLevel = findLastDefinedLevel(nodeLevels.slice(1, -1));

  if (
    firstNodeLevel !== undefined &&
    lastNodeLevel == firstNodeLevel &&
    lastNodeLevel != instance.span.to &&
    lastInteriorNodeLevel !== undefined &&
    lastInteriorNodeLevel > lastNodeLevel
  ) {
    return instance.span.to;
  }

  return lastNodeLevel;
}

function isClosedPathEndpoint(coordinateCount: number, nodeIds: number[]): boolean {
  return (
    coordinateCount > 2 &&
    nodeIds.length >= coordinateCount &&
    nodeIds[0] == nodeIds[coordinateCount - 1]
  );
}

function findLastDefinedLevel(levels: Array<number | undefined>): number | undefined {
  return [...levels].reverse().find((level) => level !== undefined);
}
