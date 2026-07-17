const URLS = {
  OVERPASS_API: "https://z.overpass-api.de/api/interpreter?data=",
  OSM_TILE_SERVER: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
};

export const OVERPASS_API_URL = URLS.OVERPASS_API;
export const MAX_OVERPASS_FILE_AGE_IN_DAYS = 14;
export const MAX_OVERPASS_RATE_LIMIT_RETRIES = 3;
export const OVERPASS_USER_AGENT =
  process.env.OVERPASS_USER_AGENT?.trim() ||
  "2.5D-Indoor-Maps/1.0.0 (+https://github.com/Accessible-InfoPoint/2.5D-Indoor-Maps)";

export const COLOR_PROFILE_FOLDER = "public/strings/colorProfiles";
export const PATTERN_FILL_IMAGES_FOLDER = "public/images/pattern_fill";
export const SETTINGS_PATH = "public/strings/settings.json";
