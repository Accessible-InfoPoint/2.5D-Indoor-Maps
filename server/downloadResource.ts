import { transformToGeoJsonAndSaveFile } from "./transformToGeoJsonAndSaveFile";

export async function downloadResource(url: string, dest: string): Promise<void> {
  console.log("Downloading " + url);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("File could not be downloaded! (" + response.status + " - " + response.statusText + ")");
  }

  await transformToGeoJsonAndSaveFile(await response.text(), dest);
}
