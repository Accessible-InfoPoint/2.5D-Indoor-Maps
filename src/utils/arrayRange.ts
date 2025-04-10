export function arrayRange(start: number, stop: number, step: number) {
    return Array.from({ length: (stop - start) / step + 1 }, (v, index) => start + index * step)
}