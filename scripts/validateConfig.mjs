import Ajv from "ajv";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const configDir = join(process.cwd(), "public", "strings");
const imageDir = join(process.cwd(), "public", "images");
const colorProfileDir = join(configDir, "colorProfiles");
const ajv = new Ajv({ allErrors: true });

const numericString = {
  type: "string",
  pattern: "^-?\\d+(\\.\\d+)?$",
};

const hexColor = {
  type: "string",
  pattern: "^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
};

const nonEmptyString = { type: "string", minLength: 1 };

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

const buildingSourcesSchema = {
  type: "object",
  additionalProperties: false,
  required: ["sources", "buildings"],
  properties: {
    sources: {
      type: "object",
      minProperties: 1,
      additionalProperties: {
        type: "object",
        additionalProperties: false,
        required: ["label", "region"],
        properties: {
          label: nonEmptyString,
          region: {
            oneOf: [
              {
                type: "object",
                additionalProperties: false,
                required: ["type", "name"],
                properties: {
                  type: { const: "area" },
                  name: nonEmptyString,
                },
              },
              {
                type: "object",
                additionalProperties: false,
                required: ["type", "bbox"],
                properties: {
                  type: { const: "bbox" },
                  bbox: {
                    type: "array",
                    minItems: 4,
                    maxItems: 4,
                    items: { type: "number" },
                  },
                },
              },
            ],
          },
        },
      },
    },
    buildings: {
      type: "object",
      minProperties: 1,
      additionalProperties: {
        type: "object",
        additionalProperties: false,
        required: ["source", "buildingTags"],
        properties: {
          source: nonEmptyString,
          buildingTags: {
            type: "object",
            minProperties: 1,
            additionalProperties: nonEmptyString,
          },
        },
      },
    },
  },
};

const constantsSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "OSM_TILE_SERVER",
    "OSM_TILE_SUBDOMAINS",
    "CARTO_TILE_SERVER",
    "CARTO_TILE_SUBDOMAINS",
    "LOCAL_GEOJSON_DATA_URL",
    "MARKERS_IMG_DIR",
    "OSM_ATTRIBUTION",
    "CARTO_ATTRIBUTION",
    "MAPLIBRE_ATTRIBUTION",
    "COLORS",
    "ICONS",
  ],
  properties: {
    OSM_TILE_SERVER: tileServerSchema(),
    OSM_TILE_SUBDOMAINS: subdomainSchema(),
    CARTO_TILE_SERVER: tileServerSchema(),
    CARTO_TILE_SUBDOMAINS: subdomainSchema(),
    LOCAL_GEOJSON_DATA_URL: directoryPathSchema(),
    MARKERS_IMG_DIR: directoryPathSchema(),
    OSM_ATTRIBUTION: nonEmptyString,
    CARTO_ATTRIBUTION: nonEmptyString,
    MAPLIBRE_ATTRIBUTION: nonEmptyString,
    COLORS: {
      type: "object",
      additionalProperties: false,
      required: ["WALL", "WALL_SELECTED", "TOILET", "STAIR", "ROOM", "ROOM_SELECTED"],
      properties: {
        WALL: hexColor,
        WALL_SELECTED: hexColor,
        TOILET: hexColor,
        STAIR: hexColor,
        ROOM: hexColor,
        ROOM_SELECTED: hexColor,
      },
    },
    ICONS: {
      type: "object",
      additionalProperties: false,
      required: [
        "INFO",
        "TOILETS_WHEELCHAIR",
        "ELEVATOR",
        "WHEELCHAIR",
        "TOILETS",
        "ENTRANCE",
        "EMERGENCY_EXIT",
        "STAIRS",
        "CAFE",
        "SHOP",
        "ADDITIONAL",
      ],
      properties: {
        INFO: iconFileSchema(),
        TOILETS_WHEELCHAIR: iconFileSchema(),
        ELEVATOR: iconFileSchema(),
        WHEELCHAIR: iconFileSchema(),
        TOILETS: iconFileSchema(),
        ENTRANCE: iconFileSchema(),
        EMERGENCY_EXIT: iconFileSchema(),
        STAIRS: iconFileSchema(),
        CAFE: iconFileSchema(),
        SHOP: iconFileSchema(),
        ADDITIONAL: iconFileSchema(),
      },
    },
  },
};

const colorProfileIndexSchema = {
  type: "object",
  additionalProperties: false,
  required: ["COLOR_PROFS"],
  properties: {
    COLOR_PROFS: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: { type: "string", pattern: "^[a-z0-9_]+$" },
    },
  },
};

const colorProfileSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "baseColor",
    "roomColor",
    "roomColorS",
    "wallColor",
    "toiletColor",
    "stairsColor",
    "entranceColor",
    "inServiceColor",
    "elevatorColor",
    "zoom",
  ],
  properties: {
    baseColor: hexColor,
    roomColor: hexColor,
    roomColorS: hexColor,
    wallColor: hexColor,
    toiletColor: hexColor,
    stairsColor: hexColor,
    entranceColor: hexColor,
    inServiceColor: hexColor,
    elevatorColor: hexColor,
    zoom: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["doors_primary", "doors_secondary", "toilets", "staircases", "elevators"],
        properties: {
          doors_primary: { type: "boolean" },
          doors_secondary: { type: "boolean" },
          toilets: { type: "boolean" },
          staircases: { type: "boolean" },
          elevators: { type: "boolean" },
        },
      },
    },
  },
};

const languageSchema = {
  type: "object",
  additionalProperties: { type: "string", minLength: 1 },
  minProperties: 1,
};

const settings = readJson("settings.json");
const buildingConstants = readJson("buildingConstants.json");
const buildingSources = readJson("buildingSources.json");
const constants = readJson("constants.json");
const colorProfileIndex = readJson("colorProfiles.json");
const languages = {
  "lang.en.json": readJson("lang.en.json"),
  "lang.de.json": readJson("lang.de.json"),
};
const colorProfiles = Object.fromEntries(
  getColorProfileFileNames().map((fileName) => [
    fileName,
    readJson(join("colorProfiles", fileName)),
  ]),
);

const failures = [
  ...validateSchema("settings.json", settingsSchema, settings),
  ...validateSchema("buildingConstants.json", buildingConstantsSchema, buildingConstants),
  ...validateSchema("buildingSources.json", buildingSourcesSchema, buildingSources),
  ...validateSchema("constants.json", constantsSchema, constants),
  ...validateSchema("colorProfiles.json", colorProfileIndexSchema, colorProfileIndex),
  ...Object.entries(colorProfiles).flatMap(([fileName, colorProfile]) =>
    validateSchema(`colorProfiles/${fileName}`, colorProfileSchema, colorProfile),
  ),
  ...Object.entries(languages).flatMap(([fileName, language]) =>
    validateSchema(fileName, languageSchema, language),
  ),
  ...validateConfigRelations(settings, buildingConstants),
  ...validateBuildingSourceRelations(buildingSources, buildingConstants),
  ...validateConstantsRelations(constants),
  ...validateColorProfileRelations(colorProfileIndex, languages),
  ...validateLanguageRelations(languages),
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

function getColorProfileFileNames() {
  return readdirSync(colorProfileDir)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();
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
    errors.push(`settings.json/CURRENT_BUILDING must reference one of: ${buildingIds.join(", ")}`);
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

    validateOptionalCoordinatePair(
      errors,
      `${buildingId}/STANDARD_CENTER`,
      building.STANDARD_CENTER,
    );
    validateOptionalCoordinatePair(
      errors,
      `${buildingId}/STANDARD_CENTER_WHEELCHAIR_MODE`,
      building.STANDARD_CENTER_WHEELCHAIR_MODE,
    );
  }

  return errors;
}

function validateConstantsRelations(constantsData) {
  const errors = [];

  for (const [iconName, iconFile] of Object.entries(constantsData.ICONS)) {
    if (!existsSync(join(imageDir, iconFile))) {
      errors.push(`constants.json/ICONS/${iconName} references missing image ${iconFile}.`);
    }
  }

  return errors;
}

function validateBuildingSourceRelations(buildingSourcesData, buildingConstantsData) {
  const errors = [];
  const sourceIds = Object.keys(buildingSourcesData.sources);
  const sourceIdSet = new Set(sourceIds);
  const buildingSourceIds = Object.keys(buildingSourcesData.buildings);
  const buildingConstantIds = Object.keys(buildingConstantsData);
  const buildingConstantIdSet = new Set(buildingConstantIds);

  for (const [sourceId, source] of Object.entries(buildingSourcesData.sources)) {
    if (!/^[a-z0-9_]+$/.test(sourceId)) {
      errors.push(
        `buildingSources.json/sources/${sourceId} must use lowercase and underscore id characters.`,
      );
    }

    if (source.region.type === "bbox") {
      validateBoundingBox(
        errors,
        `buildingSources.json/sources/${sourceId}/region/bbox`,
        source.region.bbox,
      );
    }
  }

  for (const [buildingId, buildingSource] of Object.entries(buildingSourcesData.buildings)) {
    if (!/^[a-z0-9_]+$/.test(buildingId)) {
      errors.push(
        `buildingSources.json/buildings/${buildingId} must use lowercase and underscore id characters.`,
      );
    }

    if (!sourceIdSet.has(buildingSource.source)) {
      errors.push(
        `buildingSources.json/buildings/${buildingId}/source references unknown source ${buildingSource.source}.`,
      );
    }

    if (!buildingConstantIdSet.has(buildingId)) {
      errors.push(
        `buildingSources.json/buildings/${buildingId} must have matching buildingConstants.json entry.`,
      );
    }
  }

  for (const buildingId of buildingConstantIds) {
    if (!(buildingId in buildingSourcesData.buildings)) {
      errors.push(
        `buildingConstants.json/${buildingId} must have matching buildingSources.json/buildings entry.`,
      );
    }
  }

  return errors;
}

function validateColorProfileRelations(colorProfileIndexData, languagesData) {
  const errors = [];
  const profileIds = colorProfileIndexData.COLOR_PROFS;
  const colorProfileFileNames = getColorProfileFileNames();
  const referencedFileNames = profileIds
    .filter((profileId) => profileId !== "none")
    .map((profileId) => `${profileId}.json`);

  if (!profileIds.includes("none")) {
    errors.push("colorProfiles.json/COLOR_PROFS must include none.");
  }

  if (!colorProfileFileNames.includes("default.json")) {
    errors.push("colorProfiles/default.json must exist as the fallback for the none profile.");
  }

  for (const fileName of referencedFileNames) {
    if (!colorProfileFileNames.includes(fileName)) {
      errors.push(`colorProfiles.json/COLOR_PROFS references missing colorProfiles/${fileName}.`);
    }
  }

  for (const fileName of colorProfileFileNames) {
    if (fileName === "default.json") {
      continue;
    }

    if (!referencedFileNames.includes(fileName)) {
      errors.push(`colorProfiles/${fileName} is not listed in colorProfiles.json/COLOR_PROFS.`);
    }
  }

  for (const profileId of profileIds) {
    const languageKey = `colorProfile_${profileId}`;
    for (const [fileName, language] of Object.entries(languagesData)) {
      if (!(languageKey in language)) {
        errors.push(`${fileName} is missing ${languageKey}.`);
      }
    }
  }

  return errors;
}

function validateLanguageRelations(languagesData) {
  const errors = [];
  const [baseFileName, baseLanguage] = Object.entries(languagesData)[0];
  const baseKeys = Object.keys(baseLanguage).sort();
  const baseKeySet = new Set(baseKeys);

  for (const [fileName, language] of Object.entries(languagesData).slice(1)) {
    const keys = Object.keys(language).sort();
    const keySet = new Set(keys);
    const missingKeys = baseKeys.filter((key) => !keySet.has(key));
    const extraKeys = keys.filter((key) => !baseKeySet.has(key));

    if (missingKeys.length > 0) {
      errors.push(`${fileName} is missing language keys: ${missingKeys.join(", ")}.`);
    }

    if (extraKeys.length > 0) {
      errors.push(
        `${fileName} has language keys missing in ${baseFileName}: ${extraKeys.join(", ")}.`,
      );
    }

    for (const key of baseKeys.filter((baseKey) => keySet.has(baseKey))) {
      const basePlaceholders = getPlaceholders(baseLanguage[key]);
      const translatedPlaceholders = getPlaceholders(language[key]);

      if (!sameStringSet(basePlaceholders, translatedPlaceholders)) {
        errors.push(
          `${fileName}/${key} placeholders must match ${baseFileName}/${key}: ${
            [...basePlaceholders].join(", ") || "none"
          }.`,
        );
      }
    }
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

function validateBoundingBox(errors, path, bbox) {
  const [west, south, east, north] = bbox;

  if (!isLongitude(west) || !isLongitude(east) || west >= east) {
    errors.push(`${path} must use west/east longitudes in increasing order.`);
  }

  if (!isLatitude(south) || !isLatitude(north) || south >= north) {
    errors.push(`${path} must use south/north latitudes in increasing order.`);
  }
}

function isLongitude(value) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function isLatitude(value) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function getPlaceholders(value) {
  return new Set(value.match(/\{[a-zA-Z0-9_]+}/g) ?? []);
}

function sameStringSet(left, right) {
  return left.size === right.size && [...left].every((item) => right.has(item));
}

function tileServerSchema() {
  return {
    type: "string",
    minLength: 1,
    pattern: "^https://.*\\{z\\}.*\\{x\\}.*\\{y\\}.*$",
  };
}

function subdomainSchema() {
  return {
    type: "array",
    minItems: 1,
    uniqueItems: true,
    items: { type: "string", minLength: 1 },
  };
}

function directoryPathSchema() {
  return {
    type: "string",
    pattern: "^/.*/$",
  };
}

function iconFileSchema() {
  return {
    type: "string",
    pattern: "^[A-Za-z0-9_.-]+\\.(svg|png)$",
  };
}
