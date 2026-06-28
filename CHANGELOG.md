# Changelog

All notable changes to this project should be documented in this file.

This project uses feature branches and versioned releases. Add entries under
`Unreleased` while working on a feature branch, then move them into a versioned
section when the feature is merged and released.

The format is inspired by [Keep a Changelog](https://keepachangelog.com/), and
versions should follow [Semantic Versioning](https://semver.org/) where it is
useful for the project.

## Unreleased

### Added

- Initial MapLibre map and camera adapter for the migration away from maptalks.
- Max-bounds constraints based on the loaded building bounding box.
- Custom MapLibre left-button rotate/pitch handling for 3D mode through the existing `switchDragButton` interaction option.
- Configuration reference documentation for `settings.json` and `buildingConstants.json`.
- MapLibre indoor level rendering scaffold with room fill and border layers.
- Section dividers in the MapLibre indoor level view to make the rendering scaffold easier to navigate.
- Optional per-building `STANDARD_CENTER` and `STANDARD_CENTER_WHEELCHAIR_MODE` settings for layout-aware map centering.
- MapLibre room fill-pattern support for wheelchair-accessible patterned room backgrounds.
- MapLibre room-number labels with zoom fade-in and stretchable rounded rectangle backgrounds.
- MapLibre tactile paving line rendering with dashed styling from the indoor level render model.
- MapLibre accessibility marker rendering with custom clustering, same-symbol cluster preservation, and cluster/single-marker click behavior.
- MapLibre 2D door rendering based on the existing door orientation and style data.
- Temporary MapLibre door orientation debug overlay showing the source wall points used for door calculations.
- Initial MapLibre Three.js indoor layer scaffold with grouped 3D outline rendering.
- MapLibre Three.js rendering for indoor rooms that are visible in 3D mode.
- MapLibre Three.js infopoint and selected-position markers with canvas-text labels and switchable camera-facing billboards.
- Added a minimal Three.js SpriteMaterial/Sprite marker mode for debugging billboard rendering in the MapLibre custom layer.
- MapLibre Three.js staircase rendering for simple prism/cylinder staircases and complex sloped staircase prisms.

### Changed

- Updated APB MapLibre zoom settings and allowed MapLibre pitch above the default 60 degree limit for the 2.5D view.
- Switched the base map stylesheet from maptalks to MapLibre while keeping the rendering adapter boundary in place.
- Disabled UI-aware MapLibre viewport padding so configured map centers behave predictably across layouts.
- Reused the existing GeoJSON polygon-center helper for MapLibre room-number placement instead of custom centroid math.
- Split MapLibre indoor level rendering helpers and accessibility marker clustering into dedicated `indoorLevel/maplibre` modules.
- Moved MapLibre indoor feature conversion for rooms, room numbers, and styled lines into a dedicated converter module.
- Moved MapLibre indoor layer definitions for rooms, doors, infopoints, tactile paving, and room numbers into a dedicated layer-definition module.
- Moved MapLibre Three.js Mercator-local geometry creation into a dedicated geometry module.
- Moved MapLibre Three.js marker creation, shader billboard handling, and marker texture rendering into a dedicated marker module.
- Reused the existing staircase render model for MapLibre Three.js staircase generation.
- Reduced MapLibre room-number background padding and hid the 2D infopoint layer in 3D mode.

### Fixed

- Prevented MapLibre indoor levels from staying empty after profile/settings changes by rerendering against initialized layer sources instead of waiting for a second map `load` event.
- Reapplied configured map centers after UI layout changes so saved MapLibre `getCenter()` values stay aligned across regular and wheelchair layouts.
- Restored the saved wheelchair layout before the initial level control render so it starts with the correct orientation.
- Replaced axis-aligned MapLibre max bounds with a circular `transformConstrain` center constraint around the configured building center, including explicit zoom clamping.
- Made the MapLibre `transformConstrain` zoom clamp use the adapter's configured zoom bounds directly instead of reading them back from the map instance.
- Avoided blanking MapLibre indoor layer sources before selection/style rerenders, reducing full-screen flashes when selecting rooms.
- Rasterized SVG accessibility marker icons before registering them with MapLibre to avoid marker image decode warnings.
- Preserved current MapLibre bearing and pitch when zooming to accessibility marker clusters.
- Prevented MapLibre room selection from also firing when clicking an accessibility marker above a room.
- Prevented rooms from connecting to same-coordinate doors on different levels when calculating door orientation.
- Stabilized MapLibre Three.js room rendering during rotation by drawing 3D rooms as single elevated surfaces.
- Locked the MapLibre center constraint in 3D mode so only rotation and zoom can change the view.
- Switched the experimental Three.js billboard markers to opaque alpha-tested rendering.
- Made the experimental Three.js sprite markers double-sided so the debug sprite is visible from the normal 3D map camera side.
- Replaced the active experimental Three.js marker billboard with a screen-aligned shader quad so marker facing no longer depends on `THREE.Sprite` camera assumptions.
- Kept selected-room markers visible in the MapLibre Three.js layer even when the older selected-position marker label data is suppressed.
- Restored selected-position marker labels for rooms above or below the infopoint level by comparing level distances numerically.
- Tried stabilizing translucent 3D room rendering with non-depth-writing room materials, depth testing, and explicit Three.js render ordering.
- Prevented repeated complex staircases from rendering twice by starting pathway expansion only from lowest staircase nodes on the current level.
- Prevented invalid MapLibre Three.js staircase geometries from reaching the scene by handling same-level pathway altitude interpolation and validating generated position buffers.
- Added a MapLibre Three.js clipping plane matching the previous maptalks staircase cutoff to trim geometry above the top visible 3D level.

### Removed

- 

## 1.0.1 - 2026-06-28

### Fixed

- Fixed complex staircases being rendered multiple times.
- Kept ignored local `tmp` prototypes out of lint checks.

## Release Template

```md
## 1.0.0 - YYYY-MM-DD

### Added

- 

### Changed

- 

### Fixed

- 

### Removed

- 
```
