import { BuildingInterface } from "../models/buildingInterface";
import { RawOverpassDataResponse } from "../services/httpService";
import { OsmGraph } from "../overpass/OsmGraph";
import { extractLevels } from "../utils/extractLevels";
import { getRequiredArrayValue } from "../utils/requiredHelpers";
import { contributesToIndoorLevels } from "./rawIndoorElementFilters";

export interface RawOverpassGraphs {
  buildings: OsmGraph;
  indoor: OsmGraph;
}

export interface IndoorModel {
  rawOverpassData: RawOverpassDataResponse;
  graphs: RawOverpassGraphs;
  buildingInterface: BuildingInterface;
  outlineCoordinates: number[][];
  levels: number[];
}

export function createIndoorModel(
  rawOverpassData: RawOverpassDataResponse,
  buildingInterface: BuildingInterface,
): IndoorModel {
  const graphs = {
    buildings: new OsmGraph(rawOverpassData.buildings),
    indoor: new OsmGraph(rawOverpassData.indoor),
  };

  return {
    rawOverpassData,
    graphs,
    buildingInterface,
    outlineCoordinates: getBuildingOutlineCoordinates(buildingInterface),
    levels: collectIndoorLevels(graphs.indoor),
  };
}

function collectIndoorLevels(indoorGraph: OsmGraph): number[] {
  const levels = new Set<number>();

  indoorGraph.elements.forEach((element) => {
    if (!contributesToIndoorLevels(element)) {
      return;
    }

    extractLevels(element.tags?.level).forEach((level) => levels.add(level));
    extractLevels(element.tags?.repeat_on).forEach((level) => levels.add(level));
  });

  return Array.from(levels).sort((a, b) => -a + b);
}

function getBuildingOutlineCoordinates(buildingInterface: BuildingInterface): number[][] {
  return getRequiredArrayValue(
    (buildingInterface.feature.geometry as GeoJSON.Polygon).coordinates,
    0,
    "Building outline coordinates",
  );
}
