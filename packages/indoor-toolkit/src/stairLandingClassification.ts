import { IndoorDiagnostics } from "./diagnostics";
import { createIndoorElementRef } from "./models/indoorElementRef";
import { OverpassElement, OverpassRelation, OverpassWay } from "./models/overpassJson";
import { OsmGraph } from "./overpass/OsmGraph";
import { getRawElementNodeIdSet } from "./rawElementNodeIds";
import { isRawIndoorStairPathwayElement } from "./rawIndoorElementFilters";

const NON_STAIR_SPACE_TAGS = new Set(["room", "corridor", "area"]);

type LandingAreaElement = OverpassWay | OverpassRelation;

/**
 * Return whether an area should be treated as a stair landing instead of a room.
 *
 * Explicit `landing=yes` always wins. Untagged `indoor=area` elements are
 * inferred as landings when their shared-node connections are only stair
 * pathways. A single connected stair pathway is still collected as a malformed
 * landing and reported as an error diagnostic.
 */
export function isIndoorLandingElement(
  graph: OsmGraph,
  element: OverpassElement,
  diagnostics?: IndoorDiagnostics,
): element is OverpassWay | OverpassRelation {
  if (hasExplicitLandingTags(element)) {
    return true;
  }

  if (!isInferredLandingCandidate(element)) {
    return false;
  }

  const connectedStairPathways = getConnectedStairPathways(graph, element);

  if (connectedStairPathways.length == 0 || hasConnectedNonStairSpace(graph, element)) {
    return false;
  }

  if (connectedStairPathways.length == 1) {
    diagnostics?.error({
      code: "IndoorLanding.single-connected-stair-path",
      message:
        `Inferred stair landing ${graph.keyOf(element)} is only connected to one stair pathway. ` +
        "A stair landing should connect at least two stair pathways or be modeled differently.",
      elementRef: createIndoorElementRef({
        id: graph.keyOf(element),
        tags: element.tags ?? {},
      }),
      sourceElement: element,
    });
  }

  return true;
}

function hasExplicitLandingTags(element: OverpassElement): boolean {
  return (
    (element.type == "way" || element.type == "relation") &&
    element.tags?.indoor == "area" &&
    element.tags.landing == "yes"
  );
}

function isInferredLandingCandidate(element: OverpassElement): element is LandingAreaElement {
  return (
    (element.type == "way" || element.type == "relation") &&
    element.tags?.indoor == "area" &&
    element.tags.stairs !== "yes" &&
    element.tags.highway !== "elevator" &&
    element.tags.highway !== "escalator"
  );
}

function getConnectedStairPathways(graph: OsmGraph, element: LandingAreaElement): OverpassWay[] {
  return getConnectedWays(graph, element).filter(isRawIndoorStairPathwayElement);
}

function hasConnectedNonStairSpace(graph: OsmGraph, element: LandingAreaElement): boolean {
  return getConnectedWays(graph, element).some(
    (way) => way.tags !== undefined && NON_STAIR_SPACE_TAGS.has(way.tags.indoor ?? ""),
  );
}

function getConnectedWays(graph: OsmGraph, element: LandingAreaElement): OverpassWay[] {
  const ownWayKeys = getOwnWayKeys(graph, element);
  const nodeIds = getRawElementNodeIdSet(graph, element);
  const connectedWaysByKey = new Map<string, OverpassWay>();

  nodeIds.forEach((nodeId) => {
    graph.getWaysForNode(nodeId).forEach((way) => {
      const key = graph.keyOf(way);

      if (!ownWayKeys.has(key)) {
        connectedWaysByKey.set(key, way);
      }
    });
  });

  return Array.from(connectedWaysByKey.values());
}

function getOwnWayKeys(graph: OsmGraph, element: LandingAreaElement): Set<string> {
  if (element.type == "way") {
    return new Set([graph.keyOf(element)]);
  }

  return new Set(
    element.members
      .filter((member) => member.type == "way")
      .map((member) => graph.getWay(member.ref))
      .filter((way): way is OverpassWay => way !== undefined)
      .map((way) => graph.keyOf(way)),
  );
}
