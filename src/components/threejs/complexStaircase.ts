import * as THREE from "three";
import { BaseObject, ThreeLayer } from "maptalks.three";
import { Prism } from "./prism";
import { LEVEL_HEIGHT, STAIRCASE_HANDRAIL_HEIGHT } from "../../../public/strings/constants.json";
import coordinateHelpers from "../../utils/coordinateHelpers";

const defaultStaircaseWidth = 1;

export function complexStaircase(lineStrings: [GeoJSON.Position[], number][], allNodes: GeoJSON.Feature[], altitude: number, material: THREE.MeshBasicMaterial, layer: ThreeLayer, onclick: () => void): BaseObject[] {
    const thickness = 0.05;

    // stairs might consist of multiple parts, therefore we need to loop over all line strings
    return lineStrings.flatMap(val => {
        // width might also vary between different sections, we get it from osm properties of the pathway
        const [ls, width] = val;

        // offset the line string to the left and right to achieve width and handrails
        const offsetLine = coordinateHelpers.offsetCoordinateLine(ls, width / 2);
        const handrailOffsetLine = coordinateHelpers.offsetCoordinateLine(offsetLine, -thickness);
        const offsetLine1 = coordinateHelpers.offsetCoordinateLine(ls, -width / 2);
        const handrailOffsetLine1 = coordinateHelpers.offsetCoordinateLine(offsetLine1, thickness);

        // interpolate between levels if not all nodes have a level set
        const nodesLevels = ls.map(p => {
            const potentialNode = allNodes.find(p2 => (p2.geometry as GeoJSON.Point).coordinates.toString() == p.toString());
            if (potentialNode == undefined) { return undefined; }
            return potentialNode.properties["level"];
        });
        const allNodesHaveLevel = nodesLevels.every(p => p != undefined);
        let altitudes : number[];
        if (allNodesHaveLevel) {
            const min = Math.min(...nodesLevels.map(parseFloat));
            const max = Math.max(...nodesLevels.map(parseFloat));
            altitudes = ls.map(p => {
                const node = allNodes.find(p2 => (p2.geometry as GeoJSON.Point).coordinates.toString() == p.toString());
                return (parseFloat(node.properties["level"]) - min) / (max - min) * (LEVEL_HEIGHT - thickness);
            })
        } else {
            altitudes = ls.map((p, i) => {
                return (i / (ls.length - 1)) * (LEVEL_HEIGHT - thickness);
            })
        }

        // construct quads with thickness (basically a prism)
        const returnPrisms: Prism[] = [];
        // one prism for every two points, along the length of the offset line
        for (let i = 0; i < offsetLine.length - 1; i++) {
            const coords = [
                [...offsetLine[i], altitudes[i]],
                [...offsetLine[i+1], altitudes[i+1]],
                [...offsetLine1[i+1], altitudes[i+1]],
                [...offsetLine1[i], altitudes[i]],
                [...offsetLine[i], altitudes[i]],
            ];
            const prismFloor = new Prism(
                coords,
                { height: thickness, altitude: altitude },
                material,
                layer
            );
            prismFloor.on("click", () => onclick());
            returnPrisms.push(prismFloor);
            // two handrails on either side, they are very thin and relatively tall
            const coordsHandrail = [
                [...offsetLine[i], altitudes[i]],
                [...offsetLine[i+1], altitudes[i+1]],
                [...handrailOffsetLine[i+1], altitudes[i+1]],
                [...handrailOffsetLine[i], altitudes[i]],
                [...offsetLine[i], altitudes[i]],
            ];
            const prismHandrail = new Prism(
                coordsHandrail,
                { height: STAIRCASE_HANDRAIL_HEIGHT, altitude: altitude },
                material,
                layer
            );
            prismHandrail.on("click", () => onclick());
            returnPrisms.push(prismHandrail);
            const coordsHandrail1 = [
                [...offsetLine1[i], altitudes[i]],
                [...offsetLine1[i+1], altitudes[i+1]],
                [...handrailOffsetLine1[i+1], altitudes[i+1]],
                [...handrailOffsetLine1[i], altitudes[i]],
                [...offsetLine1[i], altitudes[i]],
            ]
            const prismHandrail1 = new Prism(
                coordsHandrail1,
                { height: STAIRCASE_HANDRAIL_HEIGHT, altitude: altitude },
                material,
                layer
            );
            prismHandrail1.on("click", () => onclick());
            returnPrisms.push(prismHandrail1);
        }
        return returnPrisms;
    });
}

// when given a staircase feature, we need to filter out the pathways that indicate the center of the stair, it might also be multiple ones
export function filterConnectedPathways(feature: GeoJSON.Feature, doors: GeoJSON.Position[], lowestPoints: GeoJSON.Feature[], pathways: GeoJSON.Feature[], level: string): [GeoJSON.Position[], number][] {
    const connectedPathways = new Set<GeoJSON.Feature>();
    // special nodes are those that are doors or lowest points of a stair
    const specialNodes = (feature.geometry as GeoJSON.Polygon).coordinates[0].filter(p => doors.some(d => d.toString() == p.toString()) || lowestPoints.some(lp => (lp.geometry as GeoJSON.Point).coordinates.toString() == p.toString()));

    // we check each of those special nodes, whether they have a pathway that connects to them
    specialNodes.forEach(p => {
        const regExSemicolon = /-?\d*(;-?\d)/;
        const regExRange = /(-?\d)-(-?\d)/;
        const arrayRange = (start: number, stop: number, step: number) => Array.from({ length: (stop - start) / step + 1 }, (v, index) => start + index * step);
        // filter the pathways that contain the current special node
        const paths = pathways.filter(
            path => pathwayToCoords(path).some(lsp => lsp.toString() == p.toString()) &&
            (
                path.properties.level.at(-1) != level || // when staircase goes from level 0-3, it does not start at level 3, so we filter it out
                ("repeat_on" in path.properties && path.properties.repeat_on === level) || // repeat on has multiple possible formats
                ("repeat_on" in path.properties && regExSemicolon.test(path.properties.repeat_on) && path.properties.repeat_on.split(";").includes(level)) ||
                ("repeat_on" in path.properties && regExRange.test(path.properties.repeat_on) && arrayRange(parseInt(path.properties.repeat_on.match(regExRange)[1]), parseInt(path.properties.repeat_on.match(regExRange)[2]), 1).map((num) => num.toString()).includes(level))
            )
        );

        paths.forEach(path => {
            // we might find the pathway to be reversed, so highest index at the top, we need to create a new feature which is reversed again
            const lowestIndex = pathwayToCoords(path).findIndex(p => lowestPoints.some(lp => (lp.geometry as GeoJSON.Point).coordinates.toString() == p.toString()));

            if (lowestIndex > pathwayToCoords(path).length / 2) {
                const reversedPath: GeoJSON.Feature = {
                    type: "Feature",
                    geometry: {
                        type: "LineString",
                        coordinates: pathwayToCoords(path).reverse()
                    },
                    properties: path.properties,
                    id: path.id,
                    bbox: path.bbox
                }
                connectedPathways.add(reversedPath);
            } else {
                connectedPathways.add(path);
            }

            // we need to check if the path may be connected to other paths
            // (for example a path that leads into a staircase might be recognized first and this finds the actual path that goes up the stairs)
            const otherNodes = pathwayToCoords(path).filter(lsp => !(lsp[0] == p[0] && lsp[1] == p[1])); // all points in path that are not original special node

            const paths2ndDegree = otherNodes.flatMap(otherNode => pathways.filter(path => pathwayToCoords(path).some(lsp => lsp[0] == otherNode[0] && lsp[1] == otherNode[1])));
            paths2ndDegree.forEach(path2 => {
                connectedPathways.add(path2);
            })
        });
    })

    // return the list of positions and a width
    return Array.from(connectedPathways).map(feat => [pathwayToCoords(feat), "width" in feat.properties ? parseFloat(feat.properties.width) : defaultStaircaseWidth]);
}

function pathwayToCoords(feature: GeoJSON.Feature): GeoJSON.Position[] {
    // pathways might be lineString or polygon geometry, we need a list of positions instead
    if (feature.geometry.type == "LineString") {
        return feature.geometry.coordinates;
    }
    if (feature.geometry.type == "Polygon") {
        return feature.geometry.coordinates[0];
    }
}