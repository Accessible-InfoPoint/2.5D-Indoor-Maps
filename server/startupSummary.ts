import { BACKEND_SOURCE, CURRENT_BUILDING } from "../public/strings/settings.json";
import { getOverpassResourcesForBuilding } from "./buildingSources";
import { resolveProjectPath } from "./paths";

export interface StartupSummaryOptions {
  port: number;
  staticRoot?: string;
}

export function logStartupSummary(options: StartupSummaryOptions): void {
  const staticRoot = options.staticRoot ?? resolveProjectPath("public");
  const overpassDownload = process.env.SKIP_OVERPASS_DOWNLOAD === "true" ? "disabled" : "enabled";
  const overpassResources = getOverpassResourcesForBuilding(CURRENT_BUILDING)
    .map((resource) => resource.label)
    .join(", ");

  console.log("=== Server ready ===");
  console.log(`URL: http://localhost:${options.port}`);
  console.log(`Static root: ${staticRoot}`);
  console.log(`Backend source: ${BACKEND_SOURCE}`);
  console.log(`Current building: ${CURRENT_BUILDING}`);
  console.log(`Overpass download: ${overpassDownload}`);
  console.log(`Overpass resources: ${overpassResources}`);
}
