import { DoorDataInterface } from "../models/doorDataInterface";
import ColorService from "../services/colorService";
import FeatureService from "../services/featureService";
import { getRequiredFeatureId, getRequiredFeatureProperties } from "../utils/geoJsonHelpers";
import { DoorRenderItem } from "../components/indoorLevel/indoorLevelRenderModel";

export function buildDoorRenderItemsFromLegacyDoors(
  doors: DoorDataInterface[],
  selectedFeatureIds: string[],
): DoorRenderItem[] {
  return doors
    .filter((door) => door.rooms.length > 0)
    .flatMap((door) => buildLegacyDoorRenderItems(door, selectedFeatureIds));
}

function buildLegacyDoorRenderItems(
  door: DoorDataInterface,
  selectedFeatureIds: string[],
): DoorRenderItem[] {
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

  const nonCorridorRoom = door.rooms.find((feature) => {
    const properties = getRequiredFeatureProperties(feature);

    return !(["corridor", "area"].includes(properties.indoor) && properties.stairs !== "yes");
  });

  return FeatureService.getFeatureStyle(nonCorridorRoom ?? door.rooms[0])["polygonFill"];
}
