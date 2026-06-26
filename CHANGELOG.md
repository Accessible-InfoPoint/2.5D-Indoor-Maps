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
- UI-aware map viewport padding and max-bounds constraints based on the loaded building bounding box.
- Custom MapLibre left-button rotate/pitch handling for 3D mode through the existing `switchDragButton` interaction option.
- Configuration reference documentation for `settings.json` and `buildingConstants.json`.

### Changed

- Updated APB MapLibre zoom settings and allowed MapLibre pitch above the default 60 degree limit for the 2.5D view.
- Switched the base map stylesheet from maptalks to MapLibre while keeping the rendering adapter boundary in place.

### Fixed

- 

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
