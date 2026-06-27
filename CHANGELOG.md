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

### Changed

- Updated APB MapLibre zoom settings and allowed MapLibre pitch above the default 60 degree limit for the 2.5D view.
- Switched the base map stylesheet from maptalks to MapLibre while keeping the rendering adapter boundary in place.
- Disabled UI-aware MapLibre viewport padding so configured map centers behave predictably across layouts.
- Reused the existing GeoJSON polygon-center helper for MapLibre room-number placement instead of custom centroid math.
- Split MapLibre indoor level rendering helpers and accessibility marker clustering into dedicated `indoorLevel/maplibre` modules.
- Moved MapLibre indoor feature conversion for rooms, room numbers, and styled lines into a dedicated converter module.
- Moved MapLibre indoor layer definitions for rooms, doors, infopoints, tactile paving, and room numbers into a dedicated layer-definition module.
- Moved MapLibre Three.js Mercator-local geometry creation into a dedicated geometry module.

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

### Removed

- 

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
