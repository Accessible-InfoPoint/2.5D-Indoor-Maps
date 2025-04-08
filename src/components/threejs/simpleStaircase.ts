import * as THREE from "three";
import * as Maptalks from "maptalks";
import { BaseObject, ThreeLayer } from "maptalks.three";
import { Prism } from "./prism";
import { LEVEL_HEIGHT } from "../../../public/strings/constants.json";
import coordinateHelpers from "../../utils/coordinateHelpers";

export function simpleStaircase(coordinates: GeoJSON.Position[], altitude: number, material: THREE.MeshBasicMaterial, outlineMaterial: THREE.MeshBasicMaterial, layer: ThreeLayer, onclick: () => void): BaseObject[] {
    // construct the shape of the staircase, which is a polygonal ground and a height, ergo a prism
    const prism = new Prism(
        coordinates.map(pos => [pos[0], pos[1], 0]),
        { height: LEVEL_HEIGHT, altitude: altitude },
        material,
        layer
    );
    prism.on("click", () => onclick());
    return [
        prism,
        // add the corners as vertical cylinders, as doors and other nodes are still in the coordinates we need to remove these
        // (simplify the nodes by removing those with nearly a 180 degree angle)
        ...coordinateHelpers.simplifyByAngle(coordinates, 5).slice(0, -1).map(coord =>
            // construct an object that nears a cylinder, but with 10 radial segments
            layer.toBar(new Maptalks.Coordinate(coord as Maptalks.CoordinateArray), {height: LEVEL_HEIGHT, altitude: altitude, radialSegments: 10, asynchronous: true, radius: 0.02}, outlineMaterial)
        )
    ];
}