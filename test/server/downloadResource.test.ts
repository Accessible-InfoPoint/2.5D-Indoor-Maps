jest.mock("../../server/transformToGeoJsonAndSaveFile", () => ({
  transformToGeoJsonAndSaveFile: jest.fn().mockResolvedValue(undefined),
}));

import { downloadResource } from "../../server/downloadResource";
import { OverpassDownloadError } from "../../server/overpassErrors";
import { transformToGeoJsonAndSaveFile } from "../../server/transformToGeoJsonAndSaveFile";

const fetchMock = jest.fn();
const transformMock = jest.mocked(transformToGeoJsonAndSaveFile);

describe("downloadResource", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    transformMock.mockClear();
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("passes the configured User-Agent to the request", async () => {
    fetchMock.mockResolvedValue(createResponse(200, "OK", '{"elements":[]}'));

    await downloadResource("https://example.com", "output.geojson", {
      headers: {
        "User-Agent": "test-application/1.0",
      },
    });

    expect(fetchMock).toHaveBeenCalledWith("https://example.com", {
      headers: {
        "User-Agent": "test-application/1.0",
      },
    });
    expect(transformMock).toHaveBeenCalledWith('{"elements":[]}', "output.geojson", {
      resourceLabel: undefined,
      url: "https://example.com",
    });
  });

  it("retries HTTP 429 responses using Retry-After", async () => {
    fetchMock
      .mockResolvedValueOnce(createResponse(429, "Too Many Requests", "", "0"))
      .mockResolvedValueOnce(createResponse(200, "OK", '{"elements":[]}'));
    jest.spyOn(console, "warn").mockImplementation(() => undefined);

    await downloadResource("https://example.com", "output.geojson", {
      maxRateLimitRetries: 1,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(transformMock).toHaveBeenCalledTimes(1);
  });

  it("reports HTTP 429 after all retries are exhausted", async () => {
    fetchMock.mockResolvedValue(createResponse(429, "Too Many Requests"));

    await expect(downloadResource("https://example.com", "output.geojson")).rejects.toThrow(
      "HTTP status: 429 Too Many Requests",
    );
  });

  it("includes response context in HTTP errors", async () => {
    fetchMock.mockResolvedValue(
      createResponse(504, "Gateway Timeout", "runtime error: Query timed out"),
    );

    await expect(
      downloadResource("https://example.com", "output.geojson", {
        resourceLabel: "test resource",
      }),
    ).rejects.toMatchObject<Partial<OverpassDownloadError>>({
      name: "OverpassDownloadError",
      code: "overpass_download_failed",
      resourceLabel: "test resource",
      url: "https://example.com",
      dest: "output.geojson",
      status: 504,
      statusText: "Gateway Timeout",
      responsePreview: "runtime error: Query timed out",
    });
  });
});

function createResponse(
  status: number,
  statusText: string,
  body = "",
  retryAfter: string | null = null,
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: {
      get: () => retryAfter,
    },
    text: async () => body,
  } as unknown as Response;
}
