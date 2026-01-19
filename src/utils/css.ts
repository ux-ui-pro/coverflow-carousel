function splitCssList(v: string): string[] {
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseDurationToMs(raw: string, fallbackMs: number): number {
  const v = raw.trim();

  if (!v) return fallbackMs;

  if (v.endsWith('ms')) {
    const n = Number(v.slice(0, -2).trim());

    return Number.isFinite(n) ? n : fallbackMs;
  }

  if (v.endsWith('s')) {
    const n = Number(v.slice(0, -1).trim());

    return Number.isFinite(n) ? n * 1000 : fallbackMs;
  }

  const n = Number(v);

  return Number.isFinite(n) ? n : fallbackMs;
}

export function getTransitionMsForPropertyFromComputedStyle(
  cs: CSSStyleDeclaration,
  prop: string,
): number {
  const props = splitCssList(cs.transitionProperty);
  const durations = splitCssList(cs.transitionDuration);
  const delays = splitCssList(cs.transitionDelay);

  if (!props.length) return 0;

  const pickIndex = (p: string): number => {
    const exact = props.indexOf(p);

    if (exact >= 0) return exact;

    const hasAll = props.indexOf('all');

    if (hasAll >= 0) return hasAll;

    return -1;
  };

  const idx = pickIndex(prop);

  if (idx < 0) return 0;

  const durRaw = durations[Math.min(idx, durations.length - 1)] ?? '0s';
  const delRaw = delays[Math.min(idx, delays.length - 1)] ?? '0s';

  const dur = parseDurationToMs(durRaw, 0);
  const del = parseDurationToMs(delRaw, 0);

  return Math.max(0, dur + del);
}

export function getTransitionMsForProperty(el: HTMLElement, prop: string): number {
  const cs = getComputedStyle(el);

  return getTransitionMsForPropertyFromComputedStyle(cs, prop);
}
