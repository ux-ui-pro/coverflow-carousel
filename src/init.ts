import type { CoverflowCarouselElement } from './element/CoverflowCarouselElement';

export type InitCoverflowCarouselsOptions = {
  selector?: string;
  onReady?: (el: HTMLElement, detail: { index: number; length: number }) => void;
  onChange?: (el: HTMLElement, detail: { index: number; length: number }) => void;
  onScratchComplete?: (
    el: HTMLElement,
    detail: { index: number; length: number; percent: number },
  ) => void;
  stylesheet?: CSSStyleSheet | string | null;
};

export function initCoverflowCarousels(options: InitCoverflowCarouselsOptions = {}): HTMLElement[] {
  const {
    selector = 'coverflow-carousel',
    onReady,
    onChange,
    onScratchComplete,
    stylesheet,
  } = options;
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));

  if (onReady || onChange || onScratchComplete) {
    elements.forEach((el) => {
      if (onReady) {
        el.addEventListener('coverflow-carousel:ready', (e) => {
          const ev = e as CustomEvent<{ index: number; length: number }>;

          onReady(el, ev.detail);
        });
      }

      if (onChange) {
        el.addEventListener('coverflow-carousel:change', (e) => {
          const ev = e as CustomEvent<{ index: number; length: number }>;

          onChange(el, ev.detail);
        });
      }

      if (onScratchComplete) {
        el.addEventListener('coverflow-carousel:scratch-complete', (e) => {
          const ev = e as CustomEvent<{ index: number; length: number; percent: number }>;

          onScratchComplete(el, ev.detail);
        });
      }
    });
  }

  if (stylesheet) {
    elements.forEach((el) => {
      const cfc = el as unknown as CoverflowCarouselElement;

      if (typeof stylesheet === 'string') cfc.adoptStyles(stylesheet);
      else cfc.adoptStylesheet(stylesheet);
    });
  }

  return elements;
}
