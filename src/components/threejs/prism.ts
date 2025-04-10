/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as THREE from "three";
import * as Maptalks from "maptalks";
import { ThreeLayer, BaseObject } from "maptalks.three";

const OPTIONS = {
    width: 10,
    height: 1,
    altitude: 0
}

/**
 * A 3D extruded polygon (prism) object based on given GeoJSON coordinates.
 * Uses Maptalks and THREE.js for rendering in a 3D map environment.
 */
export class Prism extends BaseObject {
    /**
     * Constructs a 3D Prism object.
     *
     * @param corners - Array of GeoJSON coordinates [lng, lat] or [lng, lat, alt].
     * @param options - Configuration options including height, altitude, etc.
     * @param material - THREE.js material used to render the mesh.
     * @param layer - The ThreeLayer instance this object will belong to.
     */
    constructor(corners: GeoJSON.Position[], options: object, material: THREE.Material, layer: ThreeLayer) {
        // Merge default options with provided options and necessary metadata
        options = Maptalks.Util.extend({}, OPTIONS, options, {
            layer: layer,
            corners: corners
        });

        super();

        // Generate geometry and related data (center point and polygon shape)
        const { geometry, centerPt, polygon } = this.generateGeometry(corners, options, material);

        // Attach metadata to options for internal use
        // @ts-ignore
        options.polygon = polygon;
        // @ts-ignore
        options.coordinates = corners;

        this._initOptions(options);
        this._createMesh(geometry, material);

        // Set the 3D object's vertical position based on altitude
        // @ts-ignore
        const { altitude } = options;
        const z = layer.altitudeToVector3(altitude as number, altitude as number).x;
        centerPt.z = z;

        // Move the mesh to its correct center position in 3D space
        this.getObject3d().position.copy(centerPt);
    }

    /**
     * Generates the 3D geometry for the prism using the polygon corners and options.
     *
     * @param corners - Array of GeoJSON coordinates.
     * @param options - Configuration options including height and layer reference.
     * @param material - THREE.js material for the mesh.
     * @returns Object containing the geometry, center point, and polygon.
     */
    generateGeometry(corners: GeoJSON.Position[], options: object, material: THREE.Material): Record<string, any> {
        // @ts-ignore
        const { height, layer } = options;

        // Create a Maptalks polygon from the corner coordinates
        const polygon = new Maptalks.Polygon(corners.map(p =>
            new Maptalks.Coordinate(p as Maptalks.CoordinateArray)
        ));

        // Get the 3D center point of the polygon
        const centerPt = (layer as ThreeLayer).coordinateToVector3(polygon.getCenter());

        // Map each vertex's 2D key (x-y rounded) to its altitude offset (z)
        const xykeys: Record<string, any> = {};
        for (let i = 0, len = corners.length; i < len; i++) {
            const altitude = corners[i][2];
            const z = (layer as ThreeLayer).altitudeToVector3(altitude, altitude).x;

            const p = (layer as ThreeLayer).coordinateToVector3(
                new Maptalks.Coordinate(corners[i] as Maptalks.CoordinateArray)
            ).sub(centerPt);

            const xy = [p.x.toFixed(4), p.y.toFixed(4)].join('-').toString();
            xykeys[xy] = z;
        }

        // Generate the extruded 3D geometry of the polygon
        const geometry = (layer as ThreeLayer)
            .toExtrudePolygon(polygon, { height: (height as number) }, material)
            // @ts-ignore
            .getObject3d().geometry;

        const position = geometry.attributes.position.array;
        const xyzkeys: Record<string, any> = {};

        // Adjust the z-values of vertices based on their individual altitude offsets
        for (let i = 0, len = position.length; i < len; i += 3) {
            const x = position[i], y = position[i + 1], z = position[i + 2];
            const xyz = [x, y, z].join('-').toString();
            const xy = [x.toFixed(4), y.toFixed(4)].join('-').toString();

            let offset;
            if (xykeys[xyz] != null) {
                // If exact match, use corresponding offset
                offset = xykeys[xyz];
            } else {
                // Otherwise use rounded x/y or fallback to 0
                offset = xykeys[xy] || 0;
                xyzkeys[xyz] = offset;
            }

            // Apply the altitude offset to the z-value
            position[i + 2] += offset;
        }

        return {
            geometry,
            centerPt,
            polygon
        };
    }
}