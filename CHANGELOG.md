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

- Added a shared `npm run check` command that runs config validation, formatting,
  linting, type checking, tests, production build, bundle budget checks, and
  Playwright checks.
- Added Playwright smoke tests and axe accessibility checks for the map UI,
  wheelchair mode, and settings modals.
- Added JSON validation for settings, building constants, constants, color
  profiles, icon references, and language key/placeholder parity.
- Added a bundle budget check and server response compression.
- Added Dependabot configuration and a pull request template.

### Changed

- Expanded GitHub Actions to run the full repository check workflow and upload
  Playwright reports on failure.
- Added Prettier formatting and formatted the repository.
- Documented the local check and formatting workflow.

### Fixed

- Map bearing no longer snaps to zero on low values

### Removed

## 1.2.0 - 2026-07-07

### Added

- Live search suggestion cards with category icons, room-type labels, and keyboard-accessible buttons/ARIA combobox pattern.
- Clear buttons for search input and errors, plus a suggestion sort-order debug view.
- Multi-key suggestion sorting (per-field match score, level, wheelchair accessibility, selection/infopoint proximity) via a reusable comparator-chain utility.
- Added a backend endpoint for serving building-filtered indoor data.

### Changed

- Enter/Search now routes through the sorted suggestion list instead of the old `handleIndoorSearch`/`runIndoorSearch` path.
- Search errors now surface inline above the search bar instead of as a top-left toast.
- Improved map controls with clearer accessible labels, reduced-motion support, static centering button markup, and more robust loading/error feedback.
- Moved map attribution to the top right, added CARTO/OpenStreetMap/MapLibre attribution text, and adjusted the wheelchair-mode legend layout around it.
- Improved frontend performance by extracting CSS, trimming unused Bootstrap imports, self-hosting Material icons, and lazy-loading the 3D rendering code.

### Fixed

- Fixed complex staircases not rendering when their feature contains lowest points on another level.
- Suggestions now filter out features without a level, indoor-type features, waste baskets, and can filter out OSM name artifacts, e.g. ("yes"/"no").

### Removed

- Removed the unused maptalks dependency and documentation references.

## 1.1.0 - 2026-06-28

### Added

- Added a MapLibre rendering path for the indoor map, including the base map view, camera adapter, custom interaction handling, zoom/pitch settings, center constraints, and configuration documentation.
- Added MapLibre 2D indoor rendering for rooms, room numbers, tactile paving, doors, infopoints, wheelchair-accessible room patterns, and clustered accessibility markers.
- Added MapLibre Three.js 2.5D rendering for indoor outlines, rooms, infopoint and selected-position markers, simple and complex staircases, level clipping, and grouped scene objects for altitude handling.
- Added layout-aware building centering, circular center constraints, smoother profile/selection rerendering, and MapLibre-specific image/style helpers to keep the migrated view stable across modes.
- Split the MapLibre migration into dedicated modules for feature conversion, layer definitions, image registration, accessibility marker clustering, Three.js geometry, markers, and staircases.

## 1.0.2 - 2026-06-28

### Fixed

- Prevented same-coordinate doors on different levels from replacing each other in the door index.
- Made SVG user-profile quick-switch icons inherit the button color via CSS masks so active and inactive states match Material icons.
- Made staircase pathway geometry handling fail-safe so unsupported geometries are logged and skipped instead of crashing the map render.

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
