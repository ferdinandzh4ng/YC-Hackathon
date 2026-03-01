/**
 * Takes an array of ratings from multiple profiles scraping the same site
 * and returns the average plus count. Ignores null/undefined and invalid numbers.
 */
export function averageProfileRatings(
  ratings: (number | null | undefined)[]
): { average: number; count: number } {
  const valid = ratings.filter(
    (r): r is number =>
      typeof r === "number" && !Number.isNaN(r) && r >= 0 && r <= 5
  );
  if (valid.length === 0) {
    return { average: 0, count: 0 };
  }
  const sum = valid.reduce((a, b) => a + b, 0);
  const average = Math.round((sum / valid.length) * 10) / 10; // 1 decimal
  return { average, count: valid.length };
}
