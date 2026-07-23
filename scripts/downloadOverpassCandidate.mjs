import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

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

const buildings = await downloadOverpassJson(buildBuildingsQuery(source, args.tags), "buildings");
const indoor = await downloadOverpassJson(buildIndoorQuery(source), "indoor");
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

async function downloadOverpassJson(query, label) {
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

    return response.json();
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

  const buildings = await downloadOverpassJson(query, "SIT building list");
  const elements = buildings.elements.filter(isSitBuildingElement).map(toElementSummary);

  await writeJson("sit-buildings.elements.json", elements);

  console.log(`Found ${elements.length} SIT-conform building(s).`);
  console.log(`Candidate files written to ${outputDir}`);
}

function isSitBuildingElement(element) {
  const tags = element.tags ?? {};

  return (
    tags.building !== undefined && tags.min_level !== undefined && tags.max_level !== undefined
  );
}

function toElementSummary(element) {
  return {
    id: getElementKey(element),
    tags: element.tags ?? {},
  };
}

function buildOverpassTurboUrl(query) {
  return `https://overpass-turbo.eu/?Q=${encodeURIComponent(query)}`;
}

function buildReport(options, buildings, indoor, buildingConstants) {
  const failures = [];
  const buildingIndex = buildRawOverpassIndex(buildings);
  const indoorIndex = buildRawOverpassIndex(indoor);
  const matchingBuildings = buildings.elements.filter((element) => {
    const tags = element.tags ?? {};

    return isSitBuildingElement(element) && tagsMatch(tags, options.tags);
  });

  if (matchingBuildings.length !== 1) {
    failures.push(`Expected exactly one SIT building, found ${matchingBuildings.length}.`);
  }

  const buildingBounds =
    matchingBuildings.length === 1
      ? getRawBuildingBoundingBox(matchingBuildings[0], buildingIndex)
      : undefined;

  if (matchingBuildings.length === 1 && buildingBounds === undefined) {
    failures.push("Matched building must have Polygon or MultiPolygon geometry.");
  }

  const indoorElementCount =
    buildingBounds === undefined
      ? 0
      : indoor.elements.filter((element) => {
          const tags = element.tags ?? {};

          return (
            (tags.indoor !== undefined || tags.level !== undefined) &&
            rawElementTouchesBounds(element, buildingBounds, indoorIndex)
          );
        }).length;

  if (indoorElementCount === 0) {
    failures.push("No indoor or level elements were found inside the matched building.");
  }

  if (options.constantsId && buildingConstants) {
    const constants = buildingConstants[options.constantsId];

    if (!constants) {
      failures.push(`buildingConstants.json has no entry for ${options.constantsId}.`);
    } else {
      validateBearingNode(
        indoorIndex,
        constants.BEARING_CALC_NODE1,
        "BEARING_CALC_NODE1",
        failures,
      );
      validateBearingNode(
        indoorIndex,
        constants.BEARING_CALC_NODE2,
        "BEARING_CALC_NODE2",
        failures,
      );
    }
  }

  return {
    ok: failures.length === 0,
    id: options.id,
    failures,
    matchedBuildings: matchingBuildings.length,
    indoorElementsInsideBuilding: indoorElementCount,
    constantsId: options.constantsId,
  };
}

async function readBuildingConstants() {
  return JSON.parse(
    await readFile(join(process.cwd(), "public", "strings", "buildingConstants.json"), "utf8"),
  );
}

function validateBearingNode(indoorIndex, nodeId, fieldName, failures) {
  if (!indoorIndex.elementsByKey.has(`node/${nodeId}`)) {
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
  const levelSelector = buildRegionSelector('nwr["level"]', source);
  const nonSitBuildingSelector = buildRegionSelector('nwr["building"][!"min_level"]', source);

  return [
    "[out:json];",
    buildRegionStatement(source),
    `((${indoorSelector};${levelSelector};);-${nonSitBuildingSelector};);`,
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

function tagsMatch(tags, expectedTags) {
  return Object.entries(expectedTags).every(([key, value]) => tags[key] === value);
}

function buildRawOverpassIndex(overpassJson) {
  const elementsByKey = new Map();
  const nodesById = new Map();

  overpassJson.elements.forEach((element) => {
    elementsByKey.set(getElementKey(element), element);

    if (element.type === "node") {
      nodesById.set(element.id, element);
    }
  });

  return {
    elementsByKey,
    nodesById,
  };
}

function getElementKey(element) {
  return `${element.type}/${element.id}`;
}

function getRawBuildingBoundingBox(element, index) {
  if (element.type === "node") {
    return undefined;
  }

  const positions =
    element.type === "way"
      ? getClosedWayPositions(element, index)
      : getRelationOuterPositions(element, index);

  return positions.length === 0 ? undefined : getBoundingBoxFromPositions(positions);
}

function getClosedWayPositions(way, index) {
  if (!Array.isArray(way.nodes) || way.nodes.length < 4 || way.nodes[0] !== way.nodes.at(-1)) {
    return [];
  }

  return getWayPositions(way, index);
}

function getRelationOuterPositions(relation, index) {
  if (!Array.isArray(relation.members)) {
    return [];
  }

  const hasOuterMembers = relation.members.some(
    (member) => member.type === "way" && member.role === "outer",
  );

  return relation.members
    .filter(
      (member) =>
        member.type === "way" &&
        (hasOuterMembers ? member.role === "outer" : member.role !== "inner"),
    )
    .flatMap((member) => {
      const way = index.elementsByKey.get(`way/${member.ref}`);

      return way?.type === "way" ? getWayPositions(way, index) : [];
    });
}

function rawElementTouchesBounds(element, bounds, index, visitedKeys = new Set()) {
  const key = getElementKey(element);

  if (visitedKeys.has(key)) {
    return false;
  }

  visitedKeys.add(key);

  switch (element.type) {
    case "node":
      return nodeTouchesBounds(element, bounds);
    case "way":
      return getWayPositions(element, index).some(([lng, lat]) =>
        positionTouchesBounds(lng, lat, bounds),
      );
    case "relation":
      return relationTouchesBounds(element, bounds, index, visitedKeys);
    default:
      return false;
  }
}

function relationTouchesBounds(relation, bounds, index, visitedKeys) {
  if (!Array.isArray(relation.members)) {
    return false;
  }

  return relation.members.some((member) => {
    const memberElement = index.elementsByKey.get(`${member.type}/${member.ref}`);

    return (
      memberElement !== undefined &&
      rawElementTouchesBounds(memberElement, bounds, index, visitedKeys)
    );
  });
}

function getWayPositions(way, index) {
  if (!Array.isArray(way.nodes)) {
    return [];
  }

  return way.nodes
    .map((nodeId) => index.nodesById.get(nodeId))
    .filter((node) => node !== undefined)
    .map((node) => [node.lon, node.lat]);
}

function getBoundingBoxFromPositions(positions) {
  const longitudes = positions.map((position) => position[0]);
  const latitudes = positions.map((position) => position[1]);

  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ];
}

function nodeTouchesBounds(node, bounds) {
  return positionTouchesBounds(node.lon, node.lat, bounds);
}

function positionTouchesBounds(lng, lat, bounds) {
  const [west, south, east, north] = bounds;

  return lng >= west && lng <= east && lat >= south && lat <= north;
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
