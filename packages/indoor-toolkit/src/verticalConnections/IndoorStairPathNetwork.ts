import { IndoorLanding } from "../elements/IndoorLanding";
import { IndoorStairPathway } from "../elements/IndoorStairPathway";
import {
  getVerticalSpanKey,
  isLevelOnVerticalSpanBoundary,
  shiftVerticalSpan,
  VerticalSpan,
} from "./VerticalSpan";

export interface IndoorStairPathwayInstance {
  /** Instance id including the shifted vertical span. */
  id: string;
  /** Authored pathway element that produced this repeated instance. */
  source: IndoorStairPathway;
  /** Actual vertical span for this instance after repeat offset application. */
  span: VerticalSpan;
  /** Offset from the authored pathway span. */
  repeatOffset: number;
  /** Raw pathway node ids in authored order. */
  nodeIds: number[];
}

export interface IndoorLandingInstance {
  /** Instance id including the resolved landing level. */
  id: string;
  /** Authored landing element that produced this repeated instance. */
  source: IndoorLanding;
  /** Actual level for this landing instance. */
  level: number;
  /** Offset from the authored landing level. */
  repeatOffset: number;
  /** Raw landing node ids. */
  nodeIds: number[];
}

/**
 * Connected group of pathway and landing instances for one vertical span.
 *
 * Pathway instances connect directly by shared nodes only when their spans match
 * exactly. Landings can connect components when their level lies on the span
 * boundary.
 */
export interface IndoorStairPathNetworkComponent {
  /** Stable component id derived from span and first source instance. */
  id: string;
  /** Shared vertical span of the pathway instances in this component. */
  span: VerticalSpan;
  /** Deduplicated raw node ids participating in the component. */
  nodeIds: number[];
  /** Repeated pathway instances in this component. */
  pathwayInstances: IndoorStairPathwayInstance[];
  /** Landing instances connected to this component. */
  landingInstances: IndoorLandingInstance[];
  /** Deduplicated authored pathway elements represented by the instances. */
  pathways: IndoorStairPathway[];
  /** Deduplicated authored landing elements represented by the instances. */
  landings: IndoorLanding[];
}

type StairPathNetworkElement =
  | { kind: "pathway"; instance: IndoorStairPathwayInstance; nodeIds: number[] }
  | { kind: "landing"; instance: IndoorLandingInstance; nodeIds: number[] };

/**
 * Connectivity index for stair pathway and landing instances.
 *
 * This groups repeated pathway spans and compatible landings before vertical
 * connections claim them as enclosed/open/free-floating stair structures.
 */
export class IndoorStairPathNetwork {
  /** Connected stair path components built from pathways and landings. */
  readonly components: IndoorStairPathNetworkComponent[];

  constructor(
    readonly pathways: IndoorStairPathway[],
    readonly landings: IndoorLanding[],
  ) {
    this.components = buildComponents(pathways, landings);
  }

  /** Return stair path components containing a raw node id. */
  getComponentsForNode(nodeId: number): IndoorStairPathNetworkComponent[] {
    return this.components.filter((component) => component.nodeIds.includes(nodeId));
  }

  /** Return stair path components containing any of the provided raw node ids. */
  getComponentsForNodes(nodeIds: Iterable<number>): IndoorStairPathNetworkComponent[] {
    const ids = new Set(nodeIds);

    return this.components.filter((component) =>
      component.nodeIds.some((nodeId) => ids.has(nodeId)),
    );
  }
}

function buildComponents(
  pathways: IndoorStairPathway[],
  landings: IndoorLanding[],
): IndoorStairPathNetworkComponent[] {
  const landingInstances = buildLandingInstances(landings);

  return groupPathwayInstancesBySpanKey(buildPathwayInstances(pathways)).flatMap(
    ({ span, pathwayInstances }) =>
      buildComponentsForSpan(span, pathwayInstances, landingInstances),
  );
}

function buildComponentsForSpan(
  span: VerticalSpan,
  pathwayInstances: IndoorStairPathwayInstance[],
  landingInstances: IndoorLandingInstance[],
): IndoorStairPathNetworkComponent[] {
  const elements: StairPathNetworkElement[] = [
    ...pathwayInstances.map((instance): StairPathNetworkElement => ({
      kind: "pathway",
      instance,
      nodeIds: instance.nodeIds,
    })),
    ...getCompatibleLandingInstances(span, landingInstances).map(
      (instance): StairPathNetworkElement => ({
        kind: "landing",
        instance,
        nodeIds: instance.nodeIds,
      }),
    ),
  ];
  const elementIndicesByNodeId = buildElementIndicesByNodeId(elements);
  const visited = new Set<number>();
  const components: IndoorStairPathNetworkComponent[] = [];

  elements.forEach((_element, startIndex) => {
    if (visited.has(startIndex)) {
      return;
    }

    const componentElements = collectConnectedElements(
      startIndex,
      elements,
      elementIndicesByNodeId,
      visited,
    );

    if (componentElements.some((element) => element.kind == "pathway")) {
      components.push(buildComponent(span, componentElements));
    }
  });

  return components;
}

function buildPathwayInstances(pathways: IndoorStairPathway[]): IndoorStairPathwayInstance[] {
  return pathways.flatMap((pathway) => {
    const authoredSpan = pathway.verticalSpan;

    if (authoredSpan === undefined) {
      return [];
    }

    return pathway.repeatOffsets.map((repeatOffset) => {
      const span = shiftVerticalSpan(authoredSpan, repeatOffset);

      return {
        id: `${pathway.id}@${getVerticalSpanKey(span)}`,
        source: pathway,
        span,
        repeatOffset,
        nodeIds: pathway.nodeIds,
      };
    });
  });
}

function buildLandingInstances(landings: IndoorLanding[]): IndoorLandingInstance[] {
  return landings.flatMap((landing) =>
    deduplicateLandingInstances([
      ...landing.authoredLevels.flatMap((authoredLevel) =>
        [0, ...landing.repeatOffsetValues].map((repeatOffset) =>
          buildLandingInstance(landing, authoredLevel + repeatOffset, repeatOffset),
        ),
      ),
      ...landing.repeatLevels.map((level) =>
        buildLandingInstance(landing, level, getLandingRepeatOffset(landing, level)),
      ),
    ]),
  );
}

function buildLandingInstance(
  landing: IndoorLanding,
  level: number,
  repeatOffset: number,
): IndoorLandingInstance {
  return {
    id: `${landing.id}@${level}`,
    source: landing,
    level,
    repeatOffset,
    nodeIds: landing.nodeIds,
  };
}

function getLandingRepeatOffset(landing: IndoorLanding, level: number): number {
  const authoredLevel = landing.authoredLevels[0];

  return authoredLevel === undefined ? 0 : level - authoredLevel;
}

function deduplicateLandingInstances(instances: IndoorLandingInstance[]): IndoorLandingInstance[] {
  const instancesById = new Map<string, IndoorLandingInstance>();

  instances.forEach((instance) => instancesById.set(instance.id, instance));

  return Array.from(instancesById.values());
}

function groupPathwayInstancesBySpanKey(
  pathways: IndoorStairPathwayInstance[],
): Array<{ span: VerticalSpan; pathwayInstances: IndoorStairPathwayInstance[] }> {
  const groups = new Map<
    string,
    { span: VerticalSpan; pathwayInstances: IndoorStairPathwayInstance[] }
  >();

  pathways.forEach((pathwayInstance) => {
    const key = getVerticalSpanKey(pathwayInstance.span);
    const group = groups.get(key) ?? { span: pathwayInstance.span, pathwayInstances: [] };

    group.pathwayInstances.push(pathwayInstance);
    groups.set(key, group);
  });

  return Array.from(groups.values());
}

function getCompatibleLandingInstances(
  span: VerticalSpan,
  landingInstances: IndoorLandingInstance[],
): IndoorLandingInstance[] {
  return landingInstances.filter((landing) => isLevelOnVerticalSpanBoundary(landing.level, span));
}

function buildElementIndicesByNodeId(elements: StairPathNetworkElement[]): Map<number, number[]> {
  const indicesByNodeId = new Map<number, number[]>();

  elements.forEach((element, index) => {
    element.nodeIds.forEach((nodeId) => {
      const indices = indicesByNodeId.get(nodeId) ?? [];
      indices.push(index);
      indicesByNodeId.set(nodeId, indices);
    });
  });

  return indicesByNodeId;
}

function collectConnectedElements(
  startIndex: number,
  elements: StairPathNetworkElement[],
  elementIndicesByNodeId: Map<number, number[]>,
  visited: Set<number>,
): StairPathNetworkElement[] {
  const stack = [startIndex];
  const componentElements: StairPathNetworkElement[] = [];

  while (stack.length > 0) {
    const index = stack.pop()!;

    if (visited.has(index)) {
      continue;
    }

    visited.add(index);
    const element = elements[index];
    componentElements.push(element);

    element.nodeIds.forEach((nodeId) => {
      (elementIndicesByNodeId.get(nodeId) ?? []).forEach((connectedIndex) => {
        if (!visited.has(connectedIndex)) {
          stack.push(connectedIndex);
        }
      });
    });
  }

  return componentElements;
}

function buildComponent(
  span: VerticalSpan,
  elements: StairPathNetworkElement[],
): IndoorStairPathNetworkComponent {
  const nodeIds = Array.from(new Set(elements.flatMap((element) => element.nodeIds)));
  const pathwayInstances = elements
    .filter(
      (element): element is Extract<StairPathNetworkElement, { kind: "pathway" }> =>
        element.kind == "pathway",
    )
    .map((element) => element.instance);
  const landingInstances = elements
    .filter(
      (element): element is Extract<StairPathNetworkElement, { kind: "landing" }> =>
        element.kind == "landing",
    )
    .map((element) => element.instance);
  const firstElement = elements[0]?.instance;

  return {
    id: `stair-path-network/${getVerticalSpanKey(span)}/${firstElement?.id ?? "empty"}`,
    span,
    nodeIds,
    pathwayInstances,
    landingInstances,
    pathways: Array.from(new Set(pathwayInstances.map((instance) => instance.source))),
    landings: Array.from(new Set(landingInstances.map((instance) => instance.source))),
  };
}
