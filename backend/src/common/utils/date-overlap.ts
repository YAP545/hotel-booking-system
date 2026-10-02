/**
 * Two half-open date ranges [aStart, aEnd) and [bStart, bEnd) overlap iff
 * aStart < bEnd AND aEnd > bStart. Dates are 'YYYY-MM-DD' strings, which
 * compare correctly lexicographically.
 */
export function dateRangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart;
}
