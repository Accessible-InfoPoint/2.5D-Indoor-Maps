declare module "express" {
  interface ExpressApp {
    get(path: string, handler: (...args: any[]) => unknown): void;
    use(...args: any[]): void;
    listen(port: number, callback?: () => void): unknown;
  }

  interface ExpressFactory {
    (): ExpressApp;
    static(root: string): unknown;
    json(): unknown;
  }

  const express: ExpressFactory;
  export = express;
}
