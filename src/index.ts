import { CoverflowCarouselElement } from './element/CoverflowCarouselElement';
import { initCoverflowCarousels } from './init';
import { coverflowCarouselCssText } from './styles';

export function registerCoverflowCarouselElement(tagName = 'coverflow-carousel'): void {
  if (typeof window === 'undefined' || !('customElements' in window)) return;
  if (customElements.get(tagName)) return;

  customElements.define(tagName, CoverflowCarouselElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'coverflow-carousel': CoverflowCarouselElement;
  }
}

export { coverflowCarouselCssText, initCoverflowCarousels, CoverflowCarouselElement };
