# Indoor Rendering Guide

This document describes how the 2.5D Indoor Maps application renders parsed indoor OpenStreetMap data. Parser behavior, supported raw elements, level parsing, topology, and diagnostics are documented by the [`@indoortoolkit/indoor-osm-parser`](https://github.com/IndoorToolkit/indoor-osm-parser) package.

The application follows the Simple Indoor Tagging schema through the parser, then applies renderer-specific styling, labels, markers, search behavior, and accessibility descriptions. Tags not mentioned here may still be preserved by the parser, but they do not affect this application's rendering unless the application explicitly uses them.

## Rendering Pipeline

The application loads raw Overpass JSON, creates an indoor model with `createIndoorModel`, and then builds render items from typed parser elements:

- `model.elements.rooms` become room, corridor, area, toilet, elevator, and stair footprint surfaces.
- `model.elements.levelOutlines` provide optional 3D floor outlines and level labels.
- `model.elements.openings` become door or opening symbols.
- `model.elements.walls`, `handrails`, and `columns` become barriers or solid objects.
- `model.elements.tactilePaving` and `pointFeatures` become accessibility-oriented line and marker features.
- `model.elements.verticalConnections`, `stairPathNetwork`, and `stepAreas` drive stair and elevator representations.

GeoJSON is still used as a geometry interchange format for MapLibre and Three.js input, but selection, search, topology, and element identity are based on parser elements rather than GeoJSON features.

## General Rendering Rules

### Levels

The level selector uses `model.levels`, which the parser derives from room-like areas and explicit `indoor=level` outlines. Nodes without levels do not make elements appear on every level.

If a level has an `indoor=level` outline with `level:ref=*`, the selector displays `level:ref` while keeping the numeric `level=*` value internally. For example, `level=0 + level:ref=E` displays `E`.

### Geometry

Area-like elements can render from polygons or `type=multipolygon` relations. The application should iterate all polygons in a multipolygon where a renderer expects polygon-only geometry.

If parser geometry is missing, the element is skipped for the render item that needs that geometry. The data issue should appear in `model.diagnostics`.

### Selection And Search

Search results and clicked map elements refer to `IndoorElementRef` values. The application resolves them through `model.elements` and can switch to a level where the element exists.

Selected elements are highlighted by rebuilding only the render layers affected by selection.

### Accessibility

The parser exposes point features and tags. The application decides which of those become accessibility markers for the active user profile. This is intentionally use-case-specific: for example, `information=tactile_map` is a regular parser point feature, while this application treats one tactile map per level as the primary information point and excludes it from the generic marker layer.

## Rendered Elements

Each section below follows the same structure:

- Parser element: the parser element used by the application.
- Expected parser tags: tags documented by the parser guide.
- Rendering: how this application draws it.
- Application notes: renderer-specific warnings, common mistakes, or mapping advice.

### Rooms, Corridors, And Areas

Parser element:

```text
IndoorRoom
```

Expected parser tags:

```text
indoor=room|corridor|area
level=*
```

Optional rendering tags:

```text
room=*
amenity=toilets
stairs=yes
wheelchair=yes|designated
```

Rendering:

- 2D: rendered as filled polygons.
- 3D: corridors, areas, elevators, stair footprints, and selected rooms are rendered as raised surfaces.
- `amenity=toilets` changes fill color and can create toilet markers.
- `stairs=yes` changes fill color to the staircase color and can create stair markers.
- `indoor=room` uses the room fill color unless `room=entrance` or `room=corridor` marks it as neutral circulation.
- `indoor=area + room=*` uses the room fill color unless `room=entrance` or `room=corridor` marks it as neutral circulation.
- Fill color and implicit wall rendering are separate: `room=*` affects fill style, while `indoor=*` decides whether an implicit wall outline exists.
- `wheelchair=yes|designated` can add pattern fills for wheelchair-user profiles.
- Ordinary rooms can show `name=*` or `ref=*` labels.
- `indoor=room` has implicit wall outlines, including when `room=entrance` or `room=corridor` is present.
- `indoor=corridor` and `indoor=area` do not have implicit wall outlines; use explicit `indoor=wall` ways or `barrier=handrail` where a physical barrier should be visible.

Application notes:

- `indoor=room` is best for enclosed spaces.
- `indoor=corridor` is best for corridors.
- `indoor=area` is best for open circulation areas and open stair footprints.
- Use `room=entrance` or `room=corridor` on `indoor=room` only when the space is still an enclosed room-like footprint but should use neutral fill styling.
- Do not rely on corridor or area boundaries to create visible walls. Model physical walls separately.

### Level Outlines

Parser element:

```text
IndoorLevelOutline
```

Expected parser tags:

```text
indoor=level
level=*
level:ref=*
```

Rendering:

- Used as the 3D floor outline when present for the current level.
- Full polygon and multipolygon geometry is used, including inner rings.
- `level:ref=*` is used as the visible level selector label.

Application notes:

- Add level outlines when floor plates differ between levels.
- Keep `level=*` numeric and use `level:ref=*` for local names such as `E`, but keep them short. Use `name=*` for a longer name.

### Walls

Parser element:

```text
IndoorWall
```

Expected parser tags:

```text
indoor=wall
level=*
area=yes
```

Rendering:

- Line walls render as wall lines.
- `area=yes` walls render as filled wall polygons with an outline.
- Area walls are not used as pass-through wall lines for door orientation or width.

Application notes:

- Use line walls when doors should be visually cut into that wall.
- Use `area=yes` for thick wall volumes that should appear as solid shapes.

### Doors And Openings

Parser element:

```text
IndoorDoor
IndoorOpening
```

Expected parser tags:

```text
door=*
level=*
width=*
```

Rendering:

- Explicit doors and inferred open staircase connections render as opening symbols.
- The opening color comes from connected rooms, with white as fallback.
- The opening line width comes from connected walls first, then connected `indoor=room` footprints.
- Openings between corridors or open areas need explicit wall lines when they should have a visible width.
- If an explicit stair door has no width, inferred staircase width can provide a fallback.

Application notes:

- Put door nodes directly into room boundary ways or wall ways. Nearby coordinates are not enough.
- Use explicit wall lines for corridor-to-corridor fire doors so the renderer has wall direction and width.
- Open stair connections without physical doors can be rendered from inferred openings when the pathway shares nodes with the footprint.

### Columns

Parser element:

```text
IndoorColumn
```

Expected parser tags:

```text
indoor=column
level=*
diameter=*
width=*
```

Rendering:

- Columns render with the wall color.
- Node columns are approximated as circular polygons.
- Way and relation columns use their authored area geometry.
- Columns do not receive an extra outline.

Application notes:

- Use `diameter=*` for round node columns.
- Use a way or relation when the actual footprint matters.

### Tactile Paving

Parser element:

```text
IndoorTactilePaving
```

Expected parser tags:

```text
indoor=yes
tactile_paving=yes
level=*
```

Rendering:

- Rendered as a dashed tactile paving line.
- Only visible on explicitly tagged levels.

Application notes:

- Always add `level=*`; level-less tactile paving is not treated as visible everywhere.

### Information Point

Parser element:

```text
IndoorPointFeature
```

Expected parser tags:

```text
information=tactile_map
level=*
```

Rendering:

- This application treats tactile map point features as primary information points.
- Only the first matching info point for the current level is used as the application's info point marker.
- The same parser element is excluded from the generic accessibility marker layer by application logic.

Application notes:

- This is application behavior, not parser behavior. Other applications may treat `information=tactile_map` differently.

### Accessibility And Category Point Features

Parser element:

```text
IndoorPointFeature
```

Expected parser tags:

```text
amenity=toilets
highway=elevator
highway=steps
stairs=yes
entrance=yes|main|secondary
entrance=exit|emergency
exit=yes|emergency
information=tactile_model|braille|tactile_letters|board|map
speech_output=*
speech_output:de=*
speech_output:en=*
wheelchair=yes|designated
wheelchair:description:de=*
wheelchair:description:en=*
level=*
```

Rendering:

- Rendered as point markers when enabled for the current user profile.
- Rooms can also create accessibility markers from their tags, for example `amenity=toilets`.

Application notes:

- Wheelchair profiles emphasize accessible toilets, wheelchair-accessible elevators, and wheelchair descriptions.
- Blind profiles emphasize tactile information, tactile paving related information, stairs, speech output, entrances, and exits.
- No-impairment profiles emphasize general toilets, entrances, exits, information boards, and stairs.

## Vertical Connections

Vertical connections use parser semantics but have substantial renderer-specific behavior.

### Enclosed Staircases And Elevators

Parser element:

```text
IndoorVerticalConnection kind="simple"
```

Expected parser tags:

```text
indoor=room
stairs=yes
level=*
```

or:

```text
indoor=room
highway=elevator|escalator
level=*
```

Rendering:

- The footprint renders as a normal 2D room-like area.
- In 3D, the footprint becomes a vertical prism on all levels except the top level.
- Staircase prisms get cylinders at the edges.
- Optional stair pathways can add detailed sloped stair geometry.

Application notes:

- Use `indoor=room` for enclosed stairwells and elevator shafts.
- Put the footprint on all levels it connects, for example `level=0;1;2`.

### Open Staircases

Parser element:

```text
IndoorVerticalConnection kind="open"
IndoorStairPathway
```

Expected parser tags:

```text
indoor=area
stairs=yes
level=*

indoor=pathway
level=from-to
```

Optional rendering tags:

```text
width=*
handrail=yes|no
handrail:left=yes|no
handrail:right=yes|no
handrail:middle=yes|no
```

Rendering:

- The footprint renders as a 2D area.
- If no handrail tags are present, the open staircase footprint outline is suppressed so open corridor connections do not look like walls.
- If handrail tags are present, the footprint can keep an outline even though ordinary `indoor=area` elements do not have implicit walls.
- In 3D, pathway middle lines create sloped stair surfaces.
- Handrail tags on the footprint orient left and right in the upward direction.
- Handrail tags on a pathway orient left and right by pathway direction.
- Shared nodes between footprint and pathway can become inferred openings when there is no explicit door.

Application notes:

- Share nodes between the footprint and pathway where people enter or leave the stair.
- Use explicit doors only when there is a physical door.

### Free-Floating Stairs

Parser element:

```text
IndoorVerticalConnection kind="freeFloating"
IndoorStairPathway
IndoorStepArea
```

Expected parser tags:

```text
indoor=pathway
level=from-to
```

Optional rendering tags:

```text
width=*
area:highway=steps
repeat_on=*
repeat_on_offset=*
handrail=yes|no
handrail:left=yes|no
handrail:right=yes|no
handrail:middle=yes|no
```

Rendering:

- 2D: rendered as a flat stair surface derived from the middle line and width.
- 3D: rendered as sloped prism segments.
- If `width=*` is missing, the renderer can sample compatible `area:highway=steps` geometry.
- Sampled step areas provide independent left and right offsets from the pathway, so the pathway does not need to be perfectly centered in the stair area.
- If no width source is available, the default pathway width is used.
- Side outlines use handrail styling where handrails exist, otherwise fallback outline styling.
- A `level=0-1` stair is visible on both level `0` and level `1`.

Application notes:

- Use one pathway per vertical span.
- For split stairs, model each ramp separately and connect them with `landing=yes` areas.
- Add node `level=*` tags to endpoints and important intermediate nodes when slope is not uniform.

### Stair Landings

Parser element:

```text
IndoorLanding
```

Expected parser tags:

```text
indoor=area
level=*
```

Rendering:

- 2D: rendered as flat stair surface areas for free-floating stair groups.
- 3D: rendered as thin flat prisms at the landing altitude.
- Landing handrails modeled as `barrier=handrail` ways are rendered only in 3D when attached to the landing.

Application notes:

- `landing=yes` is recommended for clarity, but the parser can infer an `indoor=area` landing when it connects only to stair pathways.
- Use landings for transitions such as `0-0.5` plus `0.5-1`.
- Share nodes between the landing and adjacent pathways when possible.

### Step Areas For Stair Width

Parser element:

```text
IndoorStepArea
```

Expected parser tags:

```text
area:highway=steps
level=*
```

Rendering:

- Step areas are not rendered directly.
- They can determine varying width for free-floating stair surfaces when the pathway has no explicit `width=*`.
- Width is sampled by ray casting through pathway nodes. The renderer keeps separate left and right distances from the pathway, so off-center middle lines still produce the authored stair footprint.
- At corners, the sampling direction uses the summed perpendicular vectors of adjacent path segments, so diagonal and corner widths follow the stair area geometry.

Application notes:

- Extend the step area slightly beyond endpoint nodes so endpoint width sampling has room to hit both sides.
- `width=*` on the pathway takes priority over step area sampling.

### Handrails

Parser element:

```text
IndoorHandrail
IndoorStairPathway handrail tags
IndoorRoom footprint handrail tags
```

Expected parser tags:

```text
barrier=handrail
level=*

handrail=yes|no
handrail:left=yes|no
handrail:right=yes|no
handrail:middle=yes|no
```

Rendering:

- Standalone `barrier=handrail` ways render as wall-like handrail lines.
- Handrail ways attached to stair landings render only in the 3D stair representation.
- Tagged stair handrails render in 3D along stair path edges or the middle.
- Generic `handrail=yes` is a fallback for left and right handrails.
- `handrail:middle=*` is independent.

Application notes:

- Use pathway tags for handrails that follow a sloped stair run.
- Use `barrier=handrail` ways for standalone corridor handrails or landing handrails.

## Search And Labels

For best application search results:

- Add `name=*` or `ref=*` to rooms.
- Add `room=*` where the room type matters for discovery, for example `room=classroom`.
- Add category tags such as `amenity=toilets`, `highway=elevator`, `stairs=yes`, `shop=*`, `amenity=cafe`, or `amenity=restaurant` where applicable.
- Keep level tags numeric and consistent.
- If the building intentionally skips floor numbers, tag the building with `non_existent_levels=*`; those levels are omitted from expanded ranges and from the level selector.

Search matches `name=*`, `ref=*`, `amenity=*`, and `room=*`. Application aliases can expand tag values for search without changing OSM tags; these are grouped in `src/data/searchTagAliases.ts` and intentionally focus on room and amenity values likely in public buildings. For example, `room=classroom` also matches seminar-room style queries, and `amenity=atm` also matches German search terms such as `Geldautomat`.

Room labels are shown for ordinary named or referenced rooms. Toilet rooms, stair rooms, and other special rooms may use category markers instead.

## Common Rendering Mistakes

- Door nodes are close to a room boundary but not part of the boundary way. The parser keeps topology by OSM membership, not coordinate comparison.
- Expecting corridor or area boundaries to render as walls. The renderer treats `indoor=corridor` and `indoor=area` as open circulation unless explicit walls, handrails, or stair handrails provide visible barriers.
- Expecting `room=corridor` on an `indoor=room` to remove implicit walls. Wall width depends on `indoor=*`, so `indoor=room + room=corridor` still has implicit walls but uses neutral fill styling.
- `information=tactile_map` is expected to become both the main info point and a generic marker. This application intentionally chooses one primary info point per level.
- Free-floating stairs are modeled as one long pathway with discontinuous semicolon level lists. Prefer `from-to` spans; semicolon lists are only accepted when they do not skip existing levels, or when skipped levels are configured as non-existent.
- Fractional levels use commas. Use decimal points, for example `level=0.5`.

## Minimal Rendering Checklist

Start with the parser checklist from [`@indoortoolkit/indoor-osm-parser`](https://github.com/IndoorToolkit/indoor-osm-parser), then add renderer-specific detail:

- Add `indoor=level` outlines with `level:ref=*` if floor plates or labels differ.
- Put doors directly on room or wall way nodes.
- Use explicit `indoor=wall` line ways for corridor-to-corridor doors.
- Tag the primary tactile map as `information=tactile_map + level=*`.
- Add accessibility tags where marker profiles should react to them.
- Add stair pathways, landings, step areas, and handrails when detailed 2D or 3D stair rendering matters.
