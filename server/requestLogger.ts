import { Application, RequestHandler } from "express";

export type RequestLogger = (message: string) => void;

export function registerRequestLogger(
  app: Application,
  logger: RequestLogger = console.info,
): void {
  const requestLogger: RequestHandler = (request, response, next) => {
    const startTime = Date.now();

    response.on("finish", () => {
      const method = request.method;
      const path = request.originalUrl || request.url;
      const statusCode = response.statusCode;
      const duration = Date.now() - startTime;

      logger(`${method} ${path} ${statusCode} ${duration}ms`);
    });

    next();
  };

  app.use(requestLogger);
}
