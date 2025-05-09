export function getArrayDepth(value: any[]): number {
  return Array.isArray(value) ? 1 + Math.max(...value.map(getArrayDepth).concat(0)) : 0;
}
