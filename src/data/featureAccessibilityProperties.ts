import {
  IndoorAccessibilityRule,
  IndoorAccessibilityRuleMessage,
  indoorAccessibilityRules,
} from "../indoor/indoorAccessibilityRules";
import { AccessibilityPropertiesInterface } from "../models/accessibilityPropertiesInterface";

function toFeatureAccessibilityProperty(
  rule: IndoorAccessibilityRule,
): AccessibilityPropertiesInterface {
  return {
    hasCorrectProperties: (feature) => rule.matchesTags(feature.properties),
    msgTrue: toFeatureMessage(rule.msgTrue),
    msgFalse: rule.msgFalse === undefined ? null : toFeatureMessage(rule.msgFalse),
    userGroups: rule.userGroups,
    iconFilename: rule.markerIcon,
    tags: rule.featureToggles,
  };
}

function toFeatureMessage(
  message: IndoorAccessibilityRuleMessage | null,
): AccessibilityPropertiesInterface["msgTrue"] | AccessibilityPropertiesInterface["msgFalse"] {
  if (message === null) {
    return null;
  }

  if (typeof message == "string") {
    return message;
  }

  return (feature) => message(feature.properties) ?? "";
}

export const featureAccessibilityProperties: AccessibilityPropertiesInterface[] = [
  ...indoorAccessibilityRules.map(toFeatureAccessibilityProperty),
];
