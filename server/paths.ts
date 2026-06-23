import path from "node:path";

const projectRoot = path.resolve(__dirname, "../../..");

export function resolveProjectPath(...segments: string[]): string {
  return path.resolve(projectRoot, ...segments);
}
