import { LEVEL_HEIGHT } from "../../../public/strings/settings.json";
import { IndoorHandrail } from "../../indoor/elements/IndoorHandrail";
import { IndoorLanding } from "../../indoor/elements/IndoorLanding";
import { IndoorRoom } from "../../indoor/elements/IndoorRoom";
import { IndoorStepArea } from "../../indoor/elements/IndoorStepArea";
import {
  IndoorLandingInstance,
  IndoorStairPathNetworkComponent,
  IndoorStairPathwayInstance,
} from "../../indoor/verticalConnections/IndoorStairPathNetwork";
import { IndoorVerticalConnection } from "../../indoor/verticalConnections/IndoorVerticalConnection";
import { VerticalSpan } from "../../indoor/verticalConnections/VerticalSpan";
import ColorService from "../../services/colorService";
import FeatureService from "../../services/featureService";
import coordinateHelpers from "../../utils/coordinateHelpers";
import {
  RoomRenderItem,
  StyledFeatureRenderItem,
  StyledStaircaseRenderItem,
} from "../indoorLevel/indoorLevelRenderModel";
import {
  buildHandrailLineRenderItems,
  buildSimpleStaircaseRenderItems,
  buildStaircasePathRenderItems,
  COMPLEX_STAIRCASE_THICKNESS,
  StaircasePathWidth,
  StaircaseHandrailOptions,
} from "./staircaseRenderBuilder";
import { StaircaseRenderItem } from "./staircaseRenderModel";

const STAIR_SURFACE_TAGS = { indoor: "area", stairs: "yes" };
const LOCAL_ALTITUDE = 0;
const NO_HANDRAILS: StaircaseHandrailOptions = {
  left: false,
  right: false,
  middle: false,
};
const STAIRCASE_OUTLINE_TAGS = { indoor: "wall", generated: "staircase-outline" };

export interface RawStaircaseRenderOptions {
  verticalConnections: IndoorVerticalConnection[];
  handrails: IndoorHandrail[];
  stepAreas: IndoorStepArea[];
  level: number;
  selectedFeatureIds: string[];
}

export function buildRawStaircase2DRenderItems(
  options: RawStaircaseRenderOptions,
): RoomRenderItem[] {
  return options.verticalConnections
    .filter((connection) => connection.kind == "freeFloating")
    .flatMap((connection) =>
      buildFreeFloatingStaircase2DRenderItems(connection, options.level, options.stepAreas),
    );
}

export function buildRawStaircase2DOutlineRenderItems(
  options: RawStaircaseRenderOptions,
): StyledFeatureRenderItem[] {
  return options.verticalConnections.flatMap((connection) =>
    buildConnection2DOutlineRenderItems(connection, options.level, options.stepAreas),
  );
}

export function buildRawStaircase3DRenderItems(
  options: RawStaircaseRenderOptions,
): StyledStaircaseRenderItem[] {
  const colors = ColorService.getCurrentColors();

  return options.verticalConnections.flatMap((connection): StyledStaircaseRenderItem[] => {
    const color =
      connection.footprint !== undefined &&
      options.selectedFeatureIds.includes(connection.footprint.id)
        ? colors.roomColorS
        : colors.stairsColor;

    return buildConnection3DRenderItems(
      connection,
      options.level,
      options.handrails,
      options.stepAreas,
    ).map((item) => ({
      item,
      color,
    }));
  });
}

function buildFreeFloatingStaircase2DRenderItems(
  connection: IndoorVerticalConnection,
  level: number,
  stepAreas: IndoorStepArea[],
): RoomRenderItem[] {
  const activeComponents = getActivePathComponents(connection, level);
  const pathItems = activeComponents.flatMap((component) =>
    component.pathwayInstances.flatMap((instance) => {
      const geometry = instance.source.toLineStringGeometry();

      if (geometry === undefined) {
        return [];
      }

      const width = getPathWidth(instance, geometry.coordinates, stepAreas);
      const polygon = buildFlatStairPathPolygon(geometry.coordinates, width);

      return polygon === undefined
        ? []
        : [
            buildStairSurfaceRoomRenderItem({
              type: "Feature",
              id: `free-floating-stair-path/${instance.id}`,
              properties: { ...STAIR_SURFACE_TAGS },
              geometry: polygon,
            }),
          ];
    }),
  );
  const landingItems = getUniqueLandingInstances(activeComponents).flatMap((landingInstance) =>
    buildLandingSurfaceFeatures(landingInstance).map(buildStairSurfaceRoomRenderItem),
  );

  return [...pathItems, ...landingItems];
}

function buildConnection3DRenderItems(
  connection: IndoorVerticalConnection,
  level: number,
  handrails: IndoorHandrail[],
  stepAreas: IndoorStepArea[],
): StaircaseRenderItem[] {
  if (connection.kind == "simple" && connection.footprint !== undefined) {
    return shouldRenderSimpleFootprintOnLevel(connection.footprint, level)
      ? buildSimpleFootprint3DRenderItems(connection.footprint)
      : [];
  }

  const activeComponents = getActivePathComponents(connection, level);

  return [
    ...activeComponents.flatMap((component) =>
      component.pathwayInstances.flatMap((instance) => {
        const geometry = instance.source.toLineStringGeometry();

        if (geometry === undefined) {
          return [];
        }

        const pathLevels = getInterpolatedPathLevels(geometry.coordinates, instance);

        return buildStaircasePathRenderItems(
          geometry.coordinates,
          getPathWidth(instance, geometry.coordinates, stepAreas),
          pathLevels.map((pathLevel) => getRelativeLevelAltitude(pathLevel, level)),
          LOCAL_ALTITUDE,
          getPathHandrailDefinition(connection, instance, pathLevels).options,
        );
      }),
    ),
    ...getUniqueLandingInstances(activeComponents).flatMap((landingInstance) =>
      buildLanding3DRenderItems(landingInstance, level, handrails),
    ),
  ];
}

function buildConnection2DOutlineRenderItems(
  connection: IndoorVerticalConnection,
  level: number,
  stepAreas: IndoorStepArea[],
): StyledFeatureRenderItem[] {
  if (connection.kind != "freeFloating") {
    return [];
  }

  return getActivePathComponents(connection, level).flatMap((component) =>
    component.pathwayInstances.flatMap((instance) => {
      const geometry = instance.source.toLineStringGeometry();

      if (geometry === undefined) {
        return [];
      }

      const pathLevels = getInterpolatedPathLevels(geometry.coordinates, instance);
      const handrails = getPathHandrailDefinition(connection, instance, pathLevels);

      return buildPathSideOutlineRenderItems({
        connection,
        instance,
        coordinates: geometry.coordinates,
        width: getPathWidth(instance, geometry.coordinates, stepAreas),
        handrails,
      });
    }),
  );
}

export function hasVerticalConnectionHandrailTags(connection: IndoorVerticalConnection): boolean {
  return (
    (connection.footprint !== undefined &&
      getTaggedHandrails(connection.footprint.tags).hasHandrailTags) ||
    connection.pathComponents.some((component) =>
      component.pathwayInstances.some(
        (pathwayInstance) => getTaggedHandrails(pathwayInstance.source.tags).hasHandrailTags,
      ),
    )
  );
}

function buildSimpleFootprint3DRenderItems(footprint: IndoorRoom): StaircaseRenderItem[] {
  const feature = footprint.toGeoJsonFeature();

  if (feature === undefined) {
    return [];
  }

  return getOuterRings(feature.geometry).flatMap((ring) =>
    buildSimpleStaircaseRenderItems(ring, LOCAL_ALTITUDE),
  );
}

function shouldRenderSimpleFootprintOnLevel(footprint: IndoorRoom, level: number): boolean {
  const levels = [...footprint.levels].sort((a, b) => a - b);
  const topLevel = levels.at(-1);

  return footprint.hasLevel(level) && (levels.length <= 1 || level != topLevel);
}

function getActivePathComponents(
  connection: IndoorVerticalConnection,
  level: number,
): IndoorStairPathNetworkComponent[] {
  return connection.pathComponents.filter((component) =>
    shouldRenderPathComponent(component, level),
  );
}

function shouldRenderPathComponent(
  component: IndoorStairPathNetworkComponent,
  level: number,
): boolean {
  return (
    getComponentRenderLevels(component.span).includes(level) &&
    !hasRepeatedContinuationStartingOnLevel(component, level)
  );
}

function getComponentRenderLevels(span: VerticalSpan): number[] {
  const firstLevel = Math.floor(span.from);
  const lastLevel = Number.isInteger(span.to) ? span.to : Math.floor(span.to);
  const levels: number[] = [];

  for (let level = firstLevel; level <= lastLevel; level++) {
    levels.push(level);
  }

  return levels;
}

function hasRepeatedContinuationStartingOnLevel(
  component: IndoorStairPathNetworkComponent,
  level: number,
): boolean {
  if (component.span.to != level || component.span.from == level) {
    return false;
  }

  return component.pathwayInstances.some((instance) => {
    const authoredSpan = instance.source.verticalSpan;

    if (authoredSpan === undefined) {
      return false;
    }

    return instance.source.repeatOffsets.some(
      (repeatOffset) =>
        authoredSpan.from + repeatOffset == level &&
        authoredSpan.to + repeatOffset != component.span.to,
    );
  });
}

function getPathWidth(
  instance: IndoorStairPathwayInstance,
  coordinates: GeoJSON.Position[],
  stepAreas: IndoorStepArea[],
): StaircasePathWidth {
  const explicitWidth = instance.source.explicitWidthMeters;

  if (explicitWidth !== undefined) {
    return explicitWidth;
  }

  const areaWidths = estimatePathWidthsFromStepAreas(instance, coordinates, stepAreas);

  return areaWidths ?? instance.source.widthMeters;
}

function estimatePathWidthsFromStepAreas(
  instance: IndoorStairPathwayInstance,
  coordinates: GeoJSON.Position[],
  stepAreas: IndoorStepArea[],
): number[] | undefined {
  const compatibleAreas = stepAreas.filter((area) => isCompatibleStepArea(area, instance));

  if (compatibleAreas.length == 0 || coordinates.length < 2) {
    return undefined;
  }

  const sampledWidths = coordinates.map((coordinate, index) =>
    estimatePathWidthAtCoordinate(coordinate, coordinates, index, compatibleAreas),
  );

  if (sampledWidths.every((width) => width === undefined)) {
    return undefined;
  }

  return sampledWidths.map((width) => width ?? instance.source.widthMeters);
}

function isCompatibleStepArea(
  stepArea: IndoorStepArea,
  instance: IndoorStairPathwayInstance,
): boolean {
  const levels = stepArea.levels;

  if (levels.length == 0) {
    return true;
  }

  return levels.some((level) => level >= instance.span.from && level <= instance.span.to);
}

function estimatePathWidthAtCoordinate(
  coordinate: GeoJSON.Position,
  pathCoordinates: GeoJSON.Position[],
  index: number,
  stepAreas: IndoorStepArea[],
): number | undefined {
  const origin = pathCoordinates[0];
  const projection = createLocalProjection(origin);
  const point = toLocalPoint(coordinate, projection);
  const ray = getPathWidthRay(pathCoordinates, index, projection);

  if (ray === undefined) {
    return undefined;
  }

  return stepAreas
    .flatMap((area) => getStepAreaPolygons(area))
    .map((polygon) => estimateWidthInPolygon(point, ray, polygon, projection))
    .filter((width): width is number => width !== undefined)
    .sort((a, b) => b - a)[0];
}

function getPathHandrailDefinition(
  connection: IndoorVerticalConnection,
  instance: IndoorStairPathwayInstance,
  pathLevels: number[],
): {
  hasHandrailTags: boolean;
  options: StaircaseHandrailOptions;
} {
  const pathwayHandrails = getTaggedHandrails(instance.source.tags);

  if (pathwayHandrails.hasHandrailTags) {
    return pathwayHandrails;
  }

  if (connection.footprint === undefined) {
    return {
      hasHandrailTags: false,
      options: NO_HANDRAILS,
    };
  }

  const footprintHandrails = getTaggedHandrails(connection.footprint.tags);

  if (!footprintHandrails.hasHandrailTags) {
    return {
      hasHandrailTags: false,
      options: NO_HANDRAILS,
    };
  }

  return {
    hasHandrailTags: true,
    options: orientFootprintHandrails(footprintHandrails.options, pathLevels),
  };
}

function getTaggedHandrails(tags: Record<string, string>): {
  hasHandrailTags: boolean;
  options: StaircaseHandrailOptions;
} {
  const genericHandrail = parseOsmBoolean(tags.handrail);

  return {
    hasHandrailTags:
      tags.handrail !== undefined ||
      tags["handrail:left"] !== undefined ||
      tags["handrail:right"] !== undefined ||
      tags["handrail:middle"] !== undefined,
    options: {
      left: parseOsmBoolean(tags["handrail:left"]) ?? genericHandrail ?? false,
      right: parseOsmBoolean(tags["handrail:right"]) ?? genericHandrail ?? false,
      middle: parseOsmBoolean(tags["handrail:middle"]) ?? false,
    },
  };
}

function parseOsmBoolean(value: string | undefined): boolean | undefined {
  if (value == "yes" || value == "true" || value == "1") {
    return true;
  }

  if (value == "no" || value == "false" || value == "0") {
    return false;
  }

  return undefined;
}

function orientFootprintHandrails(
  handrails: StaircaseHandrailOptions,
  pathLevels: number[],
): StaircaseHandrailOptions {
  if (!isDescendingPath(pathLevels)) {
    return handrails;
  }

  return {
    left: handrails.right,
    right: handrails.left,
    middle: handrails.middle,
  };
}

function isDescendingPath(pathLevels: number[]): boolean {
  const first = pathLevels[0];
  const last = pathLevels.at(-1);

  return first !== undefined && last !== undefined && first > last;
}

function buildPathSideOutlineRenderItems(options: {
  connection: IndoorVerticalConnection;
  instance: IndoorStairPathwayInstance;
  coordinates: GeoJSON.Position[];
  width: StaircasePathWidth;
  handrails: { hasHandrailTags: boolean; options: StaircaseHandrailOptions };
}): StyledFeatureRenderItem[] {
  return [
    buildPathSideOutlineRenderItem(options, "left"),
    buildPathSideOutlineRenderItem(options, "right"),
  ].filter((item): item is StyledFeatureRenderItem => item !== undefined);
}

function buildPathSideOutlineRenderItem(
  options: {
    connection: IndoorVerticalConnection;
    instance: IndoorStairPathwayInstance;
    coordinates: GeoJSON.Position[];
    width: StaircasePathWidth;
    handrails: { hasHandrailTags: boolean; options: StaircaseHandrailOptions };
  },
  side: "left" | "right",
): StyledFeatureRenderItem | undefined {
  const sideHasHandrail = options.handrails.options[side];
  const shouldRenderFallbackOutline = options.connection.kind == "freeFloating" && !sideHasHandrail;

  if (!sideHasHandrail && !shouldRenderFallbackOutline) {
    return undefined;
  }

  const coordinates = offsetPathByWidth(
    options.coordinates,
    options.width,
    side == "left" ? -0.5 : 0.5,
  );

  return {
    feature: {
      type: "Feature",
      id: `staircase-outline/${options.instance.id}/${side}`,
      properties: {
        ...STAIRCASE_OUTLINE_TAGS,
        side,
        handrail: sideHasHandrail ? "yes" : "no",
      },
      geometry: {
        type: "LineString",
        coordinates,
      },
    },
    style: sideHasHandrail
      ? FeatureService.getHandrailStyleFromTags({ barrier: "handrail" })
      : FeatureService.getWallStyleFromTags(STAIRCASE_OUTLINE_TAGS),
  };
}

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

function buildLanding3DRenderItems(
  landingInstance: IndoorLandingInstance,
  renderLevel: number,
  handrails: IndoorHandrail[],
): StaircaseRenderItem[] {
  return [
    ...getLandingOuterRings(landingInstance.source).map((ring): StaircaseRenderItem => ({
      type: "prism",
      coordinates: ring.map((position) => [
        position[0],
        position[1],
        getRelativeLevelAltitude(landingInstance.level, renderLevel),
      ]),
      height: COMPLEX_STAIRCASE_THICKNESS,
      altitude: LOCAL_ALTITUDE,
      materialRole: "main",
    })),
    ...buildLandingHandrail3DRenderItems(landingInstance, renderLevel, handrails),
  ];
}

function buildLandingHandrail3DRenderItems(
  landingInstance: IndoorLandingInstance,
  renderLevel: number,
  handrails: IndoorHandrail[],
): StaircaseRenderItem[] {
  return handrails
    .filter((handrail) => isHandrailAttachedToLandingInstance(handrail, landingInstance))
    .flatMap((handrail) => {
      const geometry = handrail.toLineStringGeometry();

      if (geometry === undefined) {
        return [];
      }

      const altitude = getRelativeLevelAltitude(landingInstance.level, renderLevel);

      return buildHandrailLineRenderItems(
        geometry.coordinates,
        geometry.coordinates.map(() => altitude),
        LOCAL_ALTITUDE,
      );
    });
}

export function isHandrailAttachedToLandingInstance(
  handrail: IndoorHandrail,
  landingInstance: IndoorLandingInstance,
): boolean {
  return (
    handrail.hasLevel(landingInstance.level) &&
    handrail.sharesAtLeastTwoNodes(landingInstance.nodeIds)
  );
}

function getRelativeLevelAltitude(level: number, renderLevel: number): number {
  return (level - renderLevel) * LEVEL_HEIGHT;
}

interface LocalProjection {
  longitudeOrigin: number;
  latitudeOrigin: number;
  metersPerDegreeLongitude: number;
  metersPerDegreeLatitude: number;
}

interface LocalPoint {
  x: number;
  y: number;
}

interface PathWidthRay {
  direction: LocalPoint;
}

function getStepAreaPolygons(stepArea: IndoorStepArea): GeoJSON.Position[][][] {
  const geometry = stepArea.toAreaGeometry();

  if (geometry === undefined) {
    return [];
  }

  return geometry.type == "Polygon" ? [geometry.coordinates] : geometry.coordinates;
}

function estimateWidthInPolygon(
  point: LocalPoint,
  ray: PathWidthRay,
  polygon: GeoJSON.Position[][],
  projection: LocalProjection,
): number | undefined {
  const localRings = polygon.map((ring) =>
    ring.map((coordinate) => toLocalPoint(coordinate, projection)),
  );
  const [outerRing, ...innerRings] = localRings;

  if (
    outerRing === undefined ||
    !pointInRing(point, outerRing) ||
    innerRings.some((ring) => pointInRing(point, ring))
  ) {
    return undefined;
  }

  const positiveDistance = getNearestRayBoundaryDistance(point, ray.direction, localRings);
  const negativeDistance = getNearestRayBoundaryDistance(
    point,
    scaleLocalPoint(ray.direction, -1),
    localRings,
  );

  return positiveDistance === undefined || negativeDistance === undefined
    ? undefined
    : positiveDistance + negativeDistance;
}

function getNearestRayBoundaryDistance(
  origin: LocalPoint,
  direction: LocalPoint,
  rings: LocalPoint[][],
): number | undefined {
  return rings
    .flatMap((ring) => getRingSegments(ring))
    .map(([start, end]) => getRaySegmentIntersectionDistance(origin, direction, start, end))
    .filter((distance): distance is number => distance !== undefined)
    .sort((a, b) => a - b)[0];
}

function getRingSegments(ring: LocalPoint[]): Array<[LocalPoint, LocalPoint]> {
  const segments: Array<[LocalPoint, LocalPoint]> = [];

  for (let index = 0; index < ring.length; index++) {
    const start = ring[index];
    const end = ring[(index + 1) % ring.length];

    if (start !== undefined && end !== undefined) {
      segments.push([start, end]);
    }
  }

  return segments;
}

function getRaySegmentIntersectionDistance(
  rayOrigin: LocalPoint,
  rayDirection: LocalPoint,
  segmentStart: LocalPoint,
  segmentEnd: LocalPoint,
): number | undefined {
  const segment = subtractLocalPoints(segmentEnd, segmentStart);
  const denominator = crossLocalPoints(rayDirection, segment);

  if (Math.abs(denominator) < 0.000001) {
    return undefined;
  }

  const difference = subtractLocalPoints(segmentStart, rayOrigin);
  const rayDistance = crossLocalPoints(difference, segment) / denominator;
  const segmentRatio = crossLocalPoints(difference, rayDirection) / denominator;

  return rayDistance > 0.000001 && segmentRatio >= -0.000001 && segmentRatio <= 1.000001
    ? rayDistance
    : undefined;
}

function getPathWidthRay(
  coordinates: GeoJSON.Position[],
  index: number,
  projection: LocalProjection,
): PathWidthRay | undefined {
  const current = toLocalPoint(coordinates[index], projection);
  const previous = index > 0 ? toLocalPoint(coordinates[index - 1], projection) : undefined;
  const next =
    index < coordinates.length - 1 ? toLocalPoint(coordinates[index + 1], projection) : undefined;

  if (previous === undefined && next === undefined) {
    return undefined;
  }

  const previousDirection =
    previous === undefined
      ? undefined
      : normalizeLocalPoint(subtractLocalPoints(current, previous));
  const nextDirection =
    next === undefined ? undefined : normalizeLocalPoint(subtractLocalPoints(next, current));
  const previousNormal =
    previousDirection === undefined ? undefined : rotateDirectionRight(previousDirection);
  const nextNormal = nextDirection === undefined ? undefined : rotateDirectionRight(nextDirection);
  const rawDirection =
    previousNormal !== undefined && nextNormal !== undefined
      ? addLocalPoints(previousNormal, nextNormal)
      : (previousNormal ?? nextNormal);

  if (rawDirection === undefined) {
    return undefined;
  }

  const direction =
    getLocalPointLength(rawDirection) == 0
      ? (previousNormal ?? nextNormal)
      : normalizeLocalPoint(rawDirection);

  if (direction === undefined) {
    return undefined;
  }

  return {
    direction,
  };
}

function createLocalProjection(origin: GeoJSON.Position): LocalProjection {
  const latitudeRadians = (origin[1] * Math.PI) / 180;
  const metersPerDegreeLatitude = 111_320;

  return {
    longitudeOrigin: origin[0],
    latitudeOrigin: origin[1],
    metersPerDegreeLatitude,
    metersPerDegreeLongitude: Math.max(
      Math.abs(metersPerDegreeLatitude * Math.cos(latitudeRadians)),
      0.000001,
    ),
  };
}

function toLocalPoint(coordinate: GeoJSON.Position, projection: LocalProjection): LocalPoint {
  return {
    x: (coordinate[0] - projection.longitudeOrigin) * projection.metersPerDegreeLongitude,
    y: (coordinate[1] - projection.latitudeOrigin) * projection.metersPerDegreeLatitude,
  };
}

function pointInRing(point: LocalPoint, ring: LocalPoint[]): boolean {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const current = ring[i];
    const previous = ring[j];
    const intersects =
      current.y > point.y != previous.y > point.y &&
      point.x <
        ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function subtractLocalPoints(a: LocalPoint, b: LocalPoint): LocalPoint {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  };
}

function addLocalPoints(a: LocalPoint, b: LocalPoint): LocalPoint {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
  };
}

function scaleLocalPoint(point: LocalPoint, scale: number): LocalPoint {
  return {
    x: point.x * scale,
    y: point.y * scale,
  };
}

function rotateDirectionRight(direction: LocalPoint): LocalPoint {
  return {
    x: direction.y,
    y: -direction.x,
  };
}

function normalizeLocalPoint(point: LocalPoint): LocalPoint {
  const length = getLocalPointLength(point);

  return length == 0
    ? point
    : {
        x: point.x / length,
        y: point.y / length,
      };
}

function getLocalPointLength(point: LocalPoint): number {
  return Math.hypot(point.x, point.y);
}

function crossLocalPoints(a: LocalPoint, b: LocalPoint): number {
  return a.x * b.y - a.y * b.x;
}

function buildFlatStairPathPolygon(
  coordinates: GeoJSON.Position[],
  width: StaircasePathWidth,
): GeoJSON.Polygon | undefined {
  if (coordinates.length < 2) {
    return undefined;
  }

  const left = offsetPathByWidth(coordinates, width, 0.5);
  const right = offsetPathByWidth(coordinates, width, -0.5);
  const ring = [...left, ...right.reverse(), left[0]];

  return {
    type: "Polygon",
    coordinates: [ring],
  };
}

function offsetPathByWidth(
  coordinates: GeoJSON.Position[],
  width: StaircasePathWidth,
  factor: number,
): GeoJSON.Position[] {
  return Array.isArray(width)
    ? coordinateHelpers.offsetCoordinateLineByOffsets(
        coordinates,
        width.map((value) => value * factor),
      )
    : coordinateHelpers.offsetCoordinateLine(coordinates, width * factor);
}

function buildLandingSurfaceFeatures(landingInstance: IndoorLandingInstance): GeoJSON.Feature[] {
  const geometry = landingInstance.source.toAreaGeometry();

  if (geometry === undefined) {
    return [];
  }

  return getOuterRings(geometry).map((ring, index): GeoJSON.Feature<GeoJSON.Polygon> => ({
    type: "Feature",
    id: `free-floating-stair-landing/${landingInstance.id}/${index}`,
    properties: { ...STAIR_SURFACE_TAGS },
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  }));
}

function buildStairSurfaceRoomRenderItem(
  feature: GeoJSON.Feature<GeoJSON.Polygon>,
): RoomRenderItem {
  const style = FeatureService.getFeatureStyleFromTags(STAIR_SURFACE_TAGS, "Polygon");

  return {
    feature,
    isSelected: false,
    isVisibleIn3D: false,
    style: {
      ...style,
      lineWidth: 0,
    },
  };
}

function getUniqueLandingInstances(
  components: IndoorStairPathNetworkComponent[],
): IndoorLandingInstance[] {
  const instancesById = new Map<string, IndoorLandingInstance>();

  components
    .flatMap((component) => component.landingInstances)
    .forEach((landingInstance) => instancesById.set(landingInstance.id, landingInstance));

  return Array.from(instancesById.values());
}

function getLandingOuterRings(landing: IndoorLanding): GeoJSON.Position[][] {
  const geometry = landing.toAreaGeometry();

  return geometry === undefined ? [] : getOuterRings(geometry);
}

function getOuterRings(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): GeoJSON.Position[][] {
  return geometry.type == "Polygon"
    ? [geometry.coordinates[0]]
    : geometry.coordinates.map((polygon) => polygon[0]);
}
