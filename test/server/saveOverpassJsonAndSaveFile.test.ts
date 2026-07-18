import { OverpassCacheWriteError } from "../../server/overpassErrors";
import { saveOverpassJsonAndSaveFile } from "../../server/saveOverpassJsonAndSaveFile";

describe("saveOverpassJsonAndSaveFile", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("wraps invalid Overpass JSON with diagnostic context", async () => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);

    await expect(
      saveOverpassJsonAndSaveFile("<html>Bad Gateway</html>", "output.json", {
        resourceLabel: "test resource",
        url: "https://example.com",
      }),
    ).rejects.toMatchObject<Partial<OverpassCacheWriteError>>({
      name: "OverpassCacheWriteError",
      code: "overpass_cache_write_failed",
      resourceLabel: "test resource",
      url: "https://example.com",
      dest: "output.json",
      responsePreview: "<html>Bad Gateway</html>",
    });
  });
});
