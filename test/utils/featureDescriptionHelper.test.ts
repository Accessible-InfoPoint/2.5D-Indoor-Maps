import { featureDescriptionHelper } from "../../src/utils/featureDescriptionHelper";
import UserService from "../../src/services/userService";
import { UserGroupEnum } from "../../src/models/userGroupEnum";

jest.mock("../../src/services/userService");

const mockGetCurrentProfile = UserService.getCurrentProfile as jest.Mock;

describe("featureDescriptionHelper", () => {
  const dummyFeature: GeoJSON.Feature = {
    type: "Feature",
    properties: { type: "ramp" },
    geometry: {
      type: "Point",
      coordinates: [0, 0]
    }
  };

  it("returns correct msgTrue for matching profile", () => {
    mockGetCurrentProfile.mockReturnValue(UserGroupEnum.wheelchairUsers);

    const accessibilityProperties = [
      {
        userGroups: [UserGroupEnum.wheelchairUsers],
        hasCorrectProperties: () => true,
        msgTrue: "Ramp is accessible",
        msgFalse: null as null
      }
    ];

    const result = featureDescriptionHelper(dummyFeature, accessibilityProperties);
    expect(result).toBe(" [Ramp is accessible]");
  });

  it("returns msgFalse if property is incorrect", () => {
    mockGetCurrentProfile.mockReturnValue(UserGroupEnum.wheelchairUsers);

    const accessibilityProperties = [
      {
        userGroups: [UserGroupEnum.wheelchairUsers],
        hasCorrectProperties: () => false,
        msgTrue: "Ramp is accessible",
        msgFalse: "Ramp is not accessible"
      }
    ];

    const result = featureDescriptionHelper(dummyFeature, accessibilityProperties);
    expect(result).toBe(" [Ramp is not accessible]");
  });

  it("returns nothing for unrelated user profile", () => {
    mockGetCurrentProfile.mockReturnValue(UserGroupEnum.noImpairments);

    const accessibilityProperties = [
      {
        userGroups: [UserGroupEnum.blindPeople],
        hasCorrectProperties: () => true,
        msgTrue: "Blind info",
        msgFalse: "Blind warning"
      }
    ];

    const result = featureDescriptionHelper(dummyFeature, accessibilityProperties);
    expect(result).toBe("");
  });

  it("handles function-based msgTrue and msgFalse correctly", () => {
    mockGetCurrentProfile.mockReturnValue(UserGroupEnum.wheelchairUsers);

    const accessibilityProperties = [
      {
        userGroups: [UserGroupEnum.wheelchairUsers],
        hasCorrectProperties: () => false,
        msgTrue: () => "Dynamic true",
        msgFalse: (feature: GeoJSON.Feature<any, any>) =>
          feature.properties?.type === "ramp" ? "Dynamic false" : "" // empty return as null return not allowed
      }
    ];

    const result = featureDescriptionHelper(dummyFeature, accessibilityProperties);
    expect(result).toBe(" [Dynamic false]");
  });

  it("returns empty string if no matching conditions", () => {
    mockGetCurrentProfile.mockReturnValue(UserGroupEnum.wheelchairUsers);

    const accessibilityProperties = [
      {
        userGroups: [UserGroupEnum.wheelchairUsers],
        hasCorrectProperties: () => false,
        msgTrue: () => "Should not show",
        msgFalse: () => "" // null return not allowed
      }
    ];

    const result = featureDescriptionHelper(dummyFeature, accessibilityProperties);
    expect(result).toBe("");
  });
});
