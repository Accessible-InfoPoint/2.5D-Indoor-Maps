const baseUrl = "http://localhost:8008";

let levels = "";
let outline = "";
let center = "";
let buildingConstants = "";
let buildingDescription = "";
let geoJson = "";
let boundingBox = "";

async function fetchBackendData(): Promise<void> {
	await loadLevels();
	await loadOutline();
	await loadCenter();
	await loadBuildingConstants();
	await loadBuildingDescription();
	await loadGeoJson();
	await loadBoundingBox();
}

async function loadLevels(): Promise<void> {
	try {
		levels = await api<string>(`${baseUrl}/levels`);
	} catch (error) {
		console.error('Error fetching levels:', error);
	}
}

/*
	Returns list of levels as strings in descending order.
*/
function getLevels(): string[] {
	if (levels !== "") {
		return JSON.parse(levels);
	}
	return [];
}

// Outline functions
async function loadOutline(): Promise<void> {
	try {
		outline = await api<string>(`${baseUrl}/outline`);
	} catch (error) {
		console.error('Error fetching outline:', error);
	}
}

function getOutline(): number[][] {
	if (outline !== "") {
		return JSON.parse(outline);
	}
	return [];
}

// Center functions
async function loadCenter(): Promise<void> {
	try {
		center = await api<string>(`${baseUrl}/center`);
	} catch (error) {
		console.error('Error fetching center:', error);
	}
}

function getCenter(): string[] {
	if (center !== "") {
		return JSON.parse(center);
	}
	return [];
}

// Building constants functions
async function loadBuildingConstants(): Promise<void> {
	try {
		buildingConstants = await api<string>(`${baseUrl}/buildingConstants`);
	} catch (error) {
		console.error('Error fetching building constants:', error);
	}
}

function getBuildingConstants(): Record<string, number> {
	if (buildingConstants !== "") {
		return JSON.parse(buildingConstants);
	}
	return {};
}

// Building description functions
async function loadBuildingDescription(): Promise<void> {
	try {
		buildingDescription = await api<string>(`${baseUrl}/buildingDescription`);
	} catch (error) {
		console.error('Error fetching building description:', error);
	}
}

function getBuildingDescription(): string {
	if (buildingDescription !== "") {
		return buildingDescription;
	}
	return "";
}

// Geo JSON functions
async function loadGeoJson(): Promise<void> {
	try {
		geoJson = await api<string>(`${baseUrl}/geoJson`);
	} catch (error) {
		console.error('Error fetching geo json:', error);
	}
}

function getGeoJson(): GeoJSON.FeatureCollection {
	if (geoJson !== "") {
		return JSON.parse(geoJson);
	}
	return;
}

// Geo JSON functions
async function loadBoundingBox(): Promise<void> {
	try {
		boundingBox = await api<string>(`${baseUrl}/boundingBox`);
	} catch (error) {
		console.error('Error fetching bounding box:', error);
	}
}

function getBoundingBox(): number[][] {
	if (boundingBox !== "") {
		return JSON.parse(boundingBox);
	}
	return;
}

function api<T>(url: string): Promise<T> {
	return fetch(url)
		.then(res => res.json());
}

export default {
	getLevels,
	getOutline,
	getCenter,
	getBuildingConstants,
	getBuildingDescription,
	getGeoJson,
	getBoundingBox,
	fetchBackendData
};