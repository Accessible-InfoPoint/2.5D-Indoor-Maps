interface HealthRouteApp {
  get(path: string, handler: (_request: unknown, response: HealthRouteResponse) => void): void;
}

interface HealthRouteResponse {
  json: (body: unknown) => void;
}

export function registerHealthRoute(app: HealthRouteApp): void {
  app.get("/api/health", (_request: unknown, response: HealthRouteResponse) => {
    response.json({
      status: "ok",
    });
  });
}
