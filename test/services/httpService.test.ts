jest.mock("../../src/services/languageService", () => ({
  lang: {
    buildingErrorFetching: "An error occurred while fetching building data: ",
  },
}));

import HttpService, { HttpRequestError } from "../../src/services/httpService";
import { BuildingInterface } from "../../src/models/buildingInterface";
import { OverpassJson } from "../../src/models/overpassJson";

describe("httpService", () => {
  const originalXMLHttpRequest = globalThis.XMLHttpRequest;

  afterEach(() => {
    globalThis.XMLHttpRequest = originalXMLHttpRequest;
  });

  it("uses structured API error messages and keeps response details for console logging", async () => {
    const responseBody = {
      error: {
        code: "cached_indoor_data_unavailable",
        message: "Cached indoor data could not be loaded.",
        details: {
          building: "apb",
        },
      },
    };

    installMockXmlHttpRequest({
      status: 500,
      statusText: "Internal Server Error",
      responseText: JSON.stringify(responseBody),
    });

    await expect(HttpService.fetchFilteredIndoorData("apb")).rejects.toMatchObject<
      Partial<HttpRequestError>
    >({
      name: "HttpRequestError",
      message:
        "An error occurred while fetching building data: Cached indoor data could not be loaded.",
      url: "/api/buildings/apb/indoor",
      status: 500,
      statusText: "Internal Server Error",
      responseBody,
    });
  });

  it("falls back to the HTTP status text for unrecognized error responses", async () => {
    installMockXmlHttpRequest({
      status: 503,
      statusText: "Service Unavailable",
      responseText: "<html>Service Unavailable</html>",
    });

    await expect(HttpService.fetchFilteredIndoorData("apb")).rejects.toThrow(
      "An error occurred while fetching building data: Service Unavailable",
    );
  });

  it("fetches raw Overpass data from the raw endpoint", async () => {
    const responseBody: {
      buildingInterface: BuildingInterface;
      buildings: OverpassJson;
      indoor: OverpassJson;
    } = {
      buildingInterface: {
        boundingBox: [0, 0, 1, 1],
        feature: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 0],
              ],
            ],
          },
        },
      },
      buildings: { elements: [] },
      indoor: { elements: [] },
    };

    installMockXmlHttpRequest({
      status: 200,
      statusText: "OK",
      responseText: JSON.stringify(responseBody),
    });

    await expect(HttpService.fetchRawOverpassData("apb")).resolves.toEqual(responseBody);
  });
});

interface MockXmlHttpResponse {
  status: number;
  statusText: string;
  responseText: string;
}

function installMockXmlHttpRequest(response: MockXmlHttpResponse): void {
  class MockXMLHttpRequest {
    readyState = 0;
    status = 0;
    statusText = "";
    responseText = "";
    onreadystatechange: (() => void) | null = null;
    onerror: (() => void) | null = null;

    open(): void {}

    send(): void {
      this.readyState = 4;
      this.status = response.status;
      this.statusText = response.statusText;
      this.responseText = response.responseText;
      this.onreadystatechange?.();
    }
  }

  globalThis.XMLHttpRequest = MockXMLHttpRequest as unknown as typeof XMLHttpRequest;
}
