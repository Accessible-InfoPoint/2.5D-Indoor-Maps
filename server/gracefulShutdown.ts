import { Server } from "node:http";

const SHUTDOWN_TIMEOUT_MS = 10_000;

export function registerGracefulShutdown(server: Server): void {
  let isShuttingDown = false;

  const shutdown = (signal: NodeJS.Signals): void => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    console.log(`Received ${signal}. Shutting down web server...`);

    const timeout = setTimeout(() => {
      console.error("Graceful shutdown timed out.");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    timeout.unref();

    server.close((error) => {
      clearTimeout(timeout);

      if (error) {
        console.error("Error while shutting down web server.", error);
        process.exitCode = 1;
        return;
      }

      console.log("Web server stopped.");
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
