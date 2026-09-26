export const MOBILE_BREAKPOINT_PX = 767.98;
export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT_PX}px)`;

export function isMobileWidth(widthPx: number): boolean {
  return widthPx <= MOBILE_BREAKPOINT_PX;
}

export const SHORT_BREAKPOINT_PX = 767.98;
export const SHORT_MEDIA_QUERY = `(max-height: ${SHORT_BREAKPOINT_PX}px)`;

export function isShortHeight(heightPx: number): boolean {
  return heightPx <= SHORT_BREAKPOINT_PX;
}

export const LOW_HEIGHT_BREAKPOINT_PX = 600;
export const LOW_HEIGHT_MEDIA_QUERY = `(max-height: ${LOW_HEIGHT_BREAKPOINT_PX}px)`;

export function isLowHeight(heightPx: number): boolean {
  return heightPx <= LOW_HEIGHT_BREAKPOINT_PX;
}
