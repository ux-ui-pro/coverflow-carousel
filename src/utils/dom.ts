export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

export function hasBoolAttr(el: HTMLElement, name: string, defaultValue: boolean): boolean {
  if (!el.hasAttribute(name)) return defaultValue;

  const raw = el.getAttribute(name);

  if (raw == null || raw === '') return true;

  return raw !== 'false';
}

export function readIntAttr(el: HTMLElement, name: string, fallback: number): number {
  const raw = el.getAttribute(name);

  if (raw == null) return fallback;

  const n = Number(raw.trim());

  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function readStringAttr(el: HTMLElement, name: string): string | null {
  const raw = el.getAttribute(name);

  if (raw == null) return null;

  const v = raw.trim();

  return v ? v : null;
}
