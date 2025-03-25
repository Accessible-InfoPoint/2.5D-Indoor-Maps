import * as Maptalks from "maptalks";
import { BuildingInterface } from "../models/buildingInterface";
import buildingService from "./buildingService";
import httpService from "./httpService";
import * as BuildingConstantsDefinition from "../../public/strings/buildingConstants.json";
import coordinateHelpers from "../utils/coordinateHelpers";

let buildingConstants: Record<string, number>;
let buildingDescription = "";
let geoJson: GeoJSON.FeatureCollection;

let buildingInterface: BuildingInterface;

async function fetchBackendData(): Promise<void> {
	await httpService.fetchOverpassData();

	const currentBuilding = "APB";

	buildingInterface = await buildingService.handleSearch(BuildingConstantsDefinition[currentBuilding].SEARCH_STRING);	

	// filter indoor elements by bounds of building
	if (buildingInterface !== undefined) {
		geoJson = buildingService.filterByBounds(
			httpService.getIndoorData(),
			buildingInterface.boundingBox
		);
	}
	
	// build building description
	if (buildingInterface.feature.properties.name !== undefined) {
		// description += lang.selectedBuildingPrefix + currentBuildingFeature.properties.name;
		buildingDescription += buildingInterface.feature.properties.name;
	
		if (buildingInterface.feature.properties.loc_ref !== undefined) {
			buildingDescription += " (" + buildingInterface.feature.properties.loc_ref + ")";
		}
	}

	// calculate bearing, take two points and orient the map so that both points have a vertical line and point 1 is below (!!!) point 2
	// Then add BEARING_OFFSET (usually 90deg) rotated counterclockwise, so that the line between the points is horizontal again.
	const p1 = (
		geoJson.features.find((feature) => feature.id == "node/" + BuildingConstantsDefinition[currentBuilding].BEARING_CALC_NODE1)
		.geometry as GeoJSON.Point
	).coordinates;
	const p2 = (
		geoJson.features.find((feature) => feature.id == "node/" + BuildingConstantsDefinition[currentBuilding].BEARING_CALC_NODE2)
		.geometry as GeoJSON.Point
	).coordinates;

	const standardBearing =((
		// angle of the line between the two points
		Math.atan2(
			p2[0] - p1[0],
			// we need to use mercator projection for the latitude
			coordinateHelpers.lat2y(p2[1]) - coordinateHelpers.lat2y(p1[1])
		) * (180 / Math.PI) + BuildingConstantsDefinition[currentBuilding].BEARING_OFFSET
	// angle is between 0 and 360 after calculation (might even be above 360), maptalks needs it between -180 and 180
	+ 180) % 360) - 180;

	buildingConstants = {
		"standardZoom": BuildingConstantsDefinition[currentBuilding].STANDARD_ZOOM,
		"maxZoom": BuildingConstantsDefinition[currentBuilding].MAX_ZOOM,
		"minZoom": BuildingConstantsDefinition[currentBuilding].MIN_ZOOM,
		"standardBearing": standardBearing,
		"standardBearing3DMode": BuildingConstantsDefinition[currentBuilding].STANDARD_BEARING_3D_MODE,
		"standardPitch3DMode": BuildingConstantsDefinition[currentBuilding].STANDARD_PITCH_3D_MODE,
		"standardZoom3DMode": BuildingConstantsDefinition[currentBuilding].STANDARD_ZOOM_3D_MODE
	}
}

function getOutline(): number[][] {
	return (buildingInterface.feature.geometry as GeoJSON.Polygon).coordinates[0];
}

function getBuildingConstants(): Record<string, number> {
	return buildingConstants;
}

function getBuildingDescription(): string {
	return buildingDescription;
}

// Geo JSON functions
function getGeoJson(): GeoJSON.FeatureCollection {
	return geoJson;
}

function getBoundingBoxExtent(): Maptalks.Extent {
	return new Maptalks.Extent(
        buildingInterface.boundingBox[0],
        buildingInterface.boundingBox[1],
        buildingInterface.boundingBox[2],
        buildingInterface.boundingBox[3]
	);
}

export default {
	getOutline,
	getBuildingConstants,
	getBuildingDescription,
	getGeoJson,
	getBoundingBoxExtent,
	fetchBackendData
};