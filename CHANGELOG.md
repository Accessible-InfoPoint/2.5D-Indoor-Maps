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

- 

### Changed

- 

### Fixed

- Made SVG user-profile quick-switch icons inherit the button color via CSS masks so active and inactive states match Material icons.
- Made staircase pathway geometry handling fail-safe so unsupported geometries are logged and skipped instead of crashing the map render.

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
