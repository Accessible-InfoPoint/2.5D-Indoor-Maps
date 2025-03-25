import { Vector2 } from "three";

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

function getAngles(vec1: GeoJSON.Position, vec2: GeoJSON.Position) {
    /**
     * Return the angle, in degrees, between two vectors
     */

    const dot = vec1[0] * vec2[0] + vec1[1] * vec2[1];
    const det = vec1[0] * vec2[1] - vec1[1] * vec2[0];
    const angleInRad = Math.atan2(det, dot);
    return angleInRad * (180 / Math.PI); // Convert radians to degrees
}

function simplifyByAngle(polygon: GeoJSON.Position[], degTol = 1): GeoJSON.Position[] {
    /**
     * Simplify a polygon by removing points based on the angle between successive vectors.
     * 
     * @param {Array} polygon - Array of coordinates [x, y]
     * @param {number} degTol - Degree tolerance for comparison between successive vectors
     * @return {Array} Simplified polygon coordinates
     */

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

function offsetLine(points: Vector2[], width: number): Vector2[] {
    const vectors: Vector2[] = [];
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1].clone();
        const element = points[i].clone();
        vectors.push(element.sub(prev).normalize());
    }
    // console.log(vectors);
    const fullVectors = [vectors[0].clone(), ...vectors, vectors.at(-1).clone()];

    const rotateDirection = width / Math.abs(width);

    const returnPoints: Vector2[] = [];
    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const prevVector = new Vector2(fullVectors[i].y * rotateDirection, -fullVectors[i].x * rotateDirection).multiplyScalar(Math.abs(width));
        const afterVector = new Vector2(fullVectors[i + 1].y * rotateDirection, -fullVectors[i + 1].x * rotateDirection).multiplyScalar(Math.abs(width));
        // console.log(point, prevVector, afterVector);

        const moveVector = prevVector.clone().add(afterVector);
        // console.log(moveVector);
        const projVector = prevVector.clone().multiplyScalar(prevVector.dot(moveVector) / prevVector.dot(prevVector));
        // console.log(projVector);
        returnPoints.push(moveVector.clone().normalize().multiplyScalar(moveVector.length() / projVector.length() * Math.abs(width)).add(point));
    }

    return returnPoints;
}

function offsetCoordinateLine(line: GeoJSON.Position[], width: number): GeoJSON.Position[] {
    const p0 = line[0];
    const xOffset1 = [p0[0]+1, p0[1]]
    const yOffset1 = [p0[0], y2lat(lat2y(p0[1])+1)]
    const xStretch = getDistanceBetweenCoordinatesInM(p0, xOffset1);
    const yStretch = getDistanceBetweenCoordinatesInM(p0, yOffset1);

    const points = line.map(p => new Vector2(p[0] * xStretch, lat2y(p[1]) * yStretch));
    // console.log(points);

    const returnPoints = offsetLine(points, width);

    // console.log(returnPoints.map(v => [v.x / xStretch, y2lat(v.y / yStretch)]));

    return returnPoints.map(v => [v.x / xStretch, y2lat(v.y / yStretch)]);
}

export default {
    getDistanceBetweenCoordinatesInM,
    lat2y,
    y2lat,
    simplifyByAngle,
    offsetLine,
    offsetCoordinateLine
}