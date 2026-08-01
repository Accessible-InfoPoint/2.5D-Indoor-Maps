export { OsmGraph } from "./overpass/OsmGraph";

export type {
  OverpassElement,
  OverpassJson,
  OverpassNode,
  OverpassRelation,
  OverpassRelationMember,
  OverpassWay,
} from "./models/overpassJson";

export { default as CoordinateHelpers } from "./utils/coordinateHelpers";
export { arrayRange } from "./utils/arrayRange";
export { extractLevels } from "./utils/extractLevels";
export type { LevelValue } from "./utils/extractLevels";
export {
  getOverpassElementKey,
  isOverpassJson,
  nodeToPosition,
  normalizeOverpassElementKey,
} from "./utils/overpassJsonHelpers";
export { parsePositiveMeters } from "./utils/tagValueHelpers";
export { createIndoorElementRef, getLevelsFromTags } from "./models/indoorElementRef";
export type { IndoorElementRef } from "./models/indoorElementRef";
export { formatIndoorDiagnostic, IndoorDiagnostics } from "./diagnostics";
export type {
  IndoorDiagnostic,
  IndoorDiagnosticHandler,
  IndoorDiagnosticOptions,
  IndoorDiagnosticSeverity,
} from "./diagnostics";

export { createIndoorModel } from "./IndoorModel";
export type { CreateIndoorModelOptions, IndoorModel } from "./IndoorModel";
export { IndoorElementRegistry } from "./IndoorElementRegistry";
export type { IndoorElementRegistryData, IndoorModelElement } from "./IndoorElementRegistry";
export { IndoorTopology } from "./IndoorTopology";
export type { IndoorRoomConnection } from "./IndoorTopology";
export { buildIndoorOpenings } from "./IndoorOpeningBuilder";

export { IndoorElement } from "./elements/IndoorElement";
export { IndoorColumn } from "./elements/IndoorColumn";
export { IndoorDoor } from "./elements/IndoorDoor";
export { IndoorHandrail } from "./elements/IndoorHandrail";
export { IndoorLanding } from "./elements/IndoorLanding";
export { IndoorLevelOutline } from "./elements/IndoorLevelOutline";
export { IndoorPointFeature } from "./elements/IndoorPointFeature";
export { IndoorRoom } from "./elements/IndoorRoom";
export { IndoorStairPathway } from "./elements/IndoorStairPathway";
export { IndoorStepArea } from "./elements/IndoorStepArea";
export { IndoorTactilePaving } from "./elements/IndoorTactilePaving";
export { IndoorWall } from "./elements/IndoorWall";
export { buildIndoorOpeningForNode, getRoomsContainingNode } from "./elements/IndoorOpening";
export type {
  IndoorOpening,
  IndoorOpeningKind,
  IndoorOpeningSource,
  IndoorOpeningSourceRole,
} from "./elements/IndoorOpening";

export { getRelationAreaGeometry, getWayPolygonGeometry } from "./indoorAreaGeometry";
export type { IndoorAreaGeometryOptions } from "./indoorAreaGeometry";
export * from "./indoorTagFilters";
export * from "./rawIndoorElementFilters";
export { getRawElementNodeIds, getRawElementNodeIdSet } from "./rawElementNodeIds";

export { calculateOpeningOrientationGeometry } from "./openingOrientation";
export type { OpeningOrientationDebugData, OpeningOrientationGeometry } from "./openingOrientation";
export { IndoorStairPathNetwork } from "./verticalConnections/IndoorStairPathNetwork";
export type {
  IndoorLandingInstance,
  IndoorStairPathNetworkComponent,
  IndoorStairPathwayInstance,
} from "./verticalConnections/IndoorStairPathNetwork";
export { buildIndoorVerticalConnections } from "./verticalConnections/IndoorVerticalConnection";
export type {
  IndoorVerticalConnection,
  IndoorVerticalConnectionKind,
} from "./verticalConnections/IndoorVerticalConnection";
export { getInterpolatedPathLevels } from "./verticalConnections/pathLevelInterpolation";
export {
  getVerticalSpanKey,
  isLevelOnVerticalSpanBoundary,
  parseVerticalSpan,
  shiftVerticalSpan,
} from "./verticalConnections/VerticalSpan";
export type { VerticalSpan } from "./verticalConnections/VerticalSpan";
