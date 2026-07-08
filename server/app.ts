import compression from "compression";
import express from "express";
import {
  FilteredIndoorDataRouteOptions,
  registerFilteredIndoorDataRoute,
} from "./filteredIndoorDataRoute";
import { registerHealthRoute } from "./healthRoute";
import { resolveProjectPath } from "./paths";
import { registerRequestLogger, RequestLogger } from "./requestLogger";

export interface CreateAppOptions {
  filteredIndoorData?: FilteredIndoorDataRouteOptions;
  requestLogger?: RequestLogger;
  staticRoot?: string;
}

export function createApp(options: CreateAppOptions = {}): ReturnType<typeof express> {
  const app = express();

  app.use(compression());
  registerRequestLogger(app, options.requestLogger);
  app.use(express.json());
  registerHealthRoute(app);
  registerFilteredIndoorDataRoute(app, options.filteredIndoorData);
  app.use(express.static(options.staticRoot ?? resolveProjectPath("public")));

  return app;
}
