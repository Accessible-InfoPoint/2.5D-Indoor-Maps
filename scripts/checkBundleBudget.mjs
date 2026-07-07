import { statSync } from "node:fs";
import { join } from "node:path";

const KiB = 1024;
const distDir = join(process.cwd(), "public", "dist");

const budgets = [
  { file: "main.js", maxKiB: 1300 },
  { file: "main.css", maxKiB: 160 },
  { file: "186.js", maxKiB: 720 },
  { file: "228.js", maxKiB: 30 },
];

let failed = false;

for (const budget of budgets) {
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

if (failed) {
  process.exit(1);
}

console.log("Bundle budget check passed.");
