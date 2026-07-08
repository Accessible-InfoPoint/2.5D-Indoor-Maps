import { Application, Request, Response } from "express";

export function registerHealthRoute(app: Application): void {
  app.get("/api/health", (_request: Request, response: Response) => {
    response.json({
      status: "ok",
    });
  });
}
