/**
 * @jest-environment jsdom
 */

import userService from "../../src/services/userService";
import { UserGroupEnum } from "../../src/models/userGroupEnum";

describe("userService", () => {
  const profileKey = "userProfile";
  const featureKey = "currentlySelectedFeatures";

  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  describe("getCurrentProfile", () => {
    it("returns stored profile if available", () => {
      localStorage.setItem(profileKey, UserGroupEnum.blindPeople.toString());
      const profile = userService.getCurrentProfile();
      expect(profile).toBe(UserGroupEnum.blindPeople);
    });

    it("returns noImpairments as default if no profile is stored", () => {
      const profile = userService.getCurrentProfile();
      expect(profile).toBe(UserGroupEnum.noImpairments);
    });
  });

  describe("setProfile", () => {
    it("stores profile and removes selected features", () => {
      const reloadMock = jest.fn();

      Object.defineProperty(window, "location", {
        value: { reload: reloadMock },
        writable: true,
      });

      userService.setProfile(UserGroupEnum.wheelchairUsers);

      expect(localStorage.getItem(profileKey)).toBe(UserGroupEnum.wheelchairUsers.toString());
      expect(localStorage.getItem(featureKey)).toBeNull();
    });

    it("calls window.location.reload after timeout", () => {
      jest.useFakeTimers();

      const reloadMock = jest.fn();

      Object.defineProperty(window, "location", {
        value: { reload: reloadMock },
        writable: true,
      });

      userService.setProfile(UserGroupEnum.blindPeople);

      jest.advanceTimersByTime(200);
      expect(reloadMock).toHaveBeenCalled();
    });
  });
});
