import { Vector2 } from "three";

/**
 * Given Latitude and Longitude of two points, calculate the shortest distance between them (along the great circle) in kilometers
 *
 * @param {number} lat1 Latitude of first position
 * @param {number} lon1 Longitude of first position
 * @param {number} lat2 Latitude of second position
 * @param {number} lon2 Longitude of second position
 * @returns {number} Distance in kilometers
 */
// https://stackoverflow.com/a/27943/8990620
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2-lat1);  // deg2rad below
    const dLon = deg2rad(lon2-lon1); 
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2)
        ; 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Distance in km
    return d;
}


/**
 * Give two positions in GeoJSON format, calculate the shortest distance between them in meters.
 *
 * @param {GeoJSON.Position} pos1 Position 1
 * @param {GeoJSON.Position} pos2 Position 2
 * @returns {number} Distance in meters
 */
function getDistanceBetweenCoordinatesInM(pos1: GeoJSON.Position, pos2: GeoJSON.Position): number {
    return getDistanceFromLatLonInKm(pos1[1], pos1[0], pos2[1], pos2[0]) * 1000;
}

function deg2rad(deg: number): number {
    return deg * (Math.PI/180)
}

// https://wiki.openstreetmap.org/wiki/Mercator
function lat2y(lat: number): number {
    return Math.log(Math.tan((lat / 90 + 1) * (Math.PI / 4) )) * (180 / Math.PI);
}

function y2lat(y: number): number {
    return (Math.atan(Math.exp(y / (180 / Math.PI))) / (Math.PI / 4) - 1) * 90;
}


/**
 * Return the angle, in degrees, between two positions
 *
 * @param {GeoJSON.Position} vec1 Position 1
 * @param {GeoJSON.Position} vec2 Position 2
 * @returns {number} Angle in degrees between the positions
 */
function getAngles(vec1: GeoJSON.Position, vec2: GeoJSON.Position) {

    const dot = vec1[0] * vec2[0] + vec1[1] * vec2[1];
    const det = vec1[0] * vec2[1] - vec1[1] * vec2[0];
    const angleInRad = Math.atan2(det, dot);
    return angleInRad * (180 / Math.PI); // Convert radians to degrees
}

/**
 * Simplify a polygon by removing points based on the angle between successive vectors.
 * 
 * @param {Array} polygon - Array of coordinates [x, y]
 * @param {number} degTol - Degree tolerance for comparison between successive vectors
 * @return {Array} Simplified polygon coordinates
 */
function simplifyByAngle(polygon: GeoJSON.Position[], degTol = 1): GeoJSON.Position[] {
    // Extract exterior coordinates
    const extPolyCoords = polygon.map(p => [p[0], lat2y(p[1])]);

    // Calculate vector representations
    const vectorRep = [];
    for (let i = 0; i < extPolyCoords.length - 1; i++) {
        vectorRep.push([
            extPolyCoords[i + 1][0] - extPolyCoords[i][0],
            extPolyCoords[i + 1][1] - extPolyCoords[i][1]
        ]);
    }

    // Calculate angles between successive vectors
    const anglesList = [];
    for (let i = 0; i < vectorRep.length - 1; i++) {
        anglesList.push(Math.abs(getAngles(vectorRep[i], vectorRep[i + 1])));
    }

    // Get mask satisfying tolerance
    const threshValsByDeg = [];
    for (let i = 0; i < anglesList.length; i++) {
        if (anglesList[i] > degTol) {
            threshValsByDeg.push(i);
        }
    }

    // Sandwich between first and last points
    const newIdx = [0, ...threshValsByDeg.map(index => index + 1), 0];
    const newVertices = newIdx.map(idx => extPolyCoords[idx]);

    return newVertices.map(p => [p[0], y2lat(p[1])]);
}

/**
 * Calculates an offset version of a line represented by 2D vectors.
 *
 * The offset is computed at each point perpendicular to the direction of the line,
 * smoothing the offset at each point using vector averaging and projection.
 *
 * @param points - Array of Vector2 points representing the original line.
 * @param width - Offset distance (positive or negative) in the same unit as the vectors.
 * @returns Array of Vector2 points representing the offset line.
 */
function offsetLine(points: Vector2[], width: number): Vector2[] {
    const vectors: Vector2[] = [];

    // Compute normalized direction vectors between each consecutive point
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1].clone();
        const element = points[i].clone();
        vectors.push(element.sub(prev).normalize());
    }

    // Extend vectors to align with the start and end points
    const fullVectors = [vectors[0].clone(), ...vectors, vectors.at(-1).clone()];

    // Determine the side of offset (left/right based on width sign)
    const rotateDirection = width / Math.abs(width);

    const returnPoints: Vector2[] = [];

    for (let i = 0; i < points.length; i++) {
        const point = points[i];

        // Rotate vector by 90 degrees and scale by width for offset
        const prevVector = new Vector2(
            fullVectors[i].y * rotateDirection,
            -fullVectors[i].x * rotateDirection
        ).multiplyScalar(Math.abs(width));

        const afterVector = new Vector2(
            fullVectors[i + 1].y * rotateDirection,
            -fullVectors[i + 1].x * rotateDirection
        ).multiplyScalar(Math.abs(width));

        // Combine previous and next offset vectors
        const moveVector = prevVector.clone().add(afterVector);

        // Project to reduce sharp angles in corners
        const projVector = prevVector.clone().multiplyScalar(
            prevVector.dot(moveVector) / prevVector.dot(prevVector)
        );

        // Normalize and scale offset for smooth transition, then apply to point
        returnPoints.push(
            moveVector
                .clone()
                .normalize()
                .multiplyScalar((moveVector.length() / projVector.length()) * Math.abs(width))
                .add(point)
        );
    }

    return returnPoints;
}

/**
 * Converts a GeoJSON LineString to an offset version by a given width in meters.
 *
 * Converts geographic coordinates into a flat vector space for geometric processing,
 * applies offset using `offsetLine`, and converts the result back to latitude/longitude.
 *
 * @param line - GeoJSON LineString coordinates ([longitude, latitude][]).
 * @param width - Offset distance in meters (positive: right side, negative: left side).
 * @returns Offset GeoJSON LineString coordinates.
 */
function offsetCoordinateLine(line: GeoJSON.Position[], width: number): GeoJSON.Position[] {
    const p0 = line[0];

    // Create mock offset points for scale approximation
    const xOffset1 = [p0[0] + 1, p0[1]];
    const yOffset1 = [p0[0], y2lat(lat2y(p0[1]) + 1)];

    // Compute meters per unit in x and y directions
    const xStretch = getDistanceBetweenCoordinatesInM(p0, xOffset1);
    const yStretch = getDistanceBetweenCoordinatesInM(p0, yOffset1);

    // Convert coordinates into scaled Vector2 for flat processing
    // Make sure that coordinate system is symmetrical (units are scaled the same)
    const points = line.map(p => new Vector2(
        p[0] * xStretch,
        lat2y(p[1]) * yStretch
    ));

    // Compute offset in flat space
    const returnPoints = offsetLine(points, width);

    // Convert results back to longitude/latitude
    return returnPoints.map(v => [
        v.x / xStretch,
        y2lat(v.y / yStretch)
    ]);
}

export default {
    getDistanceBetweenCoordinatesInM,
    lat2y,
    y2lat,
    simplifyByAngle,
    offsetCoordinateLine
}