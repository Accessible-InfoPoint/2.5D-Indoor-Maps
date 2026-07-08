export type RequestLogger = (message: string) => void;

interface RequestLoggerApp {
  use(handler: RequestLoggerMiddleware): void;
}

interface RequestLoggerRequest {
  method?: string;
  originalUrl?: string;
  url?: string;
}

interface RequestLoggerResponse {
  statusCode?: number;
  on(event: "finish", listener: () => void): void;
}

type RequestLoggerNext = () => void;
type RequestLoggerMiddleware = (
  request: RequestLoggerRequest,
  response: RequestLoggerResponse,
  next: RequestLoggerNext,
) => void;

export function registerRequestLogger(
  app: RequestLoggerApp,
  logger: RequestLogger = console.info,
): void {
  app.use((request, response, next) => {
    const startTime = Date.now();

    response.on("finish", () => {
      const method = request.method ?? "UNKNOWN";
      const path = request.originalUrl ?? request.url ?? "/";
      const statusCode = response.statusCode ?? 0;
      const duration = Date.now() - startTime;

      logger(`${method} ${path} ${statusCode} ${duration}ms`);
    });

    next();
  });
}
