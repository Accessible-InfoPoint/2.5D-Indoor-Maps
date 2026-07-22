import {
  IndoorAccessibilityRule,
  indoorAccessibilityRules,
} from "../indoor/indoorAccessibilityRules";
import { IndoorTags } from "../indoor/indoorTagFilters";
import UserService from "../services/userService";

export function accessibilityDescriptionFromTags(
  tags: IndoorTags,
  accessibilityRules: IndoorAccessibilityRule[] = indoorAccessibilityRules,
): string {
  const messages = accessibilityRules
    .filter((rule) => rule.userGroups.includes(UserService.getCurrentProfile()))
    .map((rule) => getRuleMessage(rule, tags))
    .filter((message): message is string => typeof message == "string" && message.length > 0);

  return messages.length > 0 ? ` [${messages.join(", ")}]` : "";
}

function getRuleMessage(
  rule: IndoorAccessibilityRule,
  tags: IndoorTags,
): string | null | undefined {
  if (rule.matchesTags(tags)) {
    return resolveMessage(rule.msgTrue, tags);
  }

  return rule.msgFalse === undefined || rule.msgFalse === null
    ? undefined
    : resolveMessage(rule.msgFalse, tags);
}

function resolveMessage(
  message: IndoorAccessibilityRule["msgTrue"] | NonNullable<IndoorAccessibilityRule["msgFalse"]>,
  tags: IndoorTags,
): string | null | undefined {
  return typeof message == "string" ? message : message(tags);
}
