import { LEVEL_HEIGHT, STAIRCASE_HANDRAIL_HEIGHT } from "../../../public/strings/settings.json";
import coordinateHelpers from "../../utils/coordinateHelpers";
import { extractLevels } from "../../utils/extractLevels";
import { getRequiredFeatureId, getRequiredFeatureProperties } from "../../utils/geoJsonHelpers";
import { getRequiredArrayValue } from "../../utils/requiredHelpers";
import { StaircaseRenderItem } from "./staircaseRenderModel";

export type StaircasePathWidth = number | number[];
export type StaircasePath = [coordinates: GeoJSON.Position[], width: StaircasePathWidth];
export interface StaircaseHandrailOptions {
  left: boolean;
  right: boolean;
  middle: boolean;
}

const defaultStaircaseWidth = 1;
export const COMPLEX_STAIRCASE_THICKNESS = 0.05;
const LEGACY_STAIRCASE_HANDRAILS: StaircaseHandrailOptions = {
  left: true,
  right: true,
  middle: false,
};

export function buildSimpleStaircaseRenderItems(
  coordinates: GeoJSON.Position[],
  altitude: number,
): StaircaseRenderItem[] {
  return [
    {
      type: "prism",
      coordinates: coordinates.map((pos) => [pos[0], pos[1], 0]),
      height: LEVEL_HEIGHT,
      altitude,
      materialRole: "main",
    },
    ...coordinateHelpers
      .simplifyByAngle(coordinates, 5)
      .slice(0, -1)
      .map((coordinate): StaircaseRenderItem => ({
        type: "cylinder",
        coordinate,
        height: LEVEL_HEIGHT,
        altitude,
        radius: 0.02,
        radialSegments: 10,
        materialRole: "outline",
      })),
  ];
}

export function buildComplexStaircaseRenderItems(
  lineStrings: StaircasePath[],
  allNodes: GeoJSON.Feature[],
  altitude: number,
): StaircaseRenderItem[] {
  return lineStrings.flatMap(([lineString, width]) => {
    const altitudes = getLineStringAltitudes(lineString, allNodes);

    return buildStaircasePathRenderItems(lineString, width, altitudes, altitude);
  });
}

export function buildStaircasePathRenderItems(
  lineString: GeoJSON.Position[],
  width: StaircasePathWidth,
  altitudes: number[],
  altitude: number,
  handrails: StaircaseHandrailOptions = LEGACY_STAIRCASE_HANDRAILS,
): StaircaseRenderItem[] {
  const rightEdgeLine = offsetPathByWidth(lineString, width, 0.5);
  const leftEdgeLine = offsetPathByWidth(lineString, width, -0.5);
  const renderItems: StaircaseRenderItem[] = buildStaircaseFloorRenderItems(
    leftEdgeLine,
    rightEdgeLine,
    altitudes,
    altitude,
  );

  if (handrails.left) {
    renderItems.push(
      ...buildHandrailLineRenderItems(
        offsetPathByWidth(lineString, width, -0.5, COMPLEX_STAIRCASE_THICKNESS / 2),
        altitudes,
        altitude,
      ),
    );
  }

  if (handrails.right) {
    renderItems.push(
      ...buildHandrailLineRenderItems(
        offsetPathByWidth(lineString, width, 0.5, -COMPLEX_STAIRCASE_THICKNESS / 2),
        altitudes,
        altitude,
      ),
    );
  }

  if (handrails.middle) {
    renderItems.push(...buildHandrailLineRenderItems(lineString, altitudes, altitude));
  }

  return renderItems;
}

function offsetPathByWidth(
  lineString: GeoJSON.Position[],
  width: StaircasePathWidth,
  factor: number,
  inset = 0,
): GeoJSON.Position[] {
  return Array.isArray(width)
    ? coordinateHelpers.offsetCoordinateLineByOffsets(
        lineString,
        width.map((value) => value * factor + inset),
      )
    : coordinateHelpers.offsetCoordinateLine(lineString, width * factor + inset);
}

function buildStaircaseFloorRenderItems(
  leftEdgeLine: GeoJSON.Position[],
  rightEdgeLine: GeoJSON.Position[],
  altitudes: number[],
  altitude: number,
): StaircaseRenderItem[] {
  const renderItems: StaircaseRenderItem[] = [];

  for (let i = 0; i < leftEdgeLine.length - 1; i++) {
    const leftStart = getRequiredArrayValue(leftEdgeLine, i, "Staircase left edge line");
    const leftEnd = getRequiredArrayValue(leftEdgeLine, i + 1, "Staircase left edge line");
    const rightStart = getRequiredArrayValue(rightEdgeLine, i, "Staircase right edge line");
    const rightEnd = getRequiredArrayValue(rightEdgeLine, i + 1, "Staircase right edge line");
    const startAltitude = getRequiredArrayValue(altitudes, i, "Staircase altitudes");
    const endAltitude = getRequiredArrayValue(altitudes, i + 1, "Staircase altitudes");

    renderItems.push({
      type: "prism",
      coordinates: [
        [...leftStart, startAltitude],
        [...leftEnd, endAltitude],
        [...rightEnd, endAltitude],
        [...rightStart, startAltitude],
        [...leftStart, startAltitude],
      ],
      height: COMPLEX_STAIRCASE_THICKNESS,
      altitude,
      materialRole: "main",
    });
  }

  return renderItems;
}

export function buildHandrailLineRenderItems(
  lineString: GeoJSON.Position[],
  altitudes: number[],
  altitude: number,
): StaircaseRenderItem[] {
  if (lineString.length < 2) {
    return [];
  }

  const leftLine = coordinateHelpers.offsetCoordinateLine(
    lineString,
    -COMPLEX_STAIRCASE_THICKNESS / 2,
  );
  const rightLine = coordinateHelpers.offsetCoordinateLine(
    lineString,
    COMPLEX_STAIRCASE_THICKNESS / 2,
  );
  const renderItems: StaircaseRenderItem[] = [];

  for (let index = 0; index < lineString.length - 1; index++) {
    renderItems.push({
      type: "prism",
      coordinates: buildHandrailLineSegmentCoordinates(leftLine, rightLine, altitudes, index),
      height: STAIRCASE_HANDRAIL_HEIGHT,
      altitude,
      materialRole: "main",
    });
  }

  return renderItems;
}

function buildHandrailLineSegmentCoordinates(
  leftLine: GeoJSON.Position[],
  rightLine: GeoJSON.Position[],
  altitudes: number[],
  index: number,
): GeoJSON.Position[] {
  const leftStart = getRequiredArrayValue(leftLine, index, "Handrail line");
  const leftEnd = getRequiredArrayValue(leftLine, index + 1, "Handrail line");
  const rightStart = getRequiredArrayValue(rightLine, index, "Handrail opposite line");
  const rightEnd = getRequiredArrayValue(rightLine, index + 1, "Handrail opposite line");
  const startAltitude = getRequiredArrayValue(altitudes, index, "Handrail altitudes");
  const endAltitude = getRequiredArrayValue(altitudes, index + 1, "Handrail altitudes");

  return [
    [...leftStart, startAltitude],
    [...leftEnd, endAltitude],
    [...rightEnd, endAltitude],
    [...rightStart, startAltitude],
    [...leftStart, startAltitude],
  ];
}

export function filterConnectedPathways(
  feature: GeoJSON.Feature,
  doors: GeoJSON.Position[],
  lowestPoints: GeoJSON.Feature[],
  pathways: GeoJSON.Feature[],
  level: number,
): StaircasePath[] {
  const connectedPathways = new Set<GeoJSON.Feature>();
  const featurePathCoordinates = getFeaturePathCoordinates(feature);
  if (!featurePathCoordinates) {
    return [];
  }

  const lowestNodesOnCurrentLevel = featurePathCoordinates.filter((point) =>
    lowestPoints.some(
      (lowestPoint) =>
        isFeatureAtPosition(lowestPoint, point) && isFeatureOnLevel(lowestPoint, level),
    ),
  );
  const doorNodes = featurePathCoordinates.filter((point) =>
    doors.some((door) => isSamePosition(door, point)),
  );
  const specialNodes = lowestNodesOnCurrentLevel.length > 0 ? lowestNodesOnCurrentLevel : doorNodes;

  specialNodes.forEach((specialNode) => {
    const paths = pathways.filter((path) => isRelevantPathway(path, specialNode, level));

    paths.forEach((path) => {
      const pathCoordinates = getFeaturePathCoordinates(path);
      if (!pathCoordinates) {
        return;
      }

      const lowestIndex = pathCoordinates.findIndex((point) =>
        lowestPoints.some((lowestPoint) =>
          isSamePosition((lowestPoint.geometry as GeoJSON.Point).coordinates, point),
        ),
      );

      if (lowestIndex > pathCoordinates.length / 2) {
        connectedPathways.add({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [...pathCoordinates].reverse(),
          },
          properties: getRequiredFeatureProperties(path),
          id: path.id,
          bbox: path.bbox,
        });
      } else {
        connectedPathways.add(path);
      }

      const otherNodes = pathCoordinates.filter(
        (point) => point[0] != specialNode[0] || point[1] != specialNode[1],
      );
      const connectedPathwayIds = new Set(
        Array.from(connectedPathways, (connected) => connected.id),
      );
      const secondDegreePaths = otherNodes.flatMap((otherNode) =>
        pathways.filter((pathway) => {
          const pathwayCoordinates = getFeaturePathCoordinates(pathway);

          return (
            pathwayCoordinates != undefined &&
            pathwayCoordinates.some(
              (pathwayPoint) => pathwayPoint[0] == otherNode[0] && pathwayPoint[1] == otherNode[1],
            ) &&
            !connectedPathwayIds.has(getRequiredFeatureId(pathway))
          );
        }),
      );
      secondDegreePaths.forEach((secondDegreePath) => {
        connectedPathways.add(secondDegreePath);
      });
    });
  });

  return Array.from(connectedPathways).flatMap((feature): StaircasePath[] => {
    const coordinates = getFeaturePathCoordinates(feature);
    if (!coordinates) {
      return [];
    }

    const properties = getRequiredFeatureProperties(feature);
    const width = "width" in properties ? parseFloat(properties.width) : defaultStaircaseWidth;

    return [[coordinates, Number.isFinite(width) && width > 0 ? width : defaultStaircaseWidth]];
  });
}

function getLineStringAltitudes(
  lineString: GeoJSON.Position[],
  allNodes: GeoJSON.Feature[],
): number[] {
  const nodeLevels = lineString.map((point) => {
    const potentialNode = findNodeAtPosition(point, allNodes);

    if (!potentialNode) return undefined;

    return getRequiredFeatureProperties(potentialNode)["level"];
  });

  if (nodeLevels.every((level) => level != undefined)) {
    const parsedNodeLevels = nodeLevels.map(parseFloat);

    if (parsedNodeLevels.every(Number.isFinite)) {
      const min = Math.min(...parsedNodeLevels);
      const max = Math.max(...parsedNodeLevels);

      if (max == min) {
        return lineString.map(() => 0);
      }

      return lineString.map((point) => {
        const node = findNodeAtPosition(point, allNodes);

        if (!node) {
          throw new Error(`Staircase node for coordinate "${point.toString()}" was not found.`);
        }

        return (
          ((parseFloat(getRequiredFeatureProperties(node)["level"]) - min) / (max - min)) *
          (LEVEL_HEIGHT - COMPLEX_STAIRCASE_THICKNESS)
        );
      });
    }
  }

  return lineString.map(
    (_point, index) =>
      (index / (lineString.length - 1)) * (LEVEL_HEIGHT - COMPLEX_STAIRCASE_THICKNESS),
  );
}

function isRelevantPathway(
  path: GeoJSON.Feature,
  specialNode: GeoJSON.Position,
  level: number,
): boolean {
  const pathCoordinates = getFeaturePathCoordinates(path);
  if (!pathCoordinates) {
    return false;
  }

  const properties = getRequiredFeatureProperties(path);

  return (
    pathCoordinates.some((lineStringPoint) => isSamePosition(lineStringPoint, specialNode)) &&
    (properties.level.at(-1) != level || // when staircase goes from level 0-3, it does not start at level 3, so we filter it out. Also: must be array, as we make that the case in backendService for all polygons and lineStrings
      extractLevels(properties.repeat_on).includes(level))
  );
}

function findNodeAtPosition(
  point: GeoJSON.Position,
  allNodes: GeoJSON.Feature[],
): GeoJSON.Feature | undefined {
  return allNodes.find((node) =>
    isSamePosition((node.geometry as GeoJSON.Point).coordinates, point),
  );
}

function isFeatureAtPosition(feature: GeoJSON.Feature, point: GeoJSON.Position): boolean {
  return isSamePosition((feature.geometry as GeoJSON.Point).coordinates, point);
}

function isFeatureOnLevel(feature: GeoJSON.Feature, level: number): boolean {
  const properties = getRequiredFeatureProperties(feature);

  return (
    extractLevels(properties.level).includes(level) ||
    extractLevels(properties.repeat_on).includes(level)
  );
}

function getFeaturePathCoordinates(feature: GeoJSON.Feature): GeoJSON.Position[] | undefined {
  const geometry = feature.geometry;

  if (!geometry) {
    console.error("Skipping staircase pathway without geometry.", feature);
    return undefined;
  }

  if (geometry.type == "LineString") {
    return geometry.coordinates;
  }

  if (geometry.type == "Polygon") {
    return getRequiredArrayValue(geometry.coordinates, 0, "Staircase pathway polygon coordinates");
  }

  console.error(
    `Skipping staircase pathway with unsupported geometry type "${geometry.type}".`,
    feature,
  );
  return undefined;
}

function isSamePosition(a: GeoJSON.Position, b: GeoJSON.Position): boolean {
  return a.toString() == b.toString();
}
