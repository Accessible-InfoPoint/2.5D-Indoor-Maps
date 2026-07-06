export type Comparator<T> = (a: T, b: T) => number;

/**
 * Combines comparators into one, applying them in order and returning the
 * first non-zero result (or 0 if every comparator ties). Reorder the
 * arguments at the call site to change priority.
 */
export function chainComparators<T>(...comparators: Comparator<T>[]): Comparator<T> {
  return (a, b) => {
    for (const comparator of comparators) {
      const result = comparator(a, b);
      if (result !== 0) return result;
    }
    return 0;
  };
}
