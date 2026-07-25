import { LEVEL_HEIGHT, STAIRCASE_HANDRAIL_HEIGHT } from "../../../public/strings/settings.json";
import coordinateHelpers from "../../utils/coordinateHelpers";
import { getRequiredArrayValue } from "../../utils/requiredHelpers";
import { StaircaseRenderItem } from "./staircaseRenderModel";

export type StaircasePathWidth = number | number[];
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
