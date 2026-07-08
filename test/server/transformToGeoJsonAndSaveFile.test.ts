import { OverpassTransformError } from "../../server/overpassErrors";
import { transformToGeoJsonAndSaveFile } from "../../server/transformToGeoJsonAndSaveFile";

describe("transformToGeoJsonAndSaveFile", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("wraps invalid Overpass JSON with diagnostic context", async () => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);

    await expect(
      transformToGeoJsonAndSaveFile("<html>Bad Gateway</html>", "output.geojson", {
        resourceLabel: "test resource",
        url: "https://example.com",
      }),
    ).rejects.toMatchObject<Partial<OverpassTransformError>>({
      name: "OverpassTransformError",
      code: "overpass_transform_failed",
      resourceLabel: "test resource",
      url: "https://example.com",
      dest: "output.geojson",
      responsePreview: "<html>Bad Gateway</html>",
    });
  });
});
