import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const KiB = 1024;
const distDir = join(process.cwd(), "public", "dist");

const requiredAssetBudgets = [
  { file: "main.js", maxKiB: 1300 },
  { file: "main.css", maxKiB: 160 },
  { file: "437.js", maxKiB: 560 }, // Three.js
  { file: "704.js", maxKiB: 25 }, // 3D indoor layer
  { file: "maplibre-gl-shared.mjs", maxKiB: 500 },
  { file: "maplibre-gl-worker.mjs", maxKiB: 30 },
];

const maxAuxiliaryChunkKiB = 10;
let failed = false;

for (const budget of requiredAssetBudgets) {
  const filePath = join(distDir, budget.file);
  let sizeKiB;

  try {
    sizeKiB = statSync(filePath).size / KiB;
  } catch {
    console.error(
      `${budget.file} is missing. Run npm run build before checking the bundle budget.`,
    );
    failed = true;
    continue;
  }

  const result = `${budget.file}: ${sizeKiB.toFixed(1)} KiB / ${budget.maxKiB} KiB`;

  if (sizeKiB > budget.maxKiB) {
    console.error(`Bundle budget exceeded: ${result}`);
    failed = true;
  } else {
    console.log(result);
  }
}

const requiredFiles = new Set(requiredAssetBudgets.map((budget) => budget.file));
const auxiliaryChunks = readdirSync(distDir).filter(
  (file) =>
    /\.(?:js|mjs)$/.test(file) && !file.endsWith(".LICENSE.txt") && !requiredFiles.has(file),
);

for (const file of auxiliaryChunks) {
  const sizeKiB = statSync(join(distDir, file)).size / KiB;
  const result = `${file}: ${sizeKiB.toFixed(1)} KiB / ${maxAuxiliaryChunkKiB} KiB`;

  if (sizeKiB > maxAuxiliaryChunkKiB) {
    console.error(`Bundle budget exceeded: ${result}`);
    failed = true;
  } else {
    console.log(result);
  }
}

if (failed) {
  process.exit(1);
}

console.log("Bundle budget check passed.");
