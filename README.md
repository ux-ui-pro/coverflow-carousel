<p align="center"><strong>coverflow-carousel</strong></p>

<div align="center">
<p align="center">CoverflowCarousel is a tiny “coverflow”-style Web Component carousel. It registers <code>&lt;coverflow-carousel&gt;</code>, renders its children as a 3D card stack, is controlled via attributes, and dispatches events on ready and slide change.</p>

[![npm](https://img.shields.io/npm/v/coverflow-carousel.svg?colorB=brightgreen)](https://www.npmjs.com/package/coverflow-carousel)
[![GitHub package version](https://img.shields.io/github/package-json/v/ux-ui-pro/coverflow-carousel.svg)](https://github.com/ux-ui-pro/coverflow-carousel)
[![NPM Downloads](https://img.shields.io/npm/dm/coverflow-carousel.svg?style=flat)](https://www.npmjs.org/package/coverflow-carousel)

<a href="https://codepen.io/ux-ui/pen/qENrydj">Demo</a>
</div>
<br>

# Install
```console
yarn add coverflow-carousel
```
<br>

# Import
```javascript
import { registerCoverflowCarouselElement, initCoverflowCarousels } from 'coverflow-carousel';
registerCoverflowCarouselElement();
```
<br>

# Usage
```javascript
// After registerCoverflowCarouselElement(), the element is registered.
// Then just use <coverflow-carousel> in your HTML (see below).
```

<sub>HTML: basic example</sub>
```html
<coverflow-carousel
  start-index="0"
  aria-label="Coverflow carousel"
>
  <img src="/images/1.jpg" alt="" />
  <img src="/images/2.jpg" alt="" />
  <img src="/images/3.jpg" alt="" />
  <img src="/images/4.jpg" alt="" />
  <img src="/images/5.jpg" alt="" />
</coverflow-carousel>
```

<sub>JS: subscribe to events + optional styles</sub>
```javascript
import {
  registerCoverflowCarouselElement,
  initCoverflowCarousels,
  coverflowCarouselCssText,
} from 'coverflow-carousel';

registerCoverflowCarouselElement();

initCoverflowCarousels({
  selector: 'coverflow-carousel',
  onReady: (el, detail) => {
    // detail: { index, length }
    el.classList.add('is-ready');
    console.log('ready', detail);
  },
  onChange: (_el, detail) => {
    console.log('change', detail);
  },
  onScratchComplete: (el, detail) => {
    // detail: { index, length, percent }
    console.log('scratch complete', detail);

    // Example sequence: auto-advance first 2, then finish on 3rd.
    if (detail.index === 0) (el as any).goTo?.(1);
    else if (detail.index === 1) (el as any).goTo?.(2);
    else if (detail.index === 2) console.log('final');
  },
  // Optional styles:
  // - CSSStyleSheet (constructable stylesheet)
  // - string (e.g. imported via ?raw)
  // stylesheet: coverflowCarouselCssText,
  //
  // Optional overrides (applied on top of the base stylesheet):
  // styleOverrides: `
  //   .cfc { --cfc-card-ar-num: 1.6; }
  //   .cfc__arrow { background: Black; }
  // `,
});
```

<sub>JS: custom styles from `?raw` (CSS/SCSS)</sub>
```javascript
import { registerCoverflowCarouselElement, initCoverflowCarousels } from 'coverflow-carousel';
import MyCfcCss from './assets/cfc.custom.css?raw';
import MyCfcOverrides from './assets/cfc.overrides.css?raw';

registerCoverflowCarouselElement();

initCoverflowCarousels({
  stylesheet: MyCfcCss,
  styleOverrides: MyCfcOverrides,
});
```

<sub>JS: default styles shipped with the package</sub>
```javascript
import {
  registerCoverflowCarouselElement,
  initCoverflowCarousels,
  coverflowCarouselCssText,
} from 'coverflow-carousel';

registerCoverflowCarouselElement();

initCoverflowCarousels({
  stylesheet: coverflowCarouselCssText,
});
```

<sub>CSS: override CSS variables (recommended for simple tweaks)</sub>
```css
coverflow-carousel {
  --cfc-card-ar-num: 1.6;
}
```

<sub>JS: manual control (prev/next/goTo/refresh)</sub>
```javascript
import { registerCoverflowCarouselElement } from 'coverflow-carousel';

registerCoverflowCarouselElement();

const el = document.querySelector('coverflow-carousel');
// @ts-expect-error: methods exist on the custom element instance after import
el?.prev();
// @ts-expect-error
el?.next();
// @ts-expect-error
el?.goTo(2);
// @ts-expect-error: if you added/removed slides dynamically — call refresh()
el?.refresh();
```
<br>

# Options
| Option (attribute) |   Type    | Default | Description                                                                                                                                    |
|:------------------:|:---------:|:-------:|:-----------------------------------------------------------------------------------------------------------------------------------------------|
|   `start-index`    | `number`  |   `0`   | Start index if `index` is not set.                                                                                                             |
|      `index`       | `number`  |    —    | Current index. If you update it externally, the carousel will animate to it. The component also reflects the current value back into `index`.  |
|    `show-dots`     | `boolean` | `false` | Shows pagination dots (decorative, non-interactive).                                                                                           |
|   `show-arrows`    | `boolean` | `false` | Shows Prev/Next arrows.                                                                                                                        |
| `announce-changes` | `boolean` | `true`  | Enables slide-change announcements via live-region (a11y).                                                                                     |

<br>

# Events
| Event                                 | Detail                                               | Description                                                                                 |
|---------------------------------------|------------------------------------------------------|---------------------------------------------------------------------------------------------|
| `coverflow-carousel:ready`            | `{ index: number, length: number }`                  | Fired after the first `refresh()` (when slides are built and layout/a11y is applied).       |
| `coverflow-carousel:change`           | `{ index: number, length: number }`                  | Fired on active slide change via `prev/next/goTo` (and when `index` is updated externally). |
| `coverflow-carousel:scratch-complete` | `{ index: number, length: number, percent: number }` | Fired when a descendant `<scratch-reveal>` dispatches `complete` for a slide.               |

<br>

# API Methods
| Method                                                                                                                        | Description                                                                                                                                                                                                                                                                        |
|-------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `initCoverflowCarousels({ selector?, onReady?, onChange?, onScratchComplete?, stylesheet?, styleOverrides? }): HTMLElement[]` | Finds elements by `selector` (default: `coverflow-carousel`), optionally subscribes to `ready/change/scratch-complete` events, and optionally applies styles to each element (`stylesheet?: CSSStyleSheet \| string \| null`, `styleOverrides?: CSSStyleSheet \| string \| null`). |
| `prev(): void`                                                                                                                | Go to the previous slide (circular).                                                                                                                                                                                                                                               |
| `next(): void`                                                                                                                | Go to the next slide (circular).                                                                                                                                                                                                                                                   |
| `goTo(index: number): void`                                                                                                   | Go to the given index (circular normalization). While animating, repeated transitions are ignored.                                                                                                                                                                                 |
| `refresh(): void`                                                                                                             | Rebuilds cards from current `children` (useful after dynamic changes) and dispatches `coverflow-carousel:ready`.                                                                                                                                                                   |
| `destroy(): void`                                                                                                             | Removes event handlers and cancels animation-related timers.                                                                                                                                                                                                                       |
| `adoptStylesheet(sheet: CSSStyleSheet): void`                                                                                 | Applies a stylesheet via `adoptedStyleSheets` (when supported).                                                                                                                                                                                                                    |
| `adoptStyles(styles: CSSStyleSheet \| string \| null): void`                                                                  | Applies styles: string via `adoptedStyleSheets` (when possible) or `<style>` fallback in the shadow root; `null` restores the package default styles.                                                                                                                              |
| `adoptStyleOverrides(styles: CSSStyleSheet \| string \| null): void`                                                          | Applies an additional "overlay" stylesheet on top of the current base styles (useful for small tweaks like CSS variables).                                                                                                                                                         |

<br>

# Notes
- Slides come from *light DOM* and are projected via named `<slot>` elements; children remain in light DOM.
- The component observes light-DOM changes (children + attributes) and coalesces `refresh()` calls in a microtask.
- For the coverflow effect, it’s recommended to have **at least 3** slides.
- While a transition is running, new transitions are ignored (anti-spam guard).
- `prefers-reduced-motion` is respected: when enabled, the animation lock is released without waiting for `transitionend`.
- The carousel always shows **3 visible cards** (center + neighbors).
- By default, arrows and dots are hidden. Add `show-arrows` / `show-dots` attributes to show them.
- Transition speed and easing are controlled via CSS variables `--cfc-transition-ms` and `--cfc-easing`.

<br>

# License
MIT
