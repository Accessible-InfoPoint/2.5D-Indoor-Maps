# Roadmap

This roadmap is a working document, not a promise. It collects possible areas
for improvement so larger changes can be planned as features instead of being
mixed into unrelated refactors.

## Near Term

### Data Loading and Server

- Add clearer cache invalidation for downloaded Overpass data.
- Make Overpass download failures visible in a way that helps local debugging.
- Consider a small fixture dataset for deterministic server tests.

### Accessibility and Controls

- Review keyboard navigation for map controls, level controls, and settings.
- Tune map bounds constraints to work with rotated bounding box

## Larger Features

### Indoor Data Model

- Document the expected OSM tags used by the renderer.
- Separate parsing, normalization, and rendering-facing data structures.
- Add tests around level parsing, building constants, stairs, elevators, and
  accessibility tags.

### Rendering and Interaction

- Make level animation state explicit and easier to reason about.
- Review whether 2D and 3D views can share more rendering state safely.
- Add debug views or logging for geometry and level visibility issues.

## Maintenance

- Periodically run `npm audit` and handle dependency updates in small branches.
- Keep TypeScript, Jest, ESLint, and webpack updates separate from feature work
  when possible.
- Revisit strict type-checking failures and reduce the number of places that
  need relaxed typing.
- Review old compatibility code and remove it when no longer needed.

## Later Ideas

- Add GitHub issue templates for bugs, features, and technical debt.
- Add architectural decision records under `docs/adr/` for major choices.
- Add a small demo-data mode so the application can be started without live
  Overpass downloads.
- Add deployment notes for a static host plus Node server, or for a container
  setup if production hosting becomes relevant.
