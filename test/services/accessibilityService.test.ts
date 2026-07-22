/**
 * @jest-environment jsdom
 */
import AccessibilityService from "../../src/services/accessibilityService";
import UserService from "../../src/services/userService";
import { UserGroupEnum } from "../../src/models/userGroupEnum";

jest.mock("../../src/services/userService");

const mockGetCurrentProfile = UserService.getCurrentProfile as jest.Mock;

describe("AccessibilityService", () => {
  beforeEach(() => {
    AccessibilityService.reset();
    jest.clearAllMocks();
  });

  it("builds wheelchair level summaries from raw tags", () => {
    mockGetCurrentProfile.mockReturnValue(UserGroupEnum.wheelchairUsers);

    expect(
      AccessibilityService.getAccessibilityInformationFromTags([
        { amenity: "toilets", wheelchair: "yes" },
        { highway: "elevator", wheelchair: "designated" },
      ]),
    ).toBe("[accessible toilets available, accessible elevator available]");
  });

  it("builds blind-user level summaries from raw tags", () => {
    mockGetCurrentProfile.mockReturnValue(UserGroupEnum.blindPeople);

    expect(
      AccessibilityService.getAccessibilityInformationFromTags([{ tactile_paving: "yes" }]),
    ).toBe(
      "[tactile paving available, there are no objects with tactile writing on them, there are no elevators with speech output]",
    );
  });
});
