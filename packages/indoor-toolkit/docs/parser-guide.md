# Indoor Toolkit Parser Guide

Indoor Toolkit Core parses raw OpenStreetMap indoor data into a typed domain model. This document describes parser behavior only: which raw elements are collected, how tags are interpreted, what relationships are derived, and which diagnostics can be emitted.

Renderer behavior, colors, MapLibre layers, Three.js meshes, marker selection, and application-specific accessibility UI belong outside the parser. The parser follows the Simple Indoor Tagging schema and keeps raw OSM ids, tags, node membership, way membership, and relation membership available through `model.graph`.

## General Model

Create a model from already loaded and filtered Overpass JSON:

```ts
import { createIndoorModel, OverpassJson } from "@indoortoolkit/core";

const indoorData: OverpassJson = await loadIndoorOverpassJson();
const model = createIndoorModel(indoorData);
```

The parser does not download Overpass data, choose a building, derive building metadata, or decide how anything should be rendered. Callers are expected to provide the indoor data they want parsed.

The returned `IndoorModel` contains:

- `rawIndoorData`: the original Overpass JSON.
- `graph`: an `OsmGraph` with nodes, ways, relations, id lookup, reverse ways-by-node, and reverse relations-by-member.
- `elements`: typed indoor element collections.
- `topology`: relationships between rooms, openings, walls, and vertical connections.
- `diagnostics`: warnings and errors collected during parsing and lazy geometry creation.
- `levels`: numeric levels collected from drawable indoor areas and explicit level outlines.
- `levelLabels`: labels from `indoor=level + level:ref=*`.
- `stairPathNetwork`: connected stair pathway and landing components.

## Element Boundary

Most parsed objects derive from `IndoorElement`. The boundary is deliberately small:

- stable id, such as `way/123` or `node/456`;
- original source OSM element;
- copied tags;
- parsed numeric levels;
- geometry where parser-level geometry can be derived;
- graph context for raw OSM relationships.

The parser does not emit render items. A renderer may turn a room into a filled polygon, a routing tool may turn an opening into a graph node, and a knowledge graph importer may turn the same opening into a relationship.

Use `IndoorElementRef` when a caller needs a lightweight reference for search, selection, diagnostics, or user-facing lists:

```ts
const ref = room.ref;
const element = model.elements.getByRef(ref);
```

## Levels

Most elements derive levels from:

```text
level=*
repeat_on=*
```

`indoor=level` outlines are the exception: they derive membership and labels from
`level=*` only. `repeat_on=*` is ignored for level outlines because explicit
floor-plate geometry should not be copied across levels implicitly.

Supported level values:

```text
level=0
level=0;1;2
level=0-3
level=3-1
level=0.5
repeat_on=2;3
```

For ordinary level lists, ranges expand in integer steps. `level=0-3` becomes `0, 1, 2, 3`. Inverted ranges are tolerated: `level=3-1` becomes `3, 2, 1` and emits a warning diagnostic.

Repeated values are deduplicated while keeping the first occurrence. `level=1;2;1` becomes `1, 2` and emits a warning diagnostic.

Commas are not accepted in `level=*`, `repeat_on=*`, or other parser level-list fields. `level=1,5` is ambiguous because a comma can mean either a decimal separator or a list separator, so it emits an error diagnostic and parses no levels for that value. Use decimal points and semicolons instead, for example `level=1.5` or `level=1;5`.

Stair pathways are special: on `indoor=pathway`, `level=*` is a vertical span. Prefer `from-to` syntax, for example `level=0-1` or `level=0-0.5`. As a tolerant fallback, semicolon-separated lists are accepted when they do not skip existing levels: `level=1;2;3` becomes the span `1-3`.

Buildings can declare intentionally missing floors with `non_existent_levels=*`. The parser does not derive that from a building object itself; applications should parse the building tag and pass it as `nonExistentLevels`:

```ts
const model = createIndoorModel(indoorData, {
  nonExistentLevels: [13],
});
```

With `nonExistentLevels: [2]`, a pathway `level=1;3` is accepted as the span `1-3`. Without that configuration, `level=1;3` emits an error diagnostic because level `2` is an existing intermediate level that is missing from the list.

The same building-level configuration is also applied to ordinary element levels. If `nonExistentLevels: [2]` is configured, a room or level outline tagged `level=1-3` is interpreted as levels `1` and `3`; level `2` is not included in `element.levels`, `model.levels`, or `model.levelLabels`.

## Geometry

Area-like parser elements may be closed ways or multipolygon-style relations:

- rooms, corridors, areas;
- level outlines;
- columns;
- stair landings;
- step areas.

For ways, the parser closes the polygon ring if the first node is not repeated as the last node. At least three nodes are required.

For relations, only `type=multipolygon` relations are supported as area geometry. Other relation types are ignored by element collection and rejected by the relation geometry helper. Within multipolygon relations, only way members with `outer` and `inner` roles are used. The parser supports multiple outer rings, multiple holes, and outer or inner rings assembled from multiple ways that connect end to end.

Geometry is exposed as GeoJSON geometry objects because `GeoJSON.Position` and geometry types are useful interchange formats. The model itself is not GeoJSON and does not erase OSM semantics.

## Diagnostics

The parser favors partial model creation over failing an entire building. Diagnostics are collected silently by default:

```ts
const model = createIndoorModel(indoorData);
console.log(model.diagnostics);
```

Forward diagnostics to a caller or console output:

```ts
const model = createIndoorModel(indoorData, {
  onDiagnostic: (diagnostic) => sendToEditor(diagnostic),
  logDiagnostics: true,
});
```

Diagnostics have a severity of `warning` or `error`. Warnings describe tolerated or skipped details. Errors describe values that the parser intentionally refuses to interpret, while still keeping the rest of the model usable.

Common diagnostics include:

- `ExtractLevels.inverted-level-range`: an inverted range was parsed in descending order.
- `ExtractLevels.duplicate-level-values`: repeated levels were removed.
- `ExtractLevels.comma-separated-levels`: a comma was found in a level-list value and that value was not parsed.
- `IndoorRoom.missing-way-nodes`, `IndoorLevelOutline.missing-way-nodes`, and similar geometry diagnostics.
- `*.unsupported-member-roles`: a relation used way member roles other than `outer` or `inner`.
- `*.missing-outer-ring` or `*.incomplete-outer-chain-*`: a relation could not form a complete area.
- `IndoorDoor.area-wall-*`: a door tried to connect to an `indoor=wall + area=yes` wall, which is not usable as a pass-through wall line.
- `IndoorOpening.*`: an opening could not find enough connected room, wall, or orientation context.

## Usage Examples

### Renderer Input

```ts
const visibleRooms = model.elements.rooms.filter((room) => room.hasLevel(currentLevel));

const roomFeatures = visibleRooms
  .map((room) =>
    room.geometry === undefined
      ? undefined
      : {
          type: "Feature" as const,
          id: room.id,
          properties: room.tags,
          geometry: room.geometry,
        },
  )
  .filter((feature): feature is NonNullable<typeof feature> => feature !== undefined);
```

A renderer decides styling separately. The parser only provides semantic elements and geometry.

### Routing Graph Input

```ts
for (const opening of model.elements.openings) {
  const rooms = model.topology.getRoomsForOpening(opening.id);

  if (rooms.length >= 2) {
    addRoutingConnection({
      fromRoom: rooms[0].id,
      toRoom: rooms[1].id,
      viaOpening: opening.id,
      levels: opening.levels,
      widthMeters: opening.widthMeters,
    });
  }
}
```

For routing, explicit doors and inferred open staircase connections are both available as `IndoorOpening` objects. A routing tool can still inspect `opening.kind` and `opening.sources` to decide whether human review is needed.

### Area-Based Routing

```ts
const levelRooms = model.elements.rooms.filter((room) => room.hasLevel(level));
const barriers = [
  ...model.elements.walls.filter((wall) => wall.hasLevel(level)),
  ...model.elements.columns.filter((column) => column.hasLevel(level)),
];
```

The parser does not decide whether rooms are walkable or barriers. The caller can combine tags, geometry, and topology according to its own movement model.

### Knowledge Graph Input

```ts
for (const room of model.elements.rooms) {
  addEntity(room.id, {
    type: "IndoorRoom",
    name: room.tags.name,
    ref: room.tags.ref,
    levels: room.levels,
  });
}

for (const connection of model.topology.getConnectedRoomPairs()) {
  addRelation(connection.rooms[0].id, "connectedTo", connection.rooms[1].id, {
    opening: connection.opening.id,
  });
}
```

The parser preserves raw tags and source elements so a knowledge graph can keep both standardized parser semantics and original OSM evidence.

### Validation Or Editor Feedback

```ts
const diagnostics = createIndoorModel(indoorData, {
  onDiagnostic: (diagnostic) => {
    if (diagnostic.sourceElement !== undefined) {
      highlightOsmElement(diagnostic.sourceElement.type, diagnostic.sourceElement.id);
    }
  },
}).diagnostics;
```

Diagnostics include `elementRef` and often `sourceElement`, which makes them suitable for editor overlays or data quality reports.

## Supported Elements

Each section below uses the same structure:

- Collected from: raw OSM elements that become parser elements.
- Expected tags: tags required for the parser to collect the element.
- Optional useful tags: tags the parser uses when present.
- Parser interpretation: parser semantics and derived relationships.
- Diagnostics and common mistakes: likely parser warnings, errors, or modeling issues.

### Level Outlines

Collected from:

```text
way
relation + type=multipolygon
indoor=level
```

Expected tags:

```text
indoor=level
level=*
```

Optional useful tags:

```text
level:ref=*
```

Parser interpretation:

- Creates an `IndoorLevelOutline`.
- Provides area geometry for the full level footprint.
- Contributes to `model.levels`.
- `level:ref=*` contributes labels to `model.levelLabels`; numeric `level=*` remains the internal level id.
- `repeat_on=*` is ignored for level outlines.
- Relations may contain multiple outer rings and inner holes.

Diagnostics and common mistakes:

- Missing nodes, too few nodes, incomplete relation rings, or missing outer rings prevent geometry creation.
- `level:ref=*` is a label only. Do not put non-numeric labels in `level=*`.

### Rooms, Corridors, And Areas

Collected from:

```text
way
relation + type=multipolygon
indoor=room|corridor|area
```

Expected tags:

```text
indoor=room|corridor|area
level=*
```

Optional useful tags:

```text
name=*
ref=*
amenity=toilets
wheelchair=yes|designated|no
stairs=yes
highway=elevator|escalator
repeat_on=*
```

Parser interpretation:

- Creates `IndoorRoom` objects for rooms, corridors, and indoor areas.
- `indoor=area + landing=yes` is excluded from rooms and becomes a stair landing.
- Untagged `indoor=area` elements that connect only to stair pathways are also excluded from rooms and inferred as stair landings.
- `indoor=yes + tourism=artwork` is currently collected as a room-like area for legacy data support.
- Room-like elements contribute to `model.levels`.
- Tags are preserved for downstream labels, search, rendering, accessibility logic, and routing choices.
- `stairs=yes`, `highway=elevator`, or `highway=escalator` can make the room-like area a vertical connection footprint.

Diagnostics and common mistakes:

- Missing area geometry produces geometry diagnostics and leaves `room.geometry` undefined.
- Corridors and open areas are room-like parser elements, but an application may still treat them differently from enclosed rooms.
- Do not use `landing=yes` for general open areas unless they are stair landings.

### Walls

Collected from:

```text
way
indoor=wall
```

Expected tags:

```text
indoor=wall
level=*
```

Optional useful tags:

```text
area=yes
repeat_on=*
```

Parser interpretation:

- Creates `IndoorWall`.
- Line walls expose line geometry and can provide orientation context for openings.
- `area=yes` walls expose polygon geometry and represent wall volumes.
- Doors are not connected to area walls as pass-through wall lines.

Diagnostics and common mistakes:

- Missing way nodes prevent wall geometry creation.
- A door on an area wall emits `IndoorDoor.area-wall-*` because area walls are solid renderable areas, not opening orientation lines.
- Use line walls where a door should inherit wall direction or wall width.

### Handrails

Collected from:

```text
way
barrier=handrail
```

Expected tags:

```text
barrier=handrail
level=*
```

Optional useful tags:

```text
repeat_on=*
```

Parser interpretation:

- Creates `IndoorHandrail`.
- Standalone handrails are independent line elements.
- Handrail ways that share at least two nodes with a stair landing instance can be interpreted by renderers as landing handrails.

Diagnostics and common mistakes:

- Missing way nodes prevent handrail geometry creation.
- `barrier=handrail` is separate from `handrail:left/right/middle` tags on stair pathways or footprints.

### Columns

Collected from:

```text
node
way
relation + type=multipolygon
indoor=column
```

Expected tags:

```text
indoor=column
level=*
```

Optional useful tags:

```text
diameter=*
width=*
repeat_on=*
```

Parser interpretation:

- Creates `IndoorColumn`.
- Node columns are converted to circular polygon geometry.
- `diameter=*` controls node-column diameter. `width=*` is a fallback.
- If neither value is present, node columns use a default diameter of `0.5` meters.
- Way and relation columns use their authored area geometry.

Diagnostics and common mistakes:

- Invalid or missing node-column size tags fall back to the default.
- Missing way or relation geometry leaves `column.geometry` undefined.
- Use a way or relation when the real footprint is not circular.

### Doors And Openings

Collected from:

```text
node
door=*
```

Expected tags:

```text
door=*
level=*
```

Optional useful tags:

```text
width=*
repeat_on=*
```

Parser interpretation:

- Creates `IndoorDoor` for explicit door nodes.
- Doors are converted into `IndoorOpening` objects when enough room or wall context is available.
- A door connects to rooms when its node is part of a room, corridor, or area boundary.
- A door connects to walls when its node is part of an `indoor=wall` line way.
- Wall context is preferred for opening orientation. Room boundary context is used as fallback.
- `width=*` is parsed as meters. If it is missing, an inferred staircase opening may provide a fallback width; otherwise the default opening width is `1` meter.

Diagnostics and common mistakes:

- A door node that is near a wall but not part of the wall or room way is not connected by coordinate comparison.
- Missing surrounding nodes or missing containing ways prevent orientation calculation.
- A door connected only to an `area=yes` wall is not usable as a wall-line opening.

### Inferred Openings

Collected from:

```text
shared node between an open stair footprint and one of its stair pathway instances
```

Expected tags:

```text
indoor=area
stairs=yes
level=*

indoor=pathway
level=from-to
```

Optional useful tags:

```text
width=*
door=*
```

Parser interpretation:

- Creates `IndoorOpening` with `kind="opening"` when an open staircase pathway shares a connection node with its open staircase footprint and no explicit door already claims that node on that level.
- If an explicit door exists on the same node and level, the door opening is used instead.
- Inferred openings keep source references to the pathway node, pathway, and footprint.
- These openings are semantic pass-through connections, not OSM door elements.

Diagnostics and common mistakes:

- The pathway must have usable geometry and matching interpolated node levels.
- The shared node must actually be part of the footprint boundary.
- Use an explicit door node when there is a real physical door.

### Point Features

Collected from:

```text
node
tags matching parser accessibility or information predicates
```

Expected tags:

```text
level=*
```

Supported point tags include:

```text
amenity=toilets
highway=elevator
highway=steps
stairs=yes
entrance=yes|main|secondary
entrance=exit|emergency
exit=yes|emergency
information=tactile_map|tactile_model|braille|tactile_letters|board|map
speech_output=*
speech_output:de=*
speech_output:en=*
wheelchair=yes|designated
wheelchair:description:de=*
wheelchair:description:en=*
```

Parser interpretation:

- Creates `IndoorPointFeature`.
- Information points such as `information=tactile_map` are regular point features. Applications decide whether a tactile map is a primary information point, a marker, both, or neither.
- Tags are preserved for downstream accessibility, search, or display rules.

Diagnostics and common mistakes:

- Point features without levels are not visible through `getByLevel`.
- Prefer room tags when the feature occupies a room, and point tags when the feature is a localized object or entrance.

### Tactile Paving

Collected from:

```text
way
indoor=yes
tactile_paving=yes
```

Expected tags:

```text
indoor=yes
tactile_paving=yes
level=*
```

Optional useful tags:

```text
repeat_on=*
```

Parser interpretation:

- Creates `IndoorTactilePaving`.
- Exposes line geometry.
- Tactile paving does not appear on all levels when `level=*` is missing.

Diagnostics and common mistakes:

- The way needs at least two usable nodes for line geometry.
- Always add `level=*`; level-less tactile paving is usually ambiguous.

### Vertical Connection Footprints

Collected from:

```text
IndoorRoom with stairs=yes
IndoorRoom with highway=elevator|escalator
```

Expected tags:

```text
indoor=room|area
stairs=yes
level=*
```

or:

```text
indoor=room|area
highway=elevator|escalator
level=*
```

Optional useful tags:

```text
handrail=yes|no
handrail:left=yes|no
handrail:right=yes|no
handrail:middle=yes|no
wheelchair=yes|designated|no
repeat_on=*
```

Parser interpretation:

- Creates `IndoorVerticalConnection` when a room-like footprint has staircase, elevator, or escalator tags.
- `indoor=room` footprints become `kind="simple"`.
- `indoor=area` footprints become `kind="open"`.
- Pathway components sharing footprint nodes are associated with the footprint.
- Footprints remain available as normal `IndoorRoom` objects as well.

Diagnostics and common mistakes:

- `indoor=corridor + stairs=yes` is collected as a room-like element but is not currently classified as a vertical connection footprint.
- A footprint without shared pathway nodes can still become a vertical connection, but it has no detailed stair path components.

### Stair Pathways

Collected from:

```text
way
indoor=pathway
```

Expected tags:

```text
indoor=pathway
level=from-to
```

Optional useful tags:

```text
width=*
repeat_on=*
repeat_on_offset=*
handrail=yes|no
handrail:left=yes|no
handrail:right=yes|no
handrail:middle=yes|no
```

Parser interpretation:

- Creates `IndoorStairPathway`.
- `level=*` is parsed as a vertical span. The parser normalizes inverted spans, so `level=2-1` and `level=1-2` describe the same span.
- Semicolon-separated pathway levels can also form a span when they are contiguous after excluding configured `nonExistentLevels`. For example, `level=1;2;3` becomes `1-3`; `level=1;3` requires `nonExistentLevels: [2]`.
- `repeat_on=*` is interpreted as repeated start levels. For example, `level=1-2 + repeat_on=2` creates a repeated span `2-3`.
- `repeat_on_offset=*` is interpreted as an offset from the authored span.
- Pathway instances connect directly only when their normalized vertical span matches exactly.
- Pathway instances with different spans can be grouped through compatible landing instances.
- Node `level=*` tags on pathway nodes are available for downstream altitude interpolation.
- If `width=*` is missing, downstream tools may use the parser default width of `1` meter or combine the pathway with step areas.

Diagnostics and common mistakes:

- Semicolon pathway levels with missing existing intermediate levels emit `VerticalSpan.discontinuous-level-list` and are not used as a span.
- Use one pathway per vertical span. For `0-0.5`, landing at `0.5`, and `0.5-1`, model two pathway ways and one landing area.
- Repeated stair components should use `repeat_on=*` for repeated start levels and `repeat_on_offset=*` for explicit offsets.

### Stair Landings

Collected from:

```text
way
relation + type=multipolygon
indoor=area
```

Expected tags:

```text
indoor=area
level=*
```

Optional useful tags:

```text
landing=yes
repeat_on=*
repeat_on_offset=*
```

Parser interpretation:

- Creates `IndoorLanding`.
- Landings are stair components, not ordinary rooms.
- `landing=yes` explicitly marks a stair landing.
- Without `landing=yes`, an `indoor=area` is inferred as a landing when its shared-node connections are only stair pathways.
- Inferred landings should connect at least two stair pathways.
- Landing instances connect pathway instances when their level is exactly on a pathway span boundary.
- `repeat_on=*` creates landing instances at the listed levels.
- `repeat_on_offset=*` creates landing instances by offsetting authored landing levels.

Diagnostics and common mistakes:

- An inferred landing connected to only one stair pathway is still collected as a landing but emits `IndoorLanding.single-connected-stair-path`.
- An `indoor=area` connected to non-stair room/corridor/area geometry is treated as a normal room-like area unless `landing=yes` is explicit.
- A landing at `0.5` connects `0-0.5` and `0.5-1`, but it does not connect unrelated spans.
- Landings need shared nodes with adjacent pathways to participate in the stair path network.
- Missing area geometry leaves the landing without usable geometry.

### Step Areas

Collected from:

```text
way
relation + type=multipolygon
area:highway=steps
```

Expected tags:

```text
area:highway=steps
level=*
```

Optional useful tags:

```text
repeat_on=*
```

Parser interpretation:

- Creates `IndoorStepArea`.
- Step areas expose area geometry for tools that need stair footprints, for example width sampling for free-floating stair surfaces.
- The parser does not turn step areas into rooms or vertical connections by themselves.

Diagnostics and common mistakes:

- Keep `level=*` aligned with the pathway span the step area describes.
- Missing relation rings or way nodes leave `stepArea.geometry` undefined.

## Minimal Parser Checklist

For best parser results:

- Query and pass raw Overpass JSON with all referenced nodes, ways, and relation members.
- Use numeric `level=*` values. Use `level:ref=*` for labels.
- Use semicolons for lists and decimal points for fractional levels.
- Avoid comma syntax in level lists.
- Use closed ways or valid multipolygon relations for area-like elements.
- Tag area relations with `type=multipolygon`; other relation types are not parsed as indoor elements yet.
- Share nodes to express real topology: doors on room or wall boundaries, stair pathways sharing nodes with footprints and landings.
- Use `indoor=room`, `indoor=corridor`, and `indoor=area` deliberately; the parser collects them together but preserves the tags.
- Model stair pathways as one way per vertical span.
- Use `landing=yes` for clarity, or ensure untagged stair landing areas connect only to stair pathways.
- Use `repeat_on=*` for repeated start levels and `repeat_on_offset=*` for offsets.
- Inspect `model.diagnostics` during development and data import.
