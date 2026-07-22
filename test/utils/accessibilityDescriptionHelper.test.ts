/**
 * @jest-environment jsdom
 */
import { accessibilityDescriptionFromTags } from "../../src/utils/accessibilityDescriptionHelper";
import UserService from "../../src/services/userService";
import { UserGroupEnum } from "../../src/models/userGroupEnum";
import { IndoorAccessibilityRule } from "../../src/indoor/indoorAccessibilityRules";

jest.mock("../../src/services/userService");

const mockGetCurrentProfile = UserService.getCurrentProfile as jest.Mock;

describe("accessibilityDescriptionFromTags", () => {
  it("returns msgTrue for matching tags and profile", () => {
    mockGetCurrentProfile.mockReturnValue(UserGroupEnum.wheelchairUsers);

    const rules: IndoorAccessibilityRule[] = [
      {
        id: "ramp",
        userGroups: [UserGroupEnum.wheelchairUsers],
        matchesTags: (tags) => tags.type === "ramp",
        msgTrue: "Ramp is accessible",
        msgFalse: null,
      },
    ];

    expect(accessibilityDescriptionFromTags({ type: "ramp" }, rules)).toBe(" [Ramp is accessible]");
  });

  it("returns msgFalse if tags do not match", () => {
    mockGetCurrentProfile.mockReturnValue(UserGroupEnum.wheelchairUsers);

    const rules: IndoorAccessibilityRule[] = [
      {
        id: "ramp",
        userGroups: [UserGroupEnum.wheelchairUsers],
        matchesTags: () => false,
        msgTrue: "Ramp is accessible",
        msgFalse: "Ramp is not accessible",
      },
    ];

    expect(accessibilityDescriptionFromTags({ type: "ramp" }, rules)).toBe(
      " [Ramp is not accessible]",
    );
  });

  it("returns nothing for unrelated user profile", () => {
    mockGetCurrentProfile.mockReturnValue(UserGroupEnum.noImpairments);

    const rules: IndoorAccessibilityRule[] = [
      {
        id: "blind-info",
        userGroups: [UserGroupEnum.blindPeople],
        matchesTags: () => true,
        msgTrue: "Blind info",
        msgFalse: "Blind warning",
      },
    ];

    expect(accessibilityDescriptionFromTags({}, rules)).toBe("");
  });

  it("handles function-based messages", () => {
    mockGetCurrentProfile.mockReturnValue(UserGroupEnum.wheelchairUsers);

    const rules: IndoorAccessibilityRule[] = [
      {
        id: "dynamic",
        userGroups: [UserGroupEnum.wheelchairUsers],
        matchesTags: () => false,
        msgTrue: () => "Dynamic true",
        msgFalse: (tags) => (tags.type === "ramp" ? "Dynamic false" : ""),
      },
    ];

    expect(accessibilityDescriptionFromTags({ type: "ramp" }, rules)).toBe(" [Dynamic false]");
  });

  it("returns empty string if no rule produces a message", () => {
    mockGetCurrentProfile.mockReturnValue(UserGroupEnum.wheelchairUsers);

    const rules: IndoorAccessibilityRule[] = [
      {
        id: "empty",
        userGroups: [UserGroupEnum.wheelchairUsers],
        matchesTags: () => false,
        msgTrue: () => "Should not show",
        msgFalse: () => "",
      },
    ];

    expect(accessibilityDescriptionFromTags({}, rules)).toBe("");
  });
});
