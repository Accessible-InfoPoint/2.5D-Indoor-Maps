import { OverpassElement, OverpassRelation, OverpassWay } from "./models/overpassJson";
import { OsmGraph } from "./overpass/OsmGraph";

/**
 * Return raw node ids associated with an OSM element.
 *
 * Nodes return their own id, ways return their ordered node list, and relations
 * return the concatenated node ids of member ways that are available in `graph`.
 */
export function getRawElementNodeIds(graph: OsmGraph, element: OverpassElement): number[] {
  switch (element.type) {
    case "node":
      return [element.id];
    case "way":
      return [...element.nodes];
    case "relation":
      return getRelationWayNodeIds(graph, element);
  }
}

/** Return raw node ids as a set for membership checks. */
export function getRawElementNodeIdSet(graph: OsmGraph, element: OverpassElement): Set<number> {
  return new Set(getRawElementNodeIds(graph, element));
}

function getRelationWayNodeIds(graph: OsmGraph, relation: OverpassRelation): number[] {
  return relation.members
    .filter((member) => member.type == "way")
    .flatMap((member) => {
      const way = graph.getWay(member.ref);

      return way === undefined ? [] : getWayNodeIds(way);
    });
}

function getWayNodeIds(way: OverpassWay): number[] {
  return [...way.nodes];
}
