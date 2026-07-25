import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";
import path from "node:path";
import { OverpassDataRouteOptions } from "../../server/overpassDataRoute";
import { createApp } from "../../server/app";

describe("server API", () => {
  it("reports health status", async () => {
    await withFixtureServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/health`);
      const body = (await response.json()) as { status: string };

      expect(response.status).toBe(200);
      expect(body).toEqual({ status: "ok" });
    });
  });

  it("logs completed requests", async () => {
    const logger = jest.fn();

    await withFixtureServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/health`);
      await response.text();

      expect(logger).toHaveBeenCalledWith(expect.stringMatching(/^GET \/api\/health 200 \d+ms$/));
    }, logger);
  });

  it("returns raw Overpass data for the configured building source", async () => {
    await withFixtureServer(
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/buildings/fixture/overpass`);
        const body = (await response.json()) as RawOverpassResponse;

        expect(response.status).toBe(200);
        expect(body.buildingInterface.id).toBe("way/10");
        expect(body.buildingInterface.boundingBox).toEqual([0, 0, 10, 10]);
        expect(body.buildingInterface.outlineGeometry.type).toBe("Polygon");
        expect(body.buildings.elements.map((element) => `${element.type}/${element.id}`)).toEqual([
          "node/1",
          "node/2",
          "node/3",
          "node/4",
          "way/10",
        ]);
        expect(body.indoor.elements.map((element) => `${element.type}/${element.id}`)).toEqual([
          "node/100",
          "node/102",
          "node/103",
          "node/104",
          "way/20",
        ]);
      },
      jest.fn(),
      {
        buildingsDataPath: path.resolve(process.cwd(), "test/server/fixtures/raw-buildings.json"),
        indoorDataPath: path.resolve(process.cwd(), "test/server/fixtures/raw-indoor.json"),
      },
    );
  });

  it("returns a 404 for unknown buildings", async () => {
    await withFixtureServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/buildings/unknown/overpass`);
      const body = (await response.json()) as ApiErrorResponse;

      expect(response.status).toBe(404);
      expect(body).toEqual({
        error: {
          code: "unknown_building",
          message: 'Unknown building "unknown".',
          details: {
            building: "unknown",
          },
        },
      });
    });
  });

  it("returns a structured error when cached indoor data is unavailable", async () => {
    await withFixtureServer(
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/buildings/fixture/overpass`);
        const body = (await response.json()) as ApiErrorResponse;

        expect(response.status).toBe(500);
        expect(body.error.code).toBe("cached_overpass_data_unavailable");
        expect(body.error.message).toContain("missing-indoor.json");
        expect(body.error.details).toEqual({
          building: "fixture",
        });
      },
      jest.fn(),
      {
        buildingsDataPath: path.resolve(process.cwd(), "test/server/fixtures/raw-buildings.json"),
        indoorDataPath: path.resolve(process.cwd(), "test/server/fixtures/missing-indoor.json"),
      },
    );
  });
});

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

interface RawOverpassResponse {
  buildingInterface: {
    id: string;
    boundingBox: number[];
    outlineGeometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  };
  buildings: {
    elements: Array<{ type: string; id: number }>;
  };
  indoor: {
    elements: Array<{ type: string; id: number }>;
  };
}

async function withFixtureServer(
  callback: (baseUrl: string) => Promise<void>,
  logger = jest.fn(),
  overpassDataOptions: Partial<OverpassDataRouteOptions> = {},
): Promise<void> {
  const app = createApp({
    overpassData: {
      buildingsDataPath: path.resolve(process.cwd(), "test/server/fixtures/raw-buildings.json"),
      indoorDataPath: path.resolve(process.cwd(), "test/server/fixtures/raw-indoor.json"),
      buildingDefinitions: {
        fixture: {
          SEARCH_STRING: "Fixture Building",
          BEARING_CALC_NODE1: "100",
          BEARING_CALC_NODE2: "missing",
        },
      },
      ...overpassDataOptions,
    },
    requestLogger: logger,
  });
  const server = createServer(app as Parameters<typeof createServer>[0]);

  await listen(server);
  try {
    const address = server.address() as AddressInfo;
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await close(server);
  }
}

function listen(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
