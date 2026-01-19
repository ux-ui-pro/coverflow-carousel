export function normalizeIndex(index: number, length: number): number {
  if (length <= 0) return 0;

  return ((index % length) + length) % length;
}

export function circularDelta(from: number, to: number, n: number): number {
  const raw = to - from;
  const half = n / 2;

  if (raw > half) return raw - n;
  if (raw < -half) return raw + n;

  return raw;
}
