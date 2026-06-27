export type OpacityExpression = ["*", ["coalesce", ["get", string], number], number];
export type PatternExpression = ["get", string];
export type ZoomOpacityExpression = [
  "interpolate",
  ["linear"],
  ["zoom"],
  number,
  number,
  number,
  number
];

export const ROOM_NUMBER_FADE_START_ZOOM = 18.8;
export const ROOM_NUMBER_FADE_END_ZOOM = 19.3;

export function getStyleString(
  style: Record<string, unknown>,
  key: string,
  fallback: string
): string {
  const value = style[key];

  return typeof value == "string" ? value : fallback;
}

export function getStyleNumber(
  style: Record<string, unknown>,
  key: string,
  fallback: number
): number {
  const value = style[key];

  return typeof value == "number" ? value : fallback;
}

export function getStyleNumberArray(
  style: Record<string, unknown>,
  key: string,
  fallback: number[]
): number[] {
  const value = style[key];

  return Array.isArray(value) && value.every((item) => typeof item == "number")
    ? value
    : fallback;
}

export function getOpacityExpression(
  propertyName: string,
  opacity: number
): OpacityExpression {
  return [
    "*",
    ["coalesce", ["get", propertyName], 1],
    opacity,
  ];
}

export function getPatternExpression(propertyName: string): PatternExpression {
  return ["get", propertyName];
}

export function getZoomOpacityExpression(opacity: number): ZoomOpacityExpression {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    ROOM_NUMBER_FADE_START_ZOOM,
    0,
    ROOM_NUMBER_FADE_END_ZOOM,
    opacity,
  ];
}
