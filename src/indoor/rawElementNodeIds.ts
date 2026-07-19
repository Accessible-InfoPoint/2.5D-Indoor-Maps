import { OverpassElement, OverpassRelation, OverpassWay } from "../models/overpassJson";
import { OsmGraph } from "../overpass/OsmGraph";

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
