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

### Changed

- Updated APB MapLibre zoom settings and allowed MapLibre pitch above the default 60 degree limit for the 2.5D view.
- Switched the base map stylesheet from maptalks to MapLibre while keeping the rendering adapter boundary in place.
- Disabled UI-aware MapLibre viewport padding so configured map centers behave predictably across layouts.

### Fixed

- Prevented MapLibre indoor levels from staying empty after profile/settings changes by rerendering against initialized layer sources instead of waiting for a second map `load` event.
- Reapplied configured map centers after UI layout changes so saved MapLibre `getCenter()` values stay aligned across regular and wheelchair layouts.
- Restored the saved wheelchair layout before the initial level control render so it starts with the correct orientation.
- Replaced axis-aligned MapLibre max bounds with a circular `transformConstrain` center constraint around the configured building center, including explicit zoom clamping.
- Made the MapLibre `transformConstrain` zoom clamp use the adapter's configured zoom bounds directly instead of reading them back from the map instance.

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
