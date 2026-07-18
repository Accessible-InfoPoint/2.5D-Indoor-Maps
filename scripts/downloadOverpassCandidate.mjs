import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import osm2geojson from "osm2geojson-ultra";

const OVERPASS_API_URL = "https://z.overpass-api.de/api/interpreter?data=";
const DEFAULT_RATE_LIMIT_DELAY_MS = 10_000;
const MAX_OVERPASS_RATE_LIMIT_RETRIES = 3;
const OVERPASS_USER_AGENT =
  process.env.OVERPASS_USER_AGENT?.trim() ||
  "2.5D-Indoor-Maps/1.0.0 (+https://github.com/Accessible-InfoPoint/2.5D-Indoor-Maps)";
const outputRoot = join(process.cwd(), "tmp", "overpass-candidates");

const args = parseArgs(process.argv.slice(2));

if (!isValidArgs(args)) {
  printUsage();
  process.exit(1);
}

if (args.id && !/^[a-z0-9_]+$/.test(args.id)) {
  console.log("Building ID must use lowercase characters and underscore.");
  process.exit(1);
}

const outputDir = join(outputRoot, args.id || `sit_buildings_${buildRegionSlug(args)}`);
const region = args.areaName
  ? { type: "area", name: args.areaName }
  : { type: "bbox", bbox: args.bbox };
const source = {
  label: args.id,
  region,
};

await mkdir(outputDir, { recursive: true });

if (args.listBuildings) {
  await listSitBuildings(source, args);
  process.exit(0);
}

const buildings = await downloadAndConvert(buildBuildingsQuery(source, args.tags), "buildings");
const indoor = await downloadAndConvert(buildIndoorQuery(source), "indoor");
const buildingConstants = args.constantsId ? await readBuildingConstants() : undefined;
const report = buildReport(args, buildings, indoor, buildingConstants);
const snippet = {
  sources: {
    [args.id]: source,
  },
  buildings: {
    [args.id]: {
      source: args.id,
      buildingTags: args.tags,
    },
  },
};

await writeJson("buildings.json", buildings);
await writeJson("indoor.json", indoor);
await writeJson("report.json", report);
await writeJson("buildingSources.snippet.json", snippet);

console.log(`Candidate files written to ${outputDir}`);
console.log(report.ok ? "Candidate validation passed." : "Candidate validation failed.");
process.exitCode = report.ok ? 0 : 1;

function isValidArgs(options) {
  if (!options.areaName && !options.bbox) {
    return false;
  }

  if (options.listBuildings) {
    return true;
  }

  return Boolean(options.id) && Object.keys(options.tags).length > 0;
}

async function downloadAndConvert(query, label) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(OVERPASS_API_URL + encodeURIComponent(query), {
      headers: {
        "User-Agent": OVERPASS_USER_AGENT,
      },
    });

    if (response.status === 429 && attempt < MAX_OVERPASS_RATE_LIMIT_RETRIES) {
      const retryDelay = getRetryDelay(response.headers.get("retry-after"), attempt);
      console.warn(
        `${label} query was rate limited (HTTP 429). Retrying in ${Math.ceil(
          retryDelay / 1000,
        )} seconds...`,
      );
      await wait(retryDelay);
      continue;
    }

    if (!response.ok) {
      throw new Error(`${label} query failed: ${response.status} ${response.statusText}`);
    }

    const overpassJson = await response.json();
    return osm2geojson(overpassJson);
  }
}

function getRetryDelay(retryAfter, attempt) {
  if (retryAfter !== null) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }

    const retryDate = Date.parse(retryAfter);
    if (!Number.isNaN(retryDate)) {
      return Math.max(0, retryDate - Date.now());
    }
  }

  return DEFAULT_RATE_LIMIT_DELAY_MS * 2 ** attempt;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function listSitBuildings(source, options) {
  const query = buildBuildingsQuery(source, options.tags, { requireMaxLevel: true });
  const turboUrl = buildOverpassTurboUrl(query);

  await writeFile(join(outputDir, "sit-buildings.overpassql"), query);
  await writeFile(join(outputDir, "sit-buildings.overpass-turbo-url.txt"), `${turboUrl}\n`);
  console.log(`Overpass Turbo: ${turboUrl}`);

  const buildings = await downloadAndConvert(query, "SIT building list");
  const features = buildings.features.filter(isSitBuilding).map(toFeatureSummary);

  await writeJson("sit-buildings.features.json", features);

  console.log(`Found ${features.length} SIT-conform building(s).`);
  console.log(`Candidate files written to ${outputDir}`);
}

function isSitBuilding(feature) {
  const properties = feature.properties ?? {};

  return (
    properties.building !== undefined &&
    properties.min_level !== undefined &&
    properties.max_level !== undefined
  );
}

function toFeatureSummary(feature) {
  return {
    id: feature.id,
    properties: feature.properties ?? {},
  };
}

function buildOverpassTurboUrl(query) {
  return `https://overpass-turbo.eu/?Q=${encodeURIComponent(query)}`;
}

function buildReport(options, buildings, indoor, buildingConstants) {
  const failures = [];
  const matchingBuildings = buildings.features.filter((feature) => {
    const properties = feature.properties ?? {};

    return (
      isSitBuilding(feature) &&
      Object.entries(options.tags).every(([key, value]) => properties[key] === value)
    );
  });

  if (matchingBuildings.length !== 1) {
    failures.push(`Expected exactly one SIT building, found ${matchingBuildings.length}.`);
  }

  const buildingBounds =
    matchingBuildings.length === 1 && isPolygonal(matchingBuildings[0])
      ? getBoundingBox(matchingBuildings[0])
      : undefined;

  if (matchingBuildings.length === 1 && buildingBounds === undefined) {
    failures.push("Matched building must have Polygon or MultiPolygon geometry.");
  }

  const indoorFeatureCount =
    buildingBounds === undefined
      ? 0
      : indoor.features.filter((feature) => {
          const properties = feature.properties ?? {};

          return (
            (properties.indoor !== undefined || properties.level !== undefined) &&
            featureIntersectsBounds(feature, buildingBounds)
          );
        }).length;

  if (indoorFeatureCount === 0) {
    failures.push("No indoor or level features were found inside the matched building.");
  }

  if (options.constantsId && buildingConstants) {
    const constants = buildingConstants[options.constantsId];

    if (!constants) {
      failures.push(`buildingConstants.json has no entry for ${options.constantsId}.`);
    } else {
      validateBearingNode(indoor, constants.BEARING_CALC_NODE1, "BEARING_CALC_NODE1", failures);
      validateBearingNode(indoor, constants.BEARING_CALC_NODE2, "BEARING_CALC_NODE2", failures);
    }
  }

  return {
    ok: failures.length === 0,
    id: options.id,
    failures,
    matchedBuildings: matchingBuildings.length,
    indoorFeaturesInsideBuilding: indoorFeatureCount,
    constantsId: options.constantsId,
  };
}

async function readBuildingConstants() {
  return JSON.parse(
    await readFile(join(process.cwd(), "public", "strings", "buildingConstants.json"), "utf8"),
  );
}

function validateBearingNode(indoor, nodeId, fieldName, failures) {
  if (!indoor.features.some((feature) => feature.id?.toString() === `node/${nodeId}`)) {
    failures.push(`${fieldName} node/${nodeId} was not found in candidate indoor data.`);
  }
}

function buildBuildingsQuery(source, tags, options = {}) {
  const tagSelector = Object.entries(tags)
    .map(([key, value]) => `["${escapeOverpassValue(key)}"="${escapeOverpassValue(value)}"]`)
    .join("");
  const maxLevelSelector = options.requireMaxLevel ? '["max_level"]' : "";

  return [
    "[out:json];",
    buildRegionStatement(source),
    `(${buildRegionSelector(
      `nwr["building"]["min_level"]${maxLevelSelector}${tagSelector}`,
      source,
    )};);`,
    "(._;>;);",
    "out;",
  ].join("");
}

function buildIndoorQuery(source) {
  const indoorSelector = buildRegionSelector('nwr["indoor"]', source);
  const nonSitBuildingSelector = buildRegionSelector('nwr["building"][!"min_level"]', source);

  return [
    "[out:json];",
    buildRegionStatement(source),
    `(${indoorSelector};-${nonSitBuildingSelector};);`,
    "(._;>;);",
    "out;",
  ].join("");
}

function buildRegionStatement(source) {
  if (source.region.type === "area") {
    return `area["name"="${escapeOverpassValue(source.region.name)}"]->.searchArea;`;
  }

  return "";
}

function buildRegionSelector(selector, source) {
  if (source.region.type === "area") {
    return `${selector}(area.searchArea)`;
  }

  const [west, south, east, north] = source.region.bbox;
  return `${selector}(${south},${west},${north},${east})`;
}

function parseArgs(argv) {
  const parsed = {
    id: "",
    areaName: "",
    bbox: undefined,
    tags: {},
    constantsId: undefined,
    listBuildings: false,
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    switch (arg) {
      case "--id": {
        const optionValue = readOptionValue(argv, index);
        parsed.id = optionValue.value;
        index = optionValue.index;
        break;
      }
      case "--area-name": {
        const optionValue = readOptionValue(argv, index);
        parsed.areaName = optionValue.value;
        index = optionValue.index;
        break;
      }
      case "--bbox": {
        const optionValue = readOptionValue(argv, index);
        parsed.bbox = parseBbox(optionValue.value);
        index = optionValue.index;
        break;
      }
      case "--tag": {
        const optionValue = readOptionValue(argv, index);
        const [key, tagValue] = splitTag(optionValue.value);
        if (!key || !tagValue) {
          throw new Error("--tag must use key=value syntax.");
        }
        parsed.tags[key] = tagValue;
        index = optionValue.index;
        break;
      }
      case "--constants-id": {
        const optionValue = readOptionValue(argv, index);
        parsed.constantsId = optionValue.value;
        index = optionValue.index;
        break;
      }
      case "--list-buildings":
        parsed.listBuildings = true;
        break;
      default:
        throw new Error(`Unknown option ${arg}.`);
    }
  }

  return parsed;
}

function parseBbox(value) {
  const coordinates = value.split(",").map(Number);
  if (coordinates.length !== 4 || coordinates.some((coordinate) => !Number.isFinite(coordinate))) {
    throw new Error("--bbox must use west,south,east,north numeric coordinates.");
  }

  return coordinates;
}

function buildRegionSlug(options) {
  if (options.areaName) {
    return sanitizeId(options.areaName);
  }

  return sanitizeId(options.bbox.join("_"));
}

function sanitizeId(value) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "area"
  );
}

function readOptionValue(argv, optionIndex) {
  const option = argv[optionIndex];
  const values = [];

  for (let index = optionIndex + 1; index < argv.length; index++) {
    const value = argv[index];
    if (value.startsWith("--")) {
      break;
    }

    values.push(value);
  }

  if (values.length === 0) {
    throw new Error(`${option} requires a value.`);
  }

  return {
    value: stripSurroundingQuotes(values.join(" ")),
    index: optionIndex + values.length,
  };
}

function splitTag(value) {
  const separatorIndex = value.indexOf("=");

  if (separatorIndex === -1) {
    return [value, undefined];
  }

  return [value.slice(0, separatorIndex), stripSurroundingQuotes(value.slice(separatorIndex + 1))];
}

function stripSurroundingQuotes(value) {
  const trimmed = value.trim();
  const firstCharacter = trimmed[0];
  const lastCharacter = trimmed[trimmed.length - 1];

  if (
    (firstCharacter === '"' && lastCharacter === '"') ||
    (firstCharacter === "'" && lastCharacter === "'")
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function isPolygonal(feature) {
  return ["Polygon", "MultiPolygon"].includes(feature.geometry?.type);
}

function getBoundingBox(feature) {
  const positions = flattenPositions(feature.geometry.coordinates);
  const longitudes = positions.map((position) => position[0]);
  const latitudes = positions.map((position) => position[1]);

  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ];
}

function flattenPositions(coordinates) {
  if (!Array.isArray(coordinates)) {
    return [];
  }

  if (typeof coordinates[0] === "number") {
    return [coordinates];
  }

  return coordinates.flatMap(flattenPositions);
}

function featureIntersectsBounds(feature, bounds) {
  return flattenPositions(feature.geometry?.coordinates).some(([lng, lat]) => {
    const [west, south, east, north] = bounds;

    return lng >= west && lng <= east && lat >= south && lat <= north;
  });
}

function escapeOverpassValue(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function writeJson(fileName, data) {
  await writeFile(join(outputDir, fileName), JSON.stringify(data, null, 2));
}

function printUsage() {
  console.error(
    [
      "Usage:",
      '  npm run overpass:candidate -- --id <id> --area-name "<name>" --tag key=value',
      "  npm run overpass:candidate -- --id <id> --bbox west,south,east,north --tag key=value",
      '  npm run overpass:list-buildings -- --area-name "<name>"',
      "  npm run overpass:list-buildings -- --bbox west,south,east,north",
    ].join("\n"),
  );
}
