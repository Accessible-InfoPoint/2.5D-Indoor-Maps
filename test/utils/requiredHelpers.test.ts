import {
  getRequiredArrayValue,
  getRequiredMapValue,
  getRequiredMatch,
} from "../../src/utils/requiredHelpers";

describe("requiredHelpers", () => {
  describe("getRequiredMapValue", () => {
    it("returns a value for an existing key", () => {
      const values = new Map<string, number>([["level", 2]]);

      expect(getRequiredMapValue(values, "level")).toBe(2);
    });

    it("throws when the key is missing", () => {
      const values = new Map<string, number>();

      expect(() =>
        getRequiredMapValue(values, "level", "Levels")
      ).toThrow('Levels is missing required key "level".');
    });
  });

  describe("getRequiredArrayValue", () => {
    it("returns a value for an existing index", () => {
      expect(getRequiredArrayValue(["a", "b"], 1)).toBe("b");
    });

    it("supports negative array indexes", () => {
      expect(getRequiredArrayValue(["a", "b"], -1)).toBe("b");
    });

    it("throws when the index is missing", () => {
      expect(() =>
        getRequiredArrayValue(["a"], 2, "Coordinates")
      ).toThrow('Coordinates is missing required index "2".');
    });
  });

  describe("getRequiredMatch", () => {
    it("returns a defined value", () => {
      expect(getRequiredMatch("match")).toBe("match");
    });

    it("throws when the value is undefined", () => {
      expect(() =>
        getRequiredMatch(undefined, "Bearing node")
      ).toThrow("Bearing node was not found.");
    });
  });
});
