import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";
import path from "node:path";
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

  it("returns indoor data filtered to the configured building bounds", async () => {
    await withFixtureServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/buildings/fixture/indoor`);
      const body = (await response.json()) as GeoJSONResponse;

      expect(response.status).toBe(200);
      expect(body.buildingInterface.boundingBox).toEqual([0, 0, 10, 10]);
      expect(body.geoJson.features.map((feature) => feature.id)).toEqual(["indoor/inside-room"]);
    });
  });

  it("returns a 404 for unknown buildings", async () => {
    await withFixtureServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/buildings/unknown/indoor`);
      const body = (await response.json()) as { error: string };

      expect(response.status).toBe(404);
      expect(body.error).toBe('Unknown building "unknown".');
    });
  });
});

interface GeoJSONResponse {
  buildingInterface: {
    boundingBox: number[];
  };
  geoJson: GeoJSON.FeatureCollection;
}

async function withFixtureServer(callback: (baseUrl: string) => Promise<void>): Promise<void> {
  const app = createApp({
    filteredIndoorData: {
      buildingsDataPath: path.resolve(process.cwd(), "test/server/fixtures/buildings.json"),
      indoorDataPath: path.resolve(process.cwd(), "test/server/fixtures/indoor.json"),
      buildingDefinitions: {
        fixture: {
          SEARCH_STRING: "Fixture Building",
        },
      },
    },
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
