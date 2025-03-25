# 2.5D Indoor Maps

This project focuses on the development of a 2.5D indoor mapping application based on OpenStreetMap data. The goal is to improve building navigation and accessibility by combining 2D layouts with a perspective height representation. The application is designed for use in indoor navigation systems and info points, making multi-level wayfinding more intuitive.

The project builds upon Mapable, an open-source indoor mapping application from the AccessibleMaps research project, and extends it with 2.5D visualization, enhanced floor transitions, and 3D representation of stairs and elevators.

This repository contains the source code for the 2.5D visualization prototype, including custom rendering of stairs, elevators, and floor connections. The project is released under the MIT license (see LICENSE file for details).

Used technologies:

* Maptalks: [https://maptalks.org/](https://maptalks.org/)
* THREE.js: [https://threejs.org/](https://threejs.org/)
* OverpassAPI: [https://wiki.openstreetmap.org/wiki/Overpass_API](https://wiki.openstreetmap.org/wiki/Overpass_API)

The source files are written in [TypeScript](https://www.typescriptlang.org/).

## Installation

First, ensure to have [Node.js](https://nodejs.org/en/) installed on your system. In order to install dependencies and
to build a webpack-bundled JS file, execute the following steps:

1. Install dependencies: `npm i`
2. Compile Typescript files and build JS bundle: `npm run build`

## Execution

Run `node index.js` or `npm start` in order to start a small webserver. Afterwards, the app is accessible via your
browser under the displayed url.

Alternatively, run `npm run build-start` to combine building and execution of the webserver.

## Project structure

### _public_

Contains all the static files that are to be sent to clients, including:

* index.html
* compiled JavaScript bundle files (which also load css styles, included by webpack)
* OverPass XML files, transformed to GeoJSON (are downloaded and transformed on server start, if necessary)
* Constants used by the application (general constants for rendering and constants for each building)
* images, both icons and patterns for indicating wheelchair accessability (generated on server startup)

This directory doesn't contain any application logic!

### _server_

JS source files which are needed to run the Node-based webserver. Exported functions from here are called in `./index.js`.

### _src_

The client application's source files, written in TypeScript.

## Icons
Free icon attributions:
* https://thenounproject.com/
* https://freeicons.io/profile/5790
* https://www.freepik.com
* https://www.flaticon.com/

See attribution files for further details.
