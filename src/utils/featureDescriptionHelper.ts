import { AccessibilityPropertiesInterface } from "../models/accessibilityPropertiesInterface";
import UserService from "../services/userService";

export function featureDescriptionHelper(
  feature: GeoJSON.Feature,
  accessibilityProperties: AccessibilityPropertiesInterface[]
): string {
  let description = " [";

  accessibilityProperties.forEach((element) => {
    if (!element.userGroups.includes(UserService.getCurrentProfile())) {
      return; // only show properties for currently selected user profile
    }

    if (element.hasCorrectProperties(feature)) {
      description += (typeof element.msgTrue === "string" ? element.msgTrue : element.msgTrue(feature)) + ", ";
    } else if (element.msgFalse !== null && typeof element.msgFalse === "string") {
      description += element.msgFalse + ", ";
    } else if (element.msgFalse !== null && typeof element.msgFalse === "function") {
      if (element.msgFalse(feature)) {
        description += element.msgFalse(feature) + ", ";
      }
    }
  });

  if (description.length > 2) {
    description = description.slice(0, -2) + "]";
  } else {
    description = "";
  }

  return description;
}
