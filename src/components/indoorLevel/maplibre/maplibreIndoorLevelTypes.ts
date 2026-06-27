export interface MapLibreIndoorLevelLayerSet {
  sourceId: string;
  layerIds: string[];
}

export type LayerVisibility = "visible" | "none";

export function createLayerSet(
  level: number,
  name: string,
  layerNames: string[]
): MapLibreIndoorLevelLayerSet {
  return {
    sourceId: getSourceId(level, name),
    layerIds: layerNames.map((layerName) => getLayerId(level, name, layerName)),
  };
}

export function getSourceId(level: number, name: string): string {
  return `indoor-level-${level}-${name}`;
}

export function getLayerId(level: number, name: string, layerName: string): string {
  return `${getSourceId(level, name)}-${layerName}`;
}

export function getPatternImageId(patternFile: string): string {
  return `pattern-${sanitizeImageIdPart(patternFile)}`;
}

export function getMarkerImageId(markerFile: string): string {
  return `marker-${sanitizeImageIdPart(markerFile)}`;
}

function sanitizeImageIdPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}
