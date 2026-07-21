# Indoor Tagging Guide

This document describes how indoor OpenStreetMap data is interpreted by this renderer. It is meant as a mapper checklist for buildings that should work well in the raw indoor model pipeline.

The application follows the Simple Indoor Tagging schema and interprets data through that lens: indoor spaces are level-bound areas, barriers and special features are separate elements, and vertical movement is described by stair or elevator footprints plus optional pathway geometry.

The renderer is not a general-purpose OSM renderer. Tags listed here are the ones currently used by the application. Additional OSM tags are preserved on features, but they only affect rendering, markers, search, or accessibility descriptions when listed below.

## General Rules

### Geometry

- Rooms, corridors, areas, columns, level outlines, landings, and step areas may be closed ways or multipolygon-style relations.
- Relations support `outer` and `inner` way members. Multiple outer rings and multiple holes are supported. Outer rings may be assembled from multiple ways that connect end to end.
- Unsupported relation member roles are ignored with a console warning.
- Ways do not have to repeat the first node at the end; the renderer closes area rings for rendering.
- Missing nodes or incomplete relation rings prevent that element from being rendered and produce a console warning.

### Levels

Most elements are visible on levels from:

- `level=*`
- `repeat_on=*`

Supported examples:

```text
level=0
level=0;1;2
level=0-3
level=0.5
repeat_on=2;3
```

For ordinary elements, `level=0-3` expands to integer levels `0`, `1`, `2`, and `3`. Use explicit fractional values such as `level=0.5` when needed.

Stair pathways are different: on `indoor=pathway`, `level=*` is interpreted as a vertical span and should use `from-to` syntax, for example `level=0-1` or `level=0-0.5`.

### Level Selector and 3D Outline

The level selector is based on drawable Simple Indoor Tagging areas and explicit level outlines:

- `indoor=room`
- `indoor=corridor`
- `indoor=area`, except `landing=yes`
- `indoor=level`

Nodes do not contribute levels by themselves. Stair pathway levels are used for stair rendering, not for discovering the building's level list.

If an `indoor=level` element exists for the current level, its full geometry is used as the 3D floor outline. Otherwise the building outline is used. If the level outline has `level:ref=*`, that value is used as the level selector label while the numeric `level=*` value remains the internal level number.

## Supported Elements

### Rooms, Corridors, and Areas

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

Interpretation:

- `indoor=room`, `indoor=corridor`, and `indoor=area` are all collected as indoor room-like areas.
- `indoor=area + landing=yes` is not a normal room. It is treated as a stair landing.
- `name=*` or `ref=*` labels are shown for ordinary `indoor=room` features. Toilet rooms, stair rooms, and other special rooms are not labeled this way.
- `amenity=toilets` changes fill color and can create toilet markers.
- `wheelchair=yes` adds wheelchair pattern fills for wheelchair-user profiles and contributes accessibility information.
- `stairs=yes`, `highway=elevator`, or `highway=escalator` turns a room or area footprint into a vertical connection footprint.

Rendering:

- 2D: rendered as filled polygons.
- 3D: corridors, areas, elevators, stair footprints, and selected rooms are rendered as raised surfaces.
- `indoor=room + stairs=yes/highway=elevator/highway=escalator` is an enclosed or simple vertical connection footprint.
- `indoor=area + stairs=yes/highway=elevator/highway=escalator` is an open vertical connection footprint.

Best practice:

- Use `indoor=room` for enclosed spaces.
- Use `indoor=corridor` for corridors.
- Use `indoor=area` for open circulation areas and open stair footprints.
- Put doors on shared outline nodes when a wall or room boundary has a door.

### Level Outlines

Expected tags:

```text
indoor=level
level=*
```

Optional useful tags:

```text
level:ref=*
```

Interpretation and rendering:

- Defines the full outline geometry of a level.
- The full polygon or multipolygon is used in 3D, including inner rings.
- `level:ref=*` is displayed in the level selector. For example, `level=0` and `level:ref=E` displays `E` while still using numeric level `0` internally.

Best practice:

- Add one level outline per level when floor plates differ between levels.
- Keep `level=*` numeric, even when the visible label is a letter or local floor name.

### Walls

Expected tags:

```text
indoor=wall
level=*
```

Optional useful tags:

```text
area=yes
```

Interpretation:

- Wall ways are rendered as wall lines.
- `area=yes` turns the wall into a filled wall polygon.
- Area walls are renderable areas, not pass-through line barriers. Doors are not connected to `area=yes` walls and will produce a warning if they try to use one as their wall context.

Rendering:

- Line walls are rendered with the wall style.
- Area walls are filled with the wall color and outlined.

Best practice:

- Use line walls for walls that contain door nodes.
- Use `area=yes` only for thick wall volumes that should be rendered as solid areas.

### Doors and Openings

Expected tags:

```text
door=*
level=*
```

Optional useful tags:

```text
width=*
```

Interpretation:

- Doors are node elements.
- A door connects to rooms when its node is part of a room, corridor, or area way or relation member way.
- A door connects to walls when its node is part of an `indoor=wall` line way.
- If both rooms and walls are connected, wall geometry is preferred for orientation and line width.
- Door orientation is derived from the previous and next nodes of the containing room or wall way.
- `width=*` is interpreted in meters and controls the rendered opening width.

Rendering:

- Doors render as opening symbols in the wall or room boundary.
- Door color comes from connected rooms. If a connected room is selected, the selected room color is used. If no room is connected, white is used.
- Door line width comes from connected walls first, then connected rooms.

Best practice:

- Put the door node directly into the boundary way of each connected room, or into the wall way when the door is in an explicit wall.
- Use `width=*` when the default 1 m opening is not correct.
- For corridor-to-corridor fire doors, use an explicit wall line containing the door node so the renderer can derive line width and orientation.

### Columns

Expected tags:

```text
indoor=column
level=*
```

Optional useful tags:

```text
diameter=*
width=*
```

Interpretation:

- Columns may be nodes, closed ways, or relations.
- Node columns are approximated as circular polygons.
- `diameter=*` is used for node columns when present.
- `width=*` is used as a fallback diameter.
- If neither is present, node columns use a default diameter of 0.5 m.

Rendering:

- Columns render with the wall color.
- Columns do not get an additional outline.

Best practice:

- Use a node with `diameter=*` for round columns.
- Use a closed way or relation when the actual footprint matters.

### Tactile Paving

Expected tags:

```text
indoor=yes
tactile_paving=yes
level=*
```

Interpretation:

- Tactile paving is currently supported as ways only.
- The way must have at least two nodes.

Rendering:

- Rendered as a dashed line with tactile paving line weight.
- It only appears on explicitly tagged levels.

Best practice:

- Tag tactile guidance lines as their own ways.
- Always add `level=*`; level-less tactile paving is not shown on every level.

### Information Point

Expected tags:

```text
information=tactile_map
level=*
```

Interpretation:

- The main information point is a node.
- It is separate from generic information-board accessibility markers.

Rendering:

- Rendered as the application's info point marker.
- Only the first info point found for the current level is used.

Best practice:

- Use this for the building's tactile map or primary indoor information point.
- Keep it distinct from other `information=board` or `information=map` nodes.

### Accessibility and Category Point Features

Supported node tags:

```text
amenity=toilets
amenity=toilets + wheelchair=yes|designated
highway=elevator + wheelchair=yes|designated
highway=steps
stairs=yes
entrance=yes|main|secondary
entrance=exit|emergency
exit=yes|emergency
information=board|map
information=tactile_model|braille|tactile_letters
speech_output=*
speech_output:de=*
speech_output:en=*
wheelchair:description:de=*
wheelchair:description:en=*
level=*
```

Interpretation:

- Marker-relevant nodes are collected separately from rooms.
- `information=tactile_map` is reserved for the main info point and does not create a normal accessibility marker.
- Accessibility marker visibility depends on the active user profile and enabled feature toggles.

Rendering:

- Rendered as point markers on the current level.
- Rooms can also create accessibility markers from their tags, for example an `amenity=toilets` room.

Best practice:

- Use room tags when the feature occupies a room.
- Use point tags when the feature is a point object, entrance, exit, board, or other localized feature.

## Vertical Connections

Vertical connections are the most renderer-specific part of the current model. The renderer supports three practical patterns.

### Enclosed Staircases and Elevators

Expected footprint tags:

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

Optional tags:

```text
handrail=yes|no
handrail:left=yes|no
handrail:right=yes|no
handrail:middle=yes|no
wheelchair=yes|designated|no
```

Interpretation:

- `indoor=room` plus `stairs=yes`, `highway=elevator`, or `highway=escalator` (elevators with `indoor=area` behave identically to `indoor=room`) creates a simple vertical connection footprint.
- The footprint itself is rendered as a 2D room-like area.
- In 3D, the footprint becomes a vertical prism on all levels except the top level.
- Optional `indoor=pathway` middle lines can be added for detailed stair geometry and handrails.

Best practice:

- Use `indoor=room` for enclosed stairwells and elevator shafts.
- Put the footprint on all levels it connects, for example `level=0;1;2`.
- Add a pathway if you want detailed sloped stair rendering.

### Open Staircases

Expected footprint tags:

```text
indoor=area
stairs=yes
level=*
```

Expected pathway tags:

```text
indoor=pathway
level=from-to
```

Optional tags:

```text
width=*
handrail=yes|no
handrail:left=yes|no
handrail:right=yes|no
handrail:middle=yes|no
```

Interpretation:

- `indoor=area + stairs=yes` creates an open vertical connection footprint.
- Pathways that share nodes with the footprint are treated as the stair middle lines for that footprint.
- The path `level=*` must be a vertical span such as `0-1`, not a semicolon list.
- Node-level tags on the pathway nodes refine the 3D altitude. If intermediate nodes do not have levels, their altitudes are interpolated between nearest level anchors.

Rendering:

- The footprint is rendered as a 2D area.
- If no handrail tags are present, the open staircase footprint outline is suppressed so open corridor connections do not look like walls.
- In 3D, pathway middle lines create sloped stair surfaces.
- If handrails are tagged on the footprint, left and right are interpreted in the upward direction.
- If handrails are tagged on the pathway, left and right follow the pathway direction.

Best practice:

- Share nodes between the stair footprint and pathway where the stair connects to surrounding areas.
- Add explicit door nodes when there is a real door.
- If no door exists at an open connection, shared nodes between the footprint and pathway can generate an opening so the connection remains visible.

### Free-Floating Stairs

Expected pathway tags:

```text
indoor=pathway
level=from-to
```

Optional tags:

```text
width=*
repeat_on=*
repeat_on_offset=*
handrail=yes|no
handrail:left=yes|no
handrail:right=yes|no
handrail:middle=yes|no
```

Interpretation:

- A pathway component that is not claimed by a staircase or elevator footprint becomes a free-floating stair.
- `level=from-to` describes the vertical span.
- `repeat_on=*` is interpreted as repeated start levels. For example, `level=1-2 + repeat_on=2` creates a repeated span `2-3`.
- `repeat_on_offset=*` is interpreted as an offset from the authored span.
- Pathway components only connect directly when their vertical span matches. Components with different spans can be grouped through shared landing instances.
- A `level=0-1` stair renders on both level `0` and level `1`. Fractional spans render on the integer levels they touch.

Rendering:

- 2D: rendered as a flat stair surface derived from the middle line and width.
- 3D: rendered as sloped prism segments.
- If no explicit width is present, the default pathway width is 1 m unless a compatible `area:highway=steps` area is available.
- Free-floating stairs render side outlines. If a side has a handrail, the outline uses handrail styling; otherwise it uses a fallback wall-like outline.

Best practice:

- Use one pathway per vertical span.
- For split stairs with intermediate landings, model each ramp as its own pathway and model the landing separately.
- Put `level=*` tags on endpoint nodes and important intermediate nodes when the slope is not uniform.

### Stair Landings

Expected tags:

```text
indoor=area
landing=yes
level=*
```

Optional tags:

```text
repeat_on=*
repeat_on_offset=*
```

Interpretation:

- Landings are stair components, not ordinary rooms.
- They connect pathway components when their level lies on a pathway span boundary.
- Repeated landings can be created with `repeat_on=*` or `repeat_on_offset=*`.

Rendering:

- 2D: rendered as flat stair surface areas for free-floating stair groups.
- 3D: rendered as thin flat prisms at the landing altitude.

Best practice:

- Use landings to connect pathway spans like `0-0.5` and `0.5-1`.
- Share nodes between the landing and adjacent pathways when possible.

### Step Areas for Stair Width

Expected tags:

```text
area:highway=steps
level=*
```

Interpretation:

- Step areas are not rendered directly.
- They are used to estimate the varying width of free-floating stair pathway surfaces when the pathway has no explicit `width=*`.
- Compatible areas are matched by level overlap with the pathway's vertical span.
- Width is sampled by ray-casting through each pathway node. At corners, the ray direction is based on the summed perpendicular vectors of the adjacent path segments, so diagonal and corner widths follow the stair area geometry.

Rendering:

- The step area affects generated 2D and 3D stair surfaces.
- If `width=*` exists on the pathway, it takes priority over the step area.

Best practice:

- Use `area:highway=steps` around free-floating stairs with non-uniform width.
- Extend the step area slightly beyond endpoint nodes so endpoint width sampling has room to hit both sides.
- Keep `level=*` aligned with the pathway span it describes.

### Handrails

There are two supported handrail mechanisms.

Pathway or footprint tags:

```text
handrail=yes|no
handrail:left=yes|no
handrail:right=yes|no
handrail:middle=yes|no
```

Separate handrail ways:

```text
barrier=handrail
level=*
```

Interpretation:

- Generic `handrail=yes` is a fallback for left and right handrails.
- `handrail:left=*` and `handrail:right=*` override the generic tag.
- `handrail:middle=*` is independent and is not implied by `handrail=yes`.
- On pathway tags, left and right follow the path direction.
- On footprint tags, left and right are oriented in the upward direction.
- `barrier=handrail` ways are normally rendered as wall-like handrail lines.
- If a `barrier=handrail` way shares at least two nodes with a landing instance, it is treated as a landing handrail and rendered only in 3D with the stair.

Rendering:

- Tagged stair handrails render in 3D along stair path edges or the middle.
- Free-floating stair side outlines use handrail styling on sides with handrails.
- Standalone `barrier=handrail` ways render as 2D wall/handrail lines unless attached to a landing.

Best practice:

- Use tags on the pathway for handrails that follow a sloped stair run.
- Use `barrier=handrail` ways for standalone handrails in corridors or on landings.

## Accessibility Tags

The renderer currently uses these tags for fill patterns, markers, and accessibility descriptions:

```text
wheelchair=yes|designated|no
wheelchair:description:de=*
wheelchair:description:en=*
amenity=toilets
male=*
female=*
speech_output=*
speech_output:de=*
speech_output:en=*
information=tactile_map|tactile_model|braille|tactile_letters|board|map
entrance=yes|main|secondary|exit|emergency
exit=yes|emergency
highway=elevator|steps
stairs=yes
```

Accessibility marker visibility depends on the active user profile:

- Wheelchair users: accessible toilets, wheelchair-accessible elevators, wheelchair information, wheelchair descriptions.
- Blind users: tactile information, tactile paving related information, stairs, speech output, entrances/exits.
- No impairment profile: general toilets, entrances/exits, information boards, stairs.

## Search and Labels

For best results:

- Add `name=*` or `ref=*` to rooms.
- Add category tags such as `amenity=toilets`, `highway=elevator`, `stairs=yes`, `shop=*`, `amenity=cafe`, or `amenity=restaurant` where applicable.
- Keep level tags numeric and consistent.

## Minimal Checklist

For each building:

- Add level-tagged `indoor=room`, `indoor=corridor`, and `indoor=area` polygons.
- Add `indoor=level` outlines with `level:ref=*` if level labels or floor plates differ from the building outline.
- Put doors directly on room or wall way nodes.
- Use explicit `indoor=wall` line ways where doors connect corridors or where no room boundary should provide wall width.
- Tag columns as `indoor=column`, with `diameter=*` for node columns.
- Tag tactile guidance ways with `indoor=yes + tactile_paving=yes + level=*`.
- Tag the main info point with `information=tactile_map + level=*`.
- For enclosed stairs/elevators, use `indoor=room` plus `stairs=yes` or `highway=elevator`.
- For open stairs, use `indoor=area + stairs=yes` plus `indoor=pathway` middle lines.
- For free-floating stairs, use `indoor=pathway + level=from-to`; add `width=*` or an `area:highway=steps` area.
- Use `landing=yes` areas for intermediate landings.
- Add handrail tags or `barrier=handrail` ways when handrails matter for the 2D/3D representation.
