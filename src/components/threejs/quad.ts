/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as THREE from "three";
import * as Maptalks from "maptalks";
import { ThreeLayer, BaseObject } from "maptalks.three";

const OPTIONS = {
    width: 10,
    height: 1,
    altitude: 0
}

export class Prism extends BaseObject {
    constructor(corners: GeoJSON.Position[], options: object, material: THREE.Material, layer: ThreeLayer) {
        options = Maptalks.Util.extend({}, OPTIONS, options, { layer: layer, corners: corners });
        super();

        const { geometry, centerPt, polygon } = this.generateGeometry(corners, options, material);
        // @ts-ignore
        options.polygon = polygon;
        // @ts-ignore
        options.coordinates = corners;
        this._initOptions(options);
        this._createMesh(geometry, material);

        // @ts-ignore
        const { altitude } = options;
        //set object3d position
        const z = layer.altitudeToVector3(altitude as number, altitude as number).x;
        centerPt.z = z;
        this.getObject3d().position.copy(centerPt);
    }

    generateGeometry(corners: GeoJSON.Position[], options: object, material: THREE.Material): Record<string, any> {
        // @ts-ignore
        const { height, layer } = options;
        const polygon = new Maptalks.Polygon(corners.map(p => new Maptalks.Coordinate(p as Maptalks.CoordinateArray)));

        const centerPt = (layer as ThreeLayer).coordinateToVector3(polygon.getCenter());
        const xykeys: Record<string, any> = {};
        for (let i = 0, len = corners.length; i < len; i++) {
            const altitude = corners[i][2];
            const z = (layer as ThreeLayer).altitudeToVector3(altitude, altitude).x;
            const p = (layer as ThreeLayer).coordinateToVector3(new Maptalks.Coordinate(corners[i] as Maptalks.CoordinateArray)).sub(centerPt);
            const xy = [p.x.toFixed(4), p.y.toFixed(4)].join('-').toString();
            xykeys[xy] = z;
        }

        // @ts-ignore
        const geometry = (layer as ThreeLayer).toExtrudePolygon(polygon, { height: (height as number) }, material).getObject3d().geometry;

        const position = geometry.attributes.position.array;
        // I have no idea what that does, I stole it
        const xyzkeys: Record<string, any> = {};
        for (let i = 0, len = position.length; i < len; i += 3) {
            const x = position[i], y = position[i + 1], z = position[i + 2];

            const xyz = [x, y, z].join('-').toString();
            const xy = [x.toFixed(4), y.toFixed(4)].join('-').toString();
            let offset;
            if (xykeys[xyz] != null) {
                offset = xykeys[xyz];
            } else {
                offset = xykeys[xy] || 0;
                xyzkeys[xyz] = offset;
            }
            position[i + 2] += offset;
        }

        return {
            geometry,
            centerPt,
            polygon
        };
    }
}