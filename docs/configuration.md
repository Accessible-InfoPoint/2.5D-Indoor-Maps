# Configuration Reference

The application reads runtime configuration from JSON files in `public/strings`.
JSON does not support comments, so field descriptions live here instead of in the
configuration files.

## `settings.json`

General application, rendering, backend, and UI settings.

| Field                          | Unit / Type              | Description                                                                                                                                                                                                                                                           |
| ------------------------------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INDOOR_LEVEL`                 | level number             | Default indoor level shown after loading a building.                                                                                                                                                                                                                  |
| `FILL_OPACITY`                 | ratio, `0` to `1`        | Default opacity for filled indoor areas.                                                                                                                                                                                                                              |
| `STAIRCASE_OPACITY`            | ratio, `0` to `1`        | Opacity for rendered staircase surfaces.                                                                                                                                                                                                                              |
| `STAIRCASE_OUTLINE_OPACITY`    | ratio, `0` to `1`        | Opacity for staircase outlines.                                                                                                                                                                                                                                       |
| `OPACITY_TRANSLUCENT_LAYER`    | ratio, `0` to `1`        | Opacity used for neighboring translucent levels in 2.5D mode.                                                                                                                                                                                                         |
| `WALL_WEIGHT`                  | pixels                   | Base line width for walls.                                                                                                                                                                                                                                            |
| `WALL_WEIGHT_PAVING`           | pixels                   | Base line width for tactile paving.                                                                                                                                                                                                                                   |
| `LEVEL_HEIGHT`                 | render units             | Vertical distance between levels in 2.5D mode.                                                                                                                                                                                                                        |
| `STAIRCASE_HANDRAIL_HEIGHT`    | render units             | Height used when rendering staircase handrails.                                                                                                                                                                                                                       |
| `DOOR_MATCH_TOLERANCE_M`       | meters                   | Distance tolerance for matching door points to room outlines.                                                                                                                                                                                                         |
| `BACKEND_SOURCE`               | enum string              | Data source. Current values are `localGeojson` and `cachedOverpass`.                                                                                                                                                                                                  |
| `INDOOR_DATA_PIPELINE`         | enum string              | Indoor rendering pipeline. `geoJsonCompatibility` uses the server-filtered GeoJSON endpoint; `clientGeoJsonCompatibility` fetches filtered raw Overpass data and converts it in the browser; `rawIndoorModel` is reserved for the raw Overpass domain-model renderer. |
| `CURRENT_BUILDING`             | building id string       | Building key from `buildingConstants.json` to load by default.                                                                                                                                                                                                        |
| `MAP_START_LAT`                | latitude degrees string  | Initial map latitude before backend data recenters the map.                                                                                                                                                                                                           |
| `MAP_START_LNG`                | longitude degrees string | Initial map longitude before backend data recenters the map.                                                                                                                                                                                                          |
| `MAP_UI_GAP_PX`                | pixels                   | Reserved screen-space gap for UI-aware map padding. Currently not applied while MapLibre viewport padding is disabled.                                                                                                                                                |
| `MAP_MIN_BOUNDS_MARGIN_FACTOR` | unitless multiplier      | Minimum amount to expand the building bounding box for pan constraints, relative to the building bbox span.                                                                                                                                                           |
| `MAP_MAX_LATITUDE_BOUND`       | latitude degrees         | Safety clamp for expanded map bounds. Web Mercator maps should stay below the polar extremes.                                                                                                                                                                         |
| `VISIBLE_LEVEL_CONTROLS`       | count                    | Number of level buttons visible in the level control window.                                                                                                                                                                                                          |
| `START_LEVEL_CONTROL_POSITION` | index                    | Initial position of the selected level inside the level control window.                                                                                                                                                                                               |

## `buildingConstants.json`

Per-building settings keyed by building id. The `CURRENT_BUILDING` setting must
match one of these top-level keys. For cached Overpass data, the same building
id must also exist in `buildingSources.json`.

| Field                             | Unit / Type             | Description                                                                                                                         |
| --------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `SEARCH_STRING`                   | string                  | Building search token used to select the building feature from the loaded data.                                                     |
| `BEARING_OFFSET`                  | degrees                 | Offset applied after deriving the standard map bearing from two reference nodes.                                                    |
| `BEARING_CALC_NODE1`              | OSM node id string      | First reference node used to calculate the standard map bearing.                                                                    |
| `BEARING_CALC_NODE2`              | OSM node id string      | Second reference node used to calculate the standard map bearing.                                                                   |
| `STANDARD_ZOOM`                   | map zoom                | Default 2D zoom level after centering on the building.                                                                              |
| `STANDARD_CENTER`                 | `[longitude, latitude]` | Optional 2D/regular-mode center. If omitted, the app uses the loaded building bounding box center.                                  |
| `STANDARD_CENTER_WHEELCHAIR_MODE` | `[longitude, latitude]` | Optional center for the wheelchair UI layout. If omitted, the app falls back to `STANDARD_CENTER`, then to the bounding box center. |
| `MAX_ZOOM`                        | map zoom                | Maximum user zoom level outside config mode.                                                                                        |
| `MIN_ZOOM`                        | map zoom                | Minimum user zoom level outside config mode.                                                                                        |
| `STANDARD_BEARING_3D_MODE`        | degrees                 | Bearing used when entering 2.5D mode.                                                                                               |
| `STANDARD_PITCH_3D_MODE`          | degrees                 | Pitch used when entering 2.5D mode. MapLibre defaults to a 60 degree max pitch unless the map view raises it.                       |
| `STANDARD_ZOOM_3D_MODE`           | map zoom                | Zoom used when entering 2.5D mode.                                                                                                  |

## `buildingSources.json`

Official Overpass source settings for buildings that can be loaded through the
`cachedOverpass` backend.

| Field                                 | Unit / Type                       | Description                                                                     |
| ------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------- |
| `sources.<sourceId>.label`            | string                            | Human-readable label used in logs and diagnostics.                              |
| `sources.<sourceId>.region`           | object                            | Overpass search region. Supported types are `area` and `bbox`.                  |
| `region.type`                         | enum string                       | `area` uses an Overpass area name. `bbox` uses explicit coordinates.            |
| `region.name`                         | string                            | Area name used when `type` is `area`, for example `Dresden`.                    |
| `region.bbox`                         | `[west, south, east, north]`      | Bounding box used when `type` is `bbox`.                                        |
| `buildings.<buildingId>.source`       | source id string                  | Source id from `sources`.                                                       |
| `buildings.<buildingId>.buildingTags` | object of OSM tag key/value pairs | Tags that must identify exactly one SIT building in the downloaded source data. |

Every building id in `buildingSources.json/buildings` must have a matching
entry in `buildingConstants.json`, and vice versa.

## Local Overpass Candidates

Use `npm run overpass:candidate -- --id <id> --area-name "<name>" --tag key=value`
or `--bbox west,south,east,north` to download and validate a candidate building
without changing official config. The script writes files under
`tmp/overpass-candidates/<id>/`, including transformed `buildings.json`,
`indoor.json`, `report.json`, and a suggested `buildingSources` snippet.
Quoted option values are supported for area names and tags with spaces.

Use `npm run overpass:list-buildings -- --area-name "<name>"` or
`--bbox west,south,east,north` to list SIT-conform buildings in an area before
choosing a candidate. The command writes a compact
`sit-buildings.features.json` file with only feature ids and properties, plus
the Overpass query and an Overpass Turbo URL for visual inspection.

## Documentation Options

For human-readable notes, keep this Markdown file next to the source. For editor
validation and inline hints, add JSON Schema files later and reference them from
the JSON files with a `$schema` field.
