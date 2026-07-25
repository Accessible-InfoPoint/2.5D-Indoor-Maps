import compression from "compression";
import express, { Application } from "express";
import { OverpassDataRouteOptions, registerOverpassDataRoute } from "./overpassDataRoute";
import { registerHealthRoute } from "./healthRoute";
import { resolveProjectPath } from "./paths";
import { registerRequestLogger, RequestLogger } from "./requestLogger";

export interface CreateAppOptions {
  overpassData?: OverpassDataRouteOptions;
  requestLogger?: RequestLogger;
  staticRoot?: string;
}

export function createApp(options: CreateAppOptions = {}): Application {
  const app = express();

  app.use(compression());
  registerRequestLogger(app, options.requestLogger);
  app.use(express.json());
  registerHealthRoute(app);
  registerOverpassDataRoute(app, options.overpassData);
  app.use(express.static(options.staticRoot ?? resolveProjectPath("public")));

  return app;
}
