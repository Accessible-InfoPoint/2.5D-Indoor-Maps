import { promises as fs } from "node:fs";
import path from "node:path";
import { Jimp } from "jimp";
import { COLOR_PROFILE_FOLDER, PATTERN_FILL_IMAGES_FOLDER, SETTINGS_PATH } from "./constants";
import { resolveProjectPath } from "./paths";

type JimpImage = InstanceType<typeof Jimp>;
type ColorKey = "roomColor" | "roomColorS" | "toiletColor" | "stairsColor";
type ColorProfile = Record<ColorKey, string>;
type PatternSize = "small" | "medium" | "large";
type PngFileName = `${string}.png`;

const patternSizes: Array<[size: number, name: PatternSize]> = [
  [10, "small"],
  [12, "medium"],
  [14, "large"],
];
const colorKeys: ColorKey[] = ["roomColor", "roomColorS", "toiletColor", "stairsColor"];

export async function createPatternFillImages(): Promise<void> {
  console.log("=== Creating PatternFill Images ===");

  const settings = JSON.parse(
    await fs.readFile(resolveProjectPath(SETTINGS_PATH), "utf8"),
  ) as Record<string, number>;
  const fillOpacity = Math.floor(settings.FILL_OPACITY * 255)
    .toString(16)
    .padStart(2, "0");
  const colorProfileFolder = resolveProjectPath(COLOR_PROFILE_FOLDER);
  const files = (await fs.readdir(colorProfileFolder)).filter((file) => file.endsWith(".json"));
  const writeTasks: Array<Promise<void>> = [];

  for (const file of files) {
    const data = JSON.parse(
      await fs.readFile(path.join(colorProfileFolder, file), "utf8"),
    ) as ColorProfile;
    const profileName = file == "default.json" ? "none" : path.basename(file, ".json");

    for (const [size, patternSize] of patternSizes) {
      for (const colorKey of colorKeys) {
        writeTasks.push(
          writePatternImage(data, fillOpacity, profileName, patternSize, colorKey, size),
        );
      }
    }
  }

  await Promise.all(writeTasks);

  await writeBlankPatternImage();
  console.log("...done.");
}

async function writePatternImage(
  data: ColorProfile,
  fillOpacity: string,
  profileName: string,
  patternSize: PatternSize,
  colorKey: ColorKey,
  size: number,
): Promise<void> {
  const image = new Jimp({ width: size, height: size });
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      if (isPatternPixel(x, y, size, patternSize)) {
        image.setPixelColor(0xff, x, y);
      } else {
        image.setPixelColor(parseInt(data[colorKey].replace("#", "0x") + fillOpacity, 16), x, y);
      }
    }
  }

  await writeImage(image, `${profileName}_${patternSize}_${colorKey}.png`);
}

function isPatternPixel(x: number, y: number, size: number, patternSize: PatternSize): boolean {
  return (
    x == size - 1 - y ||
    (["medium", "large"].includes(patternSize) && x == size - 2 - y) ||
    (["medium", "large"].includes(patternSize) && x == size - y) ||
    (patternSize == "large" && x == size - 3 - y) ||
    (patternSize == "large" && x == size + 1 - y) ||
    (["medium", "large"].includes(patternSize) && [0, 2 * size - 2].includes(x + y)) ||
    (patternSize == "large" && [1, 2 * size - 3].includes(x + y))
  );
}

async function writeBlankPatternImage(): Promise<void> {
  const image = new Jimp({ width: 10, height: 10 });
  for (let x = 0; x < 10; x++) {
    for (let y = 0; y < 10; y++) {
      image.setPixelColor(x == 9 - y ? 0xff : 0xffffffff, x, y);
    }
  }

  await writeImage(image, "blank.png");
}

async function writeImage(image: JimpImage, fileName: PngFileName): Promise<void> {
  const outputPath = resolveProjectPath(PATTERN_FILL_IMAGES_FOLDER, fileName);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await image.write(outputPath as `${string}.${string}`);
}
