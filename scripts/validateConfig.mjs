import Ajv from "ajv";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const configDir = join(process.cwd(), "public", "strings");
const ajv = new Ajv({ allErrors: true });

const numericString = {
  type: "string",
  pattern: "^-?\\d+(\\.\\d+)?$",
};

const settingsSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "INDOOR_LEVEL",
    "FILL_OPACITY",
    "STAIRCASE_OPACITY",
    "STAIRCASE_OUTLINE_OPACITY",
    "OPACITY_TRANSLUCENT_LAYER",
    "WALL_WEIGHT",
    "WALL_WEIGHT_PAVING",
    "LEVEL_HEIGHT",
    "STAIRCASE_HANDRAIL_HEIGHT",
    "DOOR_MATCH_TOLERANCE_M",
    "BACKEND_SOURCE",
    "CURRENT_BUILDING",
    "MAP_START_LAT",
    "MAP_START_LNG",
    "MAP_UI_GAP_PX",
    "MAP_MIN_BOUNDS_MARGIN_FACTOR",
    "MAP_MAX_LATITUDE_BOUND",
    "VISIBLE_LEVEL_CONTROLS",
    "START_LEVEL_CONTROL_POSITION",
  ],
  properties: {
    INDOOR_LEVEL: { type: "integer" },
    FILL_OPACITY: { type: "number", minimum: 0, maximum: 1 },
    STAIRCASE_OPACITY: { type: "number", minimum: 0, maximum: 1 },
    STAIRCASE_OUTLINE_OPACITY: { type: "number", minimum: 0, maximum: 1 },
    OPACITY_TRANSLUCENT_LAYER: { type: "number", minimum: 0, maximum: 1 },
    WALL_WEIGHT: { type: "number", exclusiveMinimum: 0 },
    WALL_WEIGHT_PAVING: { type: "number", exclusiveMinimum: 0 },
    LEVEL_HEIGHT: { type: "number", exclusiveMinimum: 0 },
    STAIRCASE_HANDRAIL_HEIGHT: { type: "number", minimum: 0 },
    DOOR_MATCH_TOLERANCE_M: { type: "number", exclusiveMinimum: 0 },
    BACKEND_SOURCE: { enum: ["cachedOverpass", "localGeojson"] },
    CURRENT_BUILDING: { type: "string", minLength: 1 },
    MAP_START_LAT: numericString,
    MAP_START_LNG: numericString,
    MAP_UI_GAP_PX: { type: "integer", minimum: 0 },
    MAP_MIN_BOUNDS_MARGIN_FACTOR: { type: "number", minimum: -1, maximum: 1 },
    MAP_MAX_LATITUDE_BOUND: { type: "number", exclusiveMinimum: 0, maximum: 85.051129 },
    VISIBLE_LEVEL_CONTROLS: { type: "integer", minimum: 1 },
    START_LEVEL_CONTROL_POSITION: { type: "integer", minimum: 0 },
  },
};

const coordinatePair = {
  type: "array",
  minItems: 2,
  maxItems: 2,
  items: { type: "number" },
};

const buildingDefinitionSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "SEARCH_STRING",
    "BEARING_OFFSET",
    "BEARING_CALC_NODE1",
    "BEARING_CALC_NODE2",
    "STANDARD_ZOOM",
    "MAX_ZOOM",
    "MIN_ZOOM",
    "STANDARD_BEARING_3D_MODE",
    "STANDARD_PITCH_3D_MODE",
    "STANDARD_ZOOM_3D_MODE",
  ],
  properties: {
    SEARCH_STRING: { type: "string", minLength: 1 },
    BEARING_OFFSET: { type: "number", minimum: -360, maximum: 360 },
    BEARING_CALC_NODE1: { type: "string", pattern: "^\\d+$" },
    BEARING_CALC_NODE2: { type: "string", pattern: "^\\d+$" },
    STANDARD_ZOOM: { type: "number", exclusiveMinimum: 0 },
    MAX_ZOOM: { type: "number", exclusiveMinimum: 0 },
    MIN_ZOOM: { type: "number", exclusiveMinimum: 0 },
    STANDARD_BEARING_3D_MODE: { type: "number", minimum: -360, maximum: 360 },
    STANDARD_PITCH_3D_MODE: { type: "number", minimum: 0, maximum: 85 },
    STANDARD_ZOOM_3D_MODE: { type: "number", exclusiveMinimum: 0 },
    STANDARD_CENTER: coordinatePair,
    STANDARD_CENTER_WHEELCHAIR_MODE: coordinatePair,
  },
};

const buildingConstantsSchema = {
  type: "object",
  additionalProperties: buildingDefinitionSchema,
  minProperties: 1,
};

const settings = readJson("settings.json");
const buildingConstants = readJson("buildingConstants.json");

const failures = [
  ...validateSchema("settings.json", settingsSchema, settings),
  ...validateSchema("buildingConstants.json", buildingConstantsSchema, buildingConstants),
  ...validateConfigRelations(settings, buildingConstants),
];

if (failures.length > 0) {
  console.error("Configuration validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Configuration validation passed.");

function readJson(fileName) {
  return JSON.parse(readFileSync(join(configDir, fileName), "utf8"));
}

function validateSchema(fileName, schema, data) {
  const validate = ajv.compile(schema);
  if (validate(data)) {
    return [];
  }

  return (validate.errors ?? []).map((error) => {
    const path = error.instancePath || "/";
    return `${fileName}${path}: ${error.message}`;
  });
}

function validateConfigRelations(settingsData, buildingConstantsData) {
  const errors = [];
  const buildingIds = Object.keys(buildingConstantsData);

  if (!buildingIds.includes(settingsData.CURRENT_BUILDING)) {
    errors.push(
      `settings.json/CURRENT_BUILDING must reference one of: ${buildingIds.join(", ")}`
    );
  }

  const startLat = Number(settingsData.MAP_START_LAT);
  const startLng = Number(settingsData.MAP_START_LNG);
  if (!isLatitude(startLat)) {
    errors.push("settings.json/MAP_START_LAT must be between -90 and 90.");
  }
  if (!isLongitude(startLng)) {
    errors.push("settings.json/MAP_START_LNG must be between -180 and 180.");
  }

  for (const [buildingId, building] of Object.entries(buildingConstantsData)) {
    if (building.MIN_ZOOM > building.STANDARD_ZOOM || building.STANDARD_ZOOM > building.MAX_ZOOM) {
      errors.push(`${buildingId}: expected MIN_ZOOM <= STANDARD_ZOOM <= MAX_ZOOM.`);
    }

    validateOptionalCoordinatePair(errors, `${buildingId}/STANDARD_CENTER`, building.STANDARD_CENTER);
    validateOptionalCoordinatePair(
      errors,
      `${buildingId}/STANDARD_CENTER_WHEELCHAIR_MODE`,
      building.STANDARD_CENTER_WHEELCHAIR_MODE
    );
  }

  return errors;
}

function validateOptionalCoordinatePair(errors, path, coordinates) {
  if (coordinates === undefined) {
    return;
  }

  const [lng, lat] = coordinates;
  if (!isLongitude(lng) || !isLatitude(lat)) {
    errors.push(`${path} must be [longitude, latitude].`);
  }
}

function isLongitude(value) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function isLatitude(value) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}
