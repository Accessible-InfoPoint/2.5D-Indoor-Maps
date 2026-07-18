# 2.5D Indoor Maps

This project focuses on the development of a 2.5D indoor mapping application based on OpenStreetMap data. The goal is to improve building navigation and accessibility by combining 2D layouts with a perspective height representation. The application is designed for use in indoor navigation systems and info points, making multi-level wayfinding more intuitive.

The project builds upon [Mapable](https://github.com/AccessibleMaps/Mapable), an open-source indoor mapping application from the AccessibleMaps research project, and extends it with 2.5D visualization, enhanced floor transitions, and 3D representation of stairs and elevators.

This repository contains the source code for the 2.5D visualization prototype, including custom rendering of stairs, elevators, and floor connections. The project is released under the MIT license (see LICENSE file for details).

Used technologies:

- MapLibre GL JS: [https://maplibre.org/maplibre-gl-js/docs/](https://maplibre.org/maplibre-gl-js/docs/)
- THREE.js: [https://threejs.org/](https://threejs.org/)
- OverpassAPI: [https://wiki.openstreetmap.org/wiki/Overpass_API](https://wiki.openstreetmap.org/wiki/Overpass_API)

The source files are written in [TypeScript](https://www.typescriptlang.org/).

## Installation

First, ensure to have [Node.js](https://nodejs.org/en/) installed on your system. Install dependencies with:

```sh
npm i
```

For production or reproducible deployments, prefer:

```sh
npm ci
```

## Execution

For local development, start the app with:

```sh
npm run dev
```

This builds the client and server once, starts the web server, and keeps
watching the source files. When client files change, webpack rebuilds the
browser bundles. When server files change, TypeScript recompiles the server and
Node restarts the compiled server process.

Afterwards, the app is accessible via your browser under the displayed URL.

For production-like usage, run one command to build the client and server and
start the application:

```sh
npm start
```

Overpass requests identify the application with a default `User-Agent`. For a
production deployment, set `OVERPASS_USER_AGENT` to an application identifier
that also provides operator contact information:

```sh
OVERPASS_USER_AGENT="2.5D-Indoor-Maps/1.0 (contact@example.org)" npm start
```

PowerShell:

```powershell
$env:OVERPASS_USER_AGENT = "2.5D-Indoor-Maps/1.0 (contact@example.org)"
npm start
```

For production-like usage, build once and run the compiled server artifact:

```sh
npm run build
npm run serve
```

## Development workflow

Development uses a lightweight feature-branch workflow: keep `main` stable and
do larger changes on branches such as `feature/...`, `fix/...`, or
`migration/...`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, checks, branch naming, and
release steps. Planned work and larger refactoring ideas are tracked in
[ROADMAP.md](ROADMAP.md). Release notes are collected in
[CHANGELOG.md](CHANGELOG.md).

Configuration fields in `public/strings/settings.json` and
`public/strings/buildingConstants.json`, plus official Overpass building source
definitions in `public/strings/buildingSources.json`, are documented in
[docs/configuration.md](docs/configuration.md).

Official `cachedOverpass` buildings can be switched through `CURRENT_BUILDING`
when the building exists in both `buildingConstants.json` and
`buildingSources.json`. For local experiments with new buildings, use
`npm run overpass:candidate -- ...` or
`npm run overpass:list-buildings -- ...`; the full workflow is documented in
[CONTRIBUTING.md](CONTRIBUTING.md).

## Project structure

### _public_

Contains all the static files that are to be sent to clients, including:

- index.html
- compiled JavaScript bundle files (which also load css styles, included by webpack)
- OverPass XML files, transformed to GeoJSON (are downloaded and transformed on server start, if necessary)
- Constants used by the application (general constants for rendering and constants for each building)
- images, both icons and patterns for indicating wheelchair accessability (generated on server startup)

This directory doesn't contain any application logic!

### _server_

TypeScript source files which are needed to run the Node-based webserver. Exported functions from here are called in
`./index.ts` and compiled to `dist/server`.

### _src_

The client application's source files, written in TypeScript.

## Icons

Free icon attributions:

- <https://thenounproject.com/>
- <https://freeicons.io/profile/5790>
- <https://www.freepik.com>
- <https://www.flaticon.com/>

See attribution files for further details.

## Data Sources and Attribution

This project uses OpenStreetMap data for indoor map representation and visualization.

OpenStreetMap data is © OpenStreetMap contributors and available under the Open Database License (ODbL). For more information, see the OpenStreetMap copyright and license information.

When using, modifying, or distributing maps or derived works based on OpenStreetMap data, please ensure that proper attribution is provided in accordance with the OpenStreetMap attribution guidelines.
