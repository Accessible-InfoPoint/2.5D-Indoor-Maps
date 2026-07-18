import { IndoorModel } from "../../indoor/IndoorModel";
import { IndoorLevelRenderModel } from "./indoorLevelRenderModel";

interface RawIndoorLevelRenderBuilderOptions {
  model: IndoorModel;
  level: number;
}

export function buildRawIndoorLevelRenderModel(
  options: RawIndoorLevelRenderBuilderOptions,
): IndoorLevelRenderModel {
  void options.level;

  return {
    outlineCoordinates: options.model.outlineCoordinates,
    rooms: [],
    tactilePaving: [],
    pointMarkerFeatures: [],
    staircase: {
      doorCoordinates: [],
      lowestPoints: [],
      pathways: [],
      allNodes: [],
      simpleFeatures: [],
      complexFeatures: [],
    },
  };
}
