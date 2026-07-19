import { LEVEL_HEIGHT } from "../../../public/strings/settings.json";
import { IndoorLanding } from "../../indoor/elements/IndoorLanding";
import { IndoorRoom } from "../../indoor/elements/IndoorRoom";
import {
  IndoorLandingInstance,
  IndoorStairPathNetworkComponent,
  IndoorStairPathwayInstance,
} from "../../indoor/verticalConnections/IndoorStairPathNetwork";
import { IndoorVerticalConnection } from "../../indoor/verticalConnections/IndoorVerticalConnection";
import ColorService from "../../services/colorService";
import FeatureService from "../../services/featureService";
import coordinateHelpers from "../../utils/coordinateHelpers";
import { RoomRenderItem, StyledStaircaseRenderItem } from "../indoorLevel/indoorLevelRenderModel";
import {
  buildSimpleStaircaseRenderItems,
  buildStaircasePathRenderItems,
  COMPLEX_STAIRCASE_THICKNESS,
} from "./staircaseRenderBuilder";
import { StaircaseRenderItem } from "./staircaseRenderModel";

const STAIR_SURFACE_TAGS = { indoor: "area", stairs: "yes" };
const LOCAL_ALTITUDE = 0;

export interface RawStaircaseRenderOptions {
  verticalConnections: IndoorVerticalConnection[];
  level: number;
  selectedFeatureIds: string[];
}

export function buildRawStaircase2DRenderItems(
  options: RawStaircaseRenderOptions,
): RoomRenderItem[] {
  return options.verticalConnections
    .filter((connection) => connection.kind == "freeFloating")
    .flatMap((connection) => buildFreeFloatingStaircase2DRenderItems(connection, options.level));
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

    return buildConnection3DRenderItems(connection, options.level).map((item) => ({
      item,
      color,
    }));
  });
}

function buildFreeFloatingStaircase2DRenderItems(
  connection: IndoorVerticalConnection,
  level: number,
): RoomRenderItem[] {
  const activeComponents = getActivePathComponents(connection, level);
  const pathItems = activeComponents.flatMap((component) =>
    component.pathwayInstances.flatMap((instance) => {
      const geometry = instance.source.toLineStringGeometry();

      if (geometry === undefined) {
        return [];
      }

      const polygon = buildFlatStairPathPolygon(geometry.coordinates, instance.source.widthMeters);

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

        return buildStaircasePathRenderItems(
          geometry.coordinates,
          instance.source.widthMeters,
          getPathAltitudes(geometry.coordinates, instance, level),
          LOCAL_ALTITUDE,
        );
      }),
    ),
    ...getUniqueLandingInstances(activeComponents).flatMap((landingInstance) =>
      buildLanding3DRenderItems(landingInstance, level),
    ),
  ];
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
  return connection.pathComponents.filter(
    (component) => getComponentRenderLevel(component) == level,
  );
}

function getComponentRenderLevel(component: IndoorStairPathNetworkComponent): number {
  return Math.floor(component.span.from);
}

function getPathAltitudes(
  coordinates: GeoJSON.Position[],
  instance: IndoorStairPathwayInstance,
  renderLevel: number,
): number[] {
  const levels = getInterpolatedPathLevels(coordinates, instance);

  return levels.map((level) => getRelativeLevelAltitude(level, renderLevel));
}

function getInterpolatedPathLevels(
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
      const ratio = end.index == start.index ? 0 : (index - start.index) / (end.index - start.index);
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
): StaircaseRenderItem[] {
  return getLandingOuterRings(landingInstance.source).map((ring): StaircaseRenderItem => ({
    type: "prism",
    coordinates: ring.map((position) => [
      position[0],
      position[1],
      getRelativeLevelAltitude(landingInstance.level, renderLevel),
    ]),
    height: COMPLEX_STAIRCASE_THICKNESS,
    altitude: LOCAL_ALTITUDE,
    materialRole: "main",
  }));
}

function getRelativeLevelAltitude(level: number, renderLevel: number): number {
  return (level - renderLevel) * LEVEL_HEIGHT;
}

function buildFlatStairPathPolygon(
  coordinates: GeoJSON.Position[],
  width: number,
): GeoJSON.Polygon | undefined {
  if (coordinates.length < 2) {
    return undefined;
  }

  const left = coordinateHelpers.offsetCoordinateLine(coordinates, width / 2);
  const right = coordinateHelpers.offsetCoordinateLine(coordinates, -width / 2);
  const ring = [...left, ...right.reverse(), left[0]];

  return {
    type: "Polygon",
    coordinates: [ring],
  };
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
  return {
    feature,
    isSelected: false,
    isVisibleIn3D: false,
    style: FeatureService.getFeatureStyleFromTags(STAIR_SURFACE_TAGS, "Polygon"),
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
