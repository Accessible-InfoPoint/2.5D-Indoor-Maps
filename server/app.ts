import compression from "compression";
import express from "express";
import {
  FilteredIndoorDataRouteOptions,
  registerFilteredIndoorDataRoute,
} from "./filteredIndoorDataRoute";
import { registerHealthRoute } from "./healthRoute";
import { resolveProjectPath } from "./paths";

export interface CreateAppOptions {
  filteredIndoorData?: FilteredIndoorDataRouteOptions;
  staticRoot?: string;
}

export function createApp(options: CreateAppOptions = {}): ReturnType<typeof express> {
  const app = express();

  app.use(compression());
  app.use(express.json());
  registerHealthRoute(app);
  registerFilteredIndoorDataRoute(app, options.filteredIndoorData);
  app.use(express.static(options.staticRoot ?? resolveProjectPath("public")));

  return app;
}
