import { OsmGraph } from "../../overpass/OsmGraph";
import { isStaircaseTags } from "../indoorTagFilters";
import { getRawElementNodeIds } from "../rawElementNodeIds";
import { IndoorRoom } from "../elements/IndoorRoom";
import { IndoorStairPathNetwork, IndoorStairPathNetworkComponent } from "./IndoorStairPathNetwork";

export type IndoorVerticalConnectionKind = "simple" | "open" | "freeFloating";

export interface IndoorVerticalConnection {
  id: string;
  kind: IndoorVerticalConnectionKind;
  footprint?: IndoorRoom;
  pathComponents: IndoorStairPathNetworkComponent[];
}

export function buildIndoorVerticalConnections(
  graph: OsmGraph,
  rooms: IndoorRoom[],
  pathNetwork: IndoorStairPathNetwork,
): IndoorVerticalConnection[] {
  const claimedPathComponentIds = new Set<string>();
  const footprintConnections = rooms
    .map((room): IndoorVerticalConnection | undefined =>
      buildFootprintConnection(graph, room, pathNetwork, claimedPathComponentIds),
    )
    .filter((connection): connection is IndoorVerticalConnection => connection !== undefined);
  const freeFloatingConnections = buildFreeFloatingConnections(
    pathNetwork.components.filter((component) => !claimedPathComponentIds.has(component.id)),
  );

  return [...footprintConnections, ...freeFloatingConnections];
}

function buildFootprintConnection(
  graph: OsmGraph,
  room: IndoorRoom,
  pathNetwork: IndoorStairPathNetwork,
  claimedPathComponentIds: Set<string>,
): IndoorVerticalConnection | undefined {
  const kind = getFootprintConnectionKind(room);

  if (kind === undefined) {
    return undefined;
  }

  const footprintNodeIds = getRawElementNodeIds(graph, room.sourceElement);
  const pathComponents = pathNetwork.getComponentsForNodes(footprintNodeIds);

  pathComponents.forEach((component) => claimedPathComponentIds.add(component.id));

  return {
    id: `vertical-connection/${room.id}`,
    kind,
    footprint: room,
    pathComponents,
  };
}

function buildFreeFloatingConnections(
  components: IndoorStairPathNetworkComponent[],
): IndoorVerticalConnection[] {
  return groupComponentsBySharedLandingInstances(
    components.filter((component) => component.pathways.length > 0),
  ).map((pathComponents): IndoorVerticalConnection => ({
    id: `vertical-connection/${pathComponents[0]?.id ?? "empty"}`,
    kind: "freeFloating",
    pathComponents,
  }));
}

function groupComponentsBySharedLandingInstances(
  components: IndoorStairPathNetworkComponent[],
): IndoorStairPathNetworkComponent[][] {
  const indicesByLandingInstanceId = buildComponentIndicesByLandingInstanceId(components);
  const visited = new Set<number>();
  const groups: IndoorStairPathNetworkComponent[][] = [];

  components.forEach((_component, startIndex) => {
    if (visited.has(startIndex)) {
      return;
    }

    groups.push(
      collectConnectedComponents(startIndex, components, indicesByLandingInstanceId, visited),
    );
  });

  return groups;
}

function buildComponentIndicesByLandingInstanceId(
  components: IndoorStairPathNetworkComponent[],
): Map<string, number[]> {
  const indicesByLandingInstanceId = new Map<string, number[]>();

  components.forEach((component, index) => {
    component.landingInstances.forEach((landingInstance) => {
      const indices = indicesByLandingInstanceId.get(landingInstance.id) ?? [];
      indices.push(index);
      indicesByLandingInstanceId.set(landingInstance.id, indices);
    });
  });

  return indicesByLandingInstanceId;
}

function collectConnectedComponents(
  startIndex: number,
  components: IndoorStairPathNetworkComponent[],
  indicesByLandingInstanceId: Map<string, number[]>,
  visited: Set<number>,
): IndoorStairPathNetworkComponent[] {
  const stack = [startIndex];
  const group: IndoorStairPathNetworkComponent[] = [];

  while (stack.length > 0) {
    const index = stack.pop()!;

    if (visited.has(index)) {
      continue;
    }

    visited.add(index);
    const component = components[index];
    group.push(component);

    component.landingInstances.forEach((landingInstance) => {
      (indicesByLandingInstanceId.get(landingInstance.id) ?? []).forEach((connectedIndex) => {
        if (!visited.has(connectedIndex)) {
          stack.push(connectedIndex);
        }
      });
    });
  }

  return group;
}

function getFootprintConnectionKind(room: IndoorRoom): IndoorVerticalConnectionKind | undefined {
  if (!isStaircaseTags(room.tags)) {
    return undefined;
  }

  if (room.tags.indoor == "room") {
    return "simple";
  }

  if (room.tags.indoor == "area") {
    return "open";
  }

  return undefined;
}
