export const MOBILE_BREAKPOINT_PX = 767.98;
export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT_PX}px)`;

export function isMobileWidth(widthPx: number): boolean {
  return widthPx <= MOBILE_BREAKPOINT_PX;
}
