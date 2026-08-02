# Indoor Toolkit Core

Indoor Toolkit Core parses raw OpenStreetMap indoor data into a typed domain model. It is intended for tools that need to reason about indoor elements before rendering them, such as map renderers, accessibility interfaces, routing graph builders, or building data inspection tools.

The package follows the Simple Indoor Tagging schema and keeps the raw OSM element relationships available through an `OsmGraph`. It does not download Overpass data, choose a building, or prescribe a specific renderer.

## Installation

```sh
npm install @indoortoolkit/core
```

## Basic Usage

```ts
import { createIndoorModel, OverpassJson } from "@indoortoolkit/core";

const indoor: OverpassJson = await loadIndoorOverpassJson();

const model = createIndoorModel(indoor);

for (const room of model.elements.rooms) {
  console.log(room.id, room.levels, room.tags.name, room.geometry);
}

for (const opening of model.topology.getOpeningsForRoom("way/123")) {
  console.log(opening.id, opening.connectedRooms, opening.orientationGeometry);
}
```

For more complete parser examples, see [docs/parser-guide.md](docs/parser-guide.md).

## Input Data

`createIndoorModel` expects already loaded raw indoor Overpass JSON:

```ts
const model = createIndoorModel(indoor);
```

The input uses the normal Overpass JSON shape with an `elements` array. The parser builds `model.graph`, an `OsmGraph` over those indoor elements.

The package assumes the caller already queried and filtered the relevant indoor data. Query generation, cache validation, building selection, building outlines, bounding boxes, and building metadata should live outside this package.

Building-level metadata that affects parsing can be passed as options. For example, if a building declares intentionally missing floors through `non_existent_levels=*`, parse that tag in the application and pass it to the model:

```ts
const model = createIndoorModel(indoor, {
  nonExistentLevels: [13],
});
```

Those levels are omitted when ordinary element level ranges are expanded, so `level=12-14` becomes levels `12` and `14` when level `13` is configured as non-existent. The same option also lets stair pathway spans use semicolon lists across intentionally skipped levels.

## Indoor Model

The main output is `IndoorModel`:

```ts
const model = createIndoorModel(indoor);
```

It contains:

- `rawIndoorData`: the original raw indoor Overpass JSON.
- `graph`: an `OsmGraph` for raw OSM relationships.
- `elements`: parsed indoor element collections and lookup helpers.
- `topology`: factual relationships between rooms, openings, walls, and vertical connections.
- `diagnostics`: parser warnings and errors collected while the model and lazy geometries are built.
- `levels`: sorted numeric indoor levels.
- `levelLabels`: optional labels from `level:ref`.
- `stairPathNetwork`: connected pathway and landing components used by vertical connections.

The element collections are available through `model.elements`:

```ts
const room = model.elements.getById("way/123");
const selected = model.elements.getByRef(searchResult.elementRef);
const levelElements = model.elements.getByLevel(0);
```

`model.elements` contains:

- `levelOutlines`: `indoor=level` geometries.
- `rooms`: rooms, corridors, and indoor areas.
- `doors`: explicit door nodes.
- `openings`: explicit doors, inferred open staircase footprint connections, and topology-only pathway/landing connections.
- `walls`: wall ways and wall areas.
- `handrails`: `barrier=handrail` ways.
- `columns`: indoor columns from nodes, ways, or relations.
- `pointFeatures`: point-like accessibility and information features.
- `tactilePaving`: tactile guidance ways.
- `stepAreas`: `area:highway=steps` areas.
- `stairPathways`: stair middle lines.
- `stairLandings`: stair landing areas.
- `verticalConnections`: stair and elevator-like vertical connections.

Each element keeps its source OSM element and tags so downstream tools can apply their own styling, routing, or accessibility interpretation.

## Indoor Element Boundary

Most parsed objects derive from `IndoorElement`. This is the parser boundary: an indoor element knows its raw OSM source, normalized id, tags, levels, graph context, and semantic geometry where the parser can derive it.

```ts
import { IndoorElement } from "@indoortoolkit/core";

function elementLabel(element: IndoorElement): string {
  return element.tags.name ?? element.id;
}
```

The base class intentionally does not define renderer-specific output. Subclasses expose parser-level semantics:

- `IndoorRoom` exposes room/corridor/area geometry and room-like tags.
- `IndoorWall`, `IndoorHandrail`, `IndoorTactilePaving`, and `IndoorStairPathway` expose line or area geometry.
- `IndoorColumn` and `IndoorPointFeature` expose point or area geometry depending on their OSM element type.
- `IndoorDoor` represents explicit door nodes.
- `IndoorOpening` represents pass-through openings derived from doors or inferred staircase connections. Some openings have render orientation geometry; pathway/landing openings are topology-only.
- `IndoorVerticalConnection` groups footprints, stair paths, and landings into reusable vertical connection semantics.

Renderers, routing tools, and validators should consume these element objects and then build their own output model. For example, a MapLibre renderer might turn an `IndoorRoom` into a fill layer feature, while a routing graph may turn an `IndoorOpening` into an edge or node.

## Graph Access

`OsmGraph` indexes raw Overpass data by OSM type and id:

```ts
const graph = model.graph;

const node = graph.getNode(123);
const way = graph.getWay(456);
const element = graph.getById("way/456");
const waysUsingNode = graph.getWaysByNodeId(123);
const relationsUsingMember = graph.getRelationsByMember("way/456");
```

Use the graph when relationships matter, for example to find whether a door node belongs to a wall, whether a pathway shares nodes with a staircase footprint, or which ways make up a relation.

## Topology

`model.topology` exposes factual relationships derived from raw OSM membership and parsed indoor semantics:

```ts
const openings = model.topology.getOpeningsForRoom("way/10");
const rooms = model.topology.getRoomsForOpening("node/2");
const connectedRooms = model.topology.getConnectedRooms("way/10");
const roomPairs = model.topology.getConnectedRoomPairs();
const roomsAtNode = model.topology.getRoomsAtNode(2, 0);
const wallsAtNode = model.topology.getWallsAtNode(2, 0);
const pathwayOpenings = model.topology.getOpeningsForStairPathway("way/100");
const landingOpenings = model.topology.getOpeningsForStairLanding("way/200@0.5");
const verticalConnections = model.topology.getVerticalConnectionsForLevel(0);
const directConnections = model.topology.getVerticalConnectionsBetweenLevels(0, 1);
```

This is not a routing graph. Routing tools can use these relationships to decide whether doors become graph nodes, edges, costs, restrictions, or human-review checkpoints.

## Geometry

Elements expose geometry where it can be derived from the raw OSM graph. Geometry is represented with GeoJSON geometry types and positions, but the model is not a GeoJSON feature collection and does not erase OSM ids, tags, members, or node references.

Renderers can convert element geometry into their own render items:

```ts
const roomPolygons = model.elements.rooms
  .filter((room) => room.hasLevel(0))
  .map((room) => ({
    id: room.id,
    tags: room.tags,
    geometry: room.geometry,
  }));
```

## Supported Element Families

The current parser collects:

- Level outlines from `indoor=level`.
- Rooms, corridors, and areas from `indoor=room`, `indoor=corridor`, and `indoor=area`.
- Doors from door nodes.
- Openings from explicit doors, inferred open staircase footprint connections, and topology-only pathway/landing connections.
- Walls from `indoor=wall` and handrails from `barrier=handrail`.
- Columns from `indoor=column`.
- Information points and accessibility point features.
- Tactile paving from `indoor=yes` and `tactile_paving=yes`.
- Vertical connections from staircase/elevator footprints, stair pathways, stair landings, and repeated level ranges.

The detailed parser behavior and tagging expectations are documented in [docs/parser-guide.md](docs/parser-guide.md).

## Warnings And Invalid Data

The parser favors partial model creation over failing the whole building. Unsupported or incomplete elements are skipped with descriptive diagnostics where possible. This makes it usable with real-world OSM data while still surfacing data issues that a validator or editor can act on.

```ts
const model = createIndoorModel(indoor, {
  onDiagnostic: (diagnostic) => reportToEditor(diagnostic),
  logDiagnostics: true,
});

console.log(model.diagnostics);
```

Diagnostics are collected silently by default. Set `logDiagnostics: true` to forward them to `console.warn`, or pass `onDiagnostic` to integrate them with an editor, validator, test harness, or application log.

Examples of warning cases include missing nodes, unsupported area-wall door connections, incomplete relation geometry, and stair pathways without usable geometry.

## Package Boundary

This package should stay renderer-independent. It should parse and expose indoor semantics and geometry, while applications decide:

- how to fetch or cache Overpass data,
- how to select a building,
- how to style rooms, doors, stairs, and markers,
- how to build MapLibre, Three.js, SVG, or routing-specific output.
