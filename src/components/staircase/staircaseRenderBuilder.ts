import { LEVEL_HEIGHT, STAIRCASE_HANDRAIL_HEIGHT } from "../../../public/strings/settings.json";
import coordinateHelpers from "../../utils/coordinateHelpers";
import { getRequiredArrayValue } from "../../utils/requiredHelpers";
import { StaircaseRenderItem } from "../indoorLevel/indoorLevelRenderModel";

export interface StaircasePathSideOffsets {
  left: number | number[];
  right: number | number[];
}

export type StaircasePathWidth = number | number[] | StaircasePathSideOffsets;
export type StaircasePath = [coordinates: GeoJSON.Position[], width: StaircasePathWidth];
export interface StaircaseHandrailOptions {
  left: boolean;
  right: boolean;
  middle: boolean;
}

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

export function buildStaircasePathRenderItems(
  lineString: GeoJSON.Position[],
  width: StaircasePathWidth,
  altitudes: number[],
  altitude: number,
  handrails: StaircaseHandrailOptions = LEGACY_STAIRCASE_HANDRAILS,
): StaircaseRenderItem[] {
  const rightEdgeLine = offsetStaircasePathSide(lineString, width, "right");
  const leftEdgeLine = offsetStaircasePathSide(lineString, width, "left");
  const renderItems: StaircaseRenderItem[] = buildStaircaseFloorRenderItems(
    leftEdgeLine,
    rightEdgeLine,
    altitudes,
    altitude,
  );

  if (handrails.left) {
    renderItems.push(
      ...buildHandrailLineRenderItems(
        offsetStaircasePathSide(lineString, width, "left", COMPLEX_STAIRCASE_THICKNESS / 2),
        altitudes,
        altitude,
      ),
    );
  }

  if (handrails.right) {
    renderItems.push(
      ...buildHandrailLineRenderItems(
        offsetStaircasePathSide(lineString, width, "right", -COMPLEX_STAIRCASE_THICKNESS / 2),
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

export function offsetStaircasePathSide(
  lineString: GeoJSON.Position[],
  width: StaircasePathWidth,
  side: "left" | "right",
  inset = 0,
): GeoJSON.Position[] {
  const sign = side == "left" ? -1 : 1;

  if (isStaircasePathSideOffsets(width)) {
    const sideOffset = width[side];

    return Array.isArray(sideOffset)
      ? coordinateHelpers.offsetCoordinateLineByOffsets(
          lineString,
          sideOffset.map((value) => value * sign + inset),
        )
      : coordinateHelpers.offsetCoordinateLine(lineString, sideOffset * sign + inset);
  }

  return Array.isArray(width)
    ? coordinateHelpers.offsetCoordinateLineByOffsets(
        lineString,
        width.map((value) => value * 0.5 * sign + inset),
      )
    : coordinateHelpers.offsetCoordinateLine(lineString, width * 0.5 * sign + inset);
}

function isStaircasePathSideOffsets(width: StaircasePathWidth): width is StaircasePathSideOffsets {
  return typeof width == "object" && !Array.isArray(width);
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
