// Tiny fuzzy-match for "did you mean?" - Levenshtein distance + a small
// helper to find the best match within a list.
//
// Implementation is a straightforward two-row dynamic programming scan.

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1]! + 1,
        prev[j]! + 1,
        prev[j - 1]! + cost,
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length]!;
}

export interface Match {
  candidate: string;
  distance: number;
}

export function bestMatch(needle: string, haystack: string[]): Match | null {
  if (haystack.length === 0) return null;
  let best: Match | null = null;
  for (const candidate of haystack) {
    const d = levenshtein(needle, candidate);
    if (best === null || d < best.distance) {
      best = { candidate, distance: d };
    }
  }
  return best;
}

export function topMatches(
  needle: string,
  haystack: string[],
  n: number,
): Match[] {
  return haystack
    .map((candidate) => ({ candidate, distance: levenshtein(needle, candidate) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, n);
}

/** Return matches within a max distance, sorted closest first. */
export function withinDistance(
  needle: string,
  haystack: string[],
  maxDist: number,
): Match[] {
  return topMatches(needle, haystack, haystack.length).filter(
    (m) => m.distance <= maxDist,
  );
}
