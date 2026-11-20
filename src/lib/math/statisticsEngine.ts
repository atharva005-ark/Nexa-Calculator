export interface StatisticsResult {
  count: number;
  sum: number;
  mean: number;
  median: number;
  mode: number[];
  min: number;
  max: number;
  range: number;
  varianceSample: number;
  variancePopulation: number;
  stdDevSample: number;
  stdDevPopulation: number;
  q1: number;
  q3: number;
  iqr: number;
  sorted: number[];
}

export function parseDataset(raw: string): { values: number[]; invalidTokens: string[] } {
  const tokens = raw
    .split(/[\s,;\n\t]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const values: number[] = [];
  const invalidTokens: string[] = [];

  for (const tok of tokens) {
    const n = Number(tok);
    if (Number.isFinite(n)) {
      values.push(n);
    } else {
      invalidTokens.push(tok);
    }
  }

  return { values, invalidTokens };
}

function medianOfSorted(arr: number[]): number {
  const mid = Math.floor(arr.length / 2);
  if (arr.length % 2 === 0) {
    return (arr[mid - 1] + arr[mid]) / 2;
  }
  return arr[mid];
}

export function computeStatistics(values: number[]): StatisticsResult {
  if (values.length === 0) {
    throw new Error('Dataset is empty. Enter at least one valid number.');
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / count;
  const median = medianOfSorted(sorted);
  const min = sorted[0];
  const max = sorted[count - 1];
  const range = max - min;

  // Mode
  const freq = new Map<number, number>();
  let maxFreq = 0;
  for (const v of sorted) {
    const f = (freq.get(v) ?? 0) + 1;
    freq.set(v, f);
    if (f > maxFreq) maxFreq = f;
  }
  const mode = maxFreq > 1 ? Array.from(freq.entries()).filter(([, f]) => f === maxFreq).map(([v]) => v) : [];

  const sqDiffSum = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0);
  const variancePopulation = sqDiffSum / count;
  const varianceSample = count > 1 ? sqDiffSum / (count - 1) : 0;
  const stdDevPopulation = Math.sqrt(variancePopulation);
  const stdDevSample = Math.sqrt(varianceSample);

  const mid = Math.floor(count / 2);
  const lowerHalf = sorted.slice(0, mid);
  const upperHalf = count % 2 === 0 ? sorted.slice(mid) : sorted.slice(mid + 1);
  const q1 = lowerHalf.length ? medianOfSorted(lowerHalf) : sorted[0];
  const q3 = upperHalf.length ? medianOfSorted(upperHalf) : sorted[count - 1];
  const iqr = q3 - q1;

  return {
    count,
    sum,
    mean,
    median,
    mode,
    min,
    max,
    range,
    varianceSample,
    variancePopulation,
    stdDevSample,
    stdDevPopulation,
    q1,
    q3,
    iqr,
    sorted,
  };
}
