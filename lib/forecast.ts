/**
 * Lightweight, on-device forecasting helpers. No deps.
 *
 * All functions are pure and work with `number[]` series in time order
 * (oldest → newest). Used by the reports panels to project remaining-period
 * revenue, monthly trends, and per-product reorder dates.
 */

export interface Regression {
  slope: number;
  intercept: number;
  /** Coefficient of determination — 0 = noise, 1 = perfect fit. */
  r2: number;
}

/**
 * Ordinary least-squares regression on `y` against its own index (x = 0..n-1).
 * Returns {slope, intercept, r2}. r2 = 0 for empty / constant series.
 */
export function linearRegression(y: number[]): Regression {
  const n = y.length;
  if (n < 2) return { slope: 0, intercept: n === 1 ? y[0] : 0, r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += y[i];
    sumXY += i * y[i];
    sumX2 += i * i;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  const denom = sumX2 - n * meanX * meanX;
  const slope = denom === 0 ? 0 : (sumXY - n * meanX * meanY) / denom;
  const intercept = meanY - slope * meanX;

  // R²
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssTot += (y[i] - meanY) ** 2;
    ssRes += (y[i] - predicted) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

  return { slope, intercept, r2 };
}

/**
 * Simple-mean moving average over a window (default 7). Each output point is
 * the average of the window centred at that index (clamped at edges, so the
 * first and last points use a partial window).
 */
export function movingAverage(points: number[], window = 7): number[] {
  const n = points.length;
  if (n === 0) return [];
  const half = Math.floor(window / 2);
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(n - 1, i + half);
    let sum = 0;
    for (let j = lo; j <= hi; j++) sum += points[j];
    out[i] = sum / (hi - lo + 1);
  }
  return out;
}

export interface Forecast {
  /** Projected values for the next `daysAhead` time steps. */
  projected: number[];
  /** Upper confidence bound, same length as `projected`. */
  upperBand: number[];
  /** Lower confidence bound, same length as `projected`. Floored at 0. */
  lowerBand: number[];
  /** R² of the underlying regression — caller should hide the band when low. */
  r2: number;
}

/**
 * Forecast the next `daysAhead` values from a series using linear regression.
 * Confidence band = ±1.5 × stdev(residuals). lowerBand floors at 0 so revenue
 * forecasts never project negative money.
 */
export function forecastSeries(points: number[], daysAhead: number): Forecast {
  if (daysAhead <= 0 || points.length < 2) {
    return { projected: [], upperBand: [], lowerBand: [], r2: 0 };
  }
  const { slope, intercept, r2 } = linearRegression(points);

  // Residual stdev — measure of how scattered the actual points are around
  // the fit line.
  let sqSum = 0;
  for (let i = 0; i < points.length; i++) {
    const fit = slope * i + intercept;
    sqSum += (points[i] - fit) ** 2;
  }
  const stdev = Math.sqrt(sqSum / points.length);
  const halfBand = 1.5 * stdev;

  const projected: number[] = [];
  const upperBand: number[] = [];
  const lowerBand: number[] = [];
  for (let k = 1; k <= daysAhead; k++) {
    const x = points.length - 1 + k;
    const value = Math.max(0, slope * x + intercept);
    projected.push(value);
    upperBand.push(value + halfBand);
    lowerBand.push(Math.max(0, value - halfBand));
  }
  return { projected, upperBand, lowerBand, r2 };
}

/** Sum a number[] safely. */
export function sum(points: number[]): number {
  return points.reduce((s, n) => s + n, 0);
}
