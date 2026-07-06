export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function getMotionDuration(duration: number): number {
  return prefersReducedMotion() ? 0 : duration;
}
