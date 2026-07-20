import { DoorDataInterface } from "../models/doorDataInterface";
import ColorService from "../services/colorService";
import FeatureService from "../services/featureService";
import { isNeutralDoorColorRoomTags } from "./indoorTagFilters";
import { getRequiredFeatureId, getRequiredFeatureProperties } from "../utils/geoJsonHelpers";
import { OpeningRenderItem } from "../components/indoorLevel/indoorLevelRenderModel";

export function buildOpeningRenderItemsFromLegacyDoors(
  doors: DoorDataInterface[],
  selectedFeatureIds: string[],
): OpeningRenderItem[] {
  return doors
    .filter((door) => door.rooms.length > 0)
    .flatMap((door) => buildLegacyOpeningRenderItems(door, selectedFeatureIds));
}

function buildLegacyOpeningRenderItems(
  door: DoorDataInterface,
  selectedFeatureIds: string[],
): OpeningRenderItem[] {
  if (!door.orientation) {
    return [];
  }

  return [
    {
      coordinates: door.orientation,
      symbol: {
        lineColor: getLegacyDoorColor(door, selectedFeatureIds),
        lineWidth: FeatureService.getFeatureStyle(door.rooms[0])["lineWidth"],
      },
      debug: door.orientationDebug,
    },
  ];
}

function getLegacyDoorColor(door: DoorDataInterface, selectedFeatureIds: string[]): string {
  if (door.rooms.some((feature) => selectedFeatureIds.includes(getRequiredFeatureId(feature)))) {
    return ColorService.getCurrentColors().roomColorS;
  }

  const nonCorridorRoom = door.rooms.find(
    (feature) => !isNeutralDoorColorRoomTags(getRequiredFeatureProperties(feature)),
  );

  return FeatureService.getFeatureStyle(nonCorridorRoom ?? door.rooms[0])["polygonFill"];
}
