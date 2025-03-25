# KP InfoPunkt 2.5D

The project AccessibleMaps aims to make indoor mobility more accessible for people with disabilities in the occupational context. This repository focuses on an app prototype for accessible mobile indoor map interaction called Mapable, made available under MIT license (see LICENSE file for further details).

Used technologies:

* Leaflet: https://leafletjs.com/
* OverpassAPI: https://wiki.openstreetmap.org/wiki/Overpass_API

The source files are written in [TypeScript](https://www.typescriptlang.org/).

## Installation

First, ensure to have [Node.js](https://nodejs.org/en/) installed on your system. In order to install dependencies and
to build a webpack-bundled JS file, execute the following steps:

1. Install dependencies: `npm i`
2. Compile Typescript files and build JS bundle: `npm run build`

## Execution

Run `node index.js` or `npm start` in order to start a small webserver. Afterwards, the app is accessible via your
browser under the displayed url.

## Project structure

### _public_

Contains all the static files that are to be sent to clients, including:

* index.html
* compiled JavaScript bundle files (which also load css styles, included by webpack)
* OverPass XML files, transformed to GeoJSON (are downloaded and transformed on server start, if necessary)

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
