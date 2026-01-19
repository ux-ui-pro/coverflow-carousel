import {
  DEFAULT_CSS_TEXT_RAW,
  DEFAULT_STYLESHEET,
  makeConstructableSheet,
  type StylesInput,
  supportsAdoptedStyleSheets,
} from '../styles';
import { getTransitionMsForPropertyFromComputedStyle, parseDurationToMs } from '../utils/css';
import { hasBoolAttr, prefersReducedMotion, readIntAttr, readStringAttr } from '../utils/dom';
import { circularDelta, normalizeIndex } from '../utils/math';

const HALF_WINDOW = 1;

let INSTANCE_SEQ = 0;

interface CardState {
  index: number;
  delta: number;
  abs: number;
  isVisible: boolean;
  isActive: boolean;
}

export class CoverflowCarouselElement extends HTMLElement {
  static defaultStylesheet: CSSStyleSheet | null = DEFAULT_STYLESHEET;

  static observedAttributes = [
    'start-index',
    'index',
    'show-dots',
    'show-arrows',
    'announce-changes',
  ];

  private readonly shadow = this.attachShadow({ mode: 'open' });

  private readonly instanceId = `cfc-${++INSTANCE_SEQ}`;

  private rootEl!: HTMLElement;
  private trackEl!: HTMLElement;
  private dotsEl!: HTMLElement;
  private prevBtn!: HTMLButtonElement;
  private nextBtn!: HTMLButtonElement;
  private liveRegion!: HTMLElement;

  private styleEl: HTMLStyleElement | null = null;

  private cards: HTMLElement[] = [];
  private dots: HTMLElement[] = [];

  private currentIndex = 0;

  private isAnimating = false;

  private hasAppliedInitialLayout = false;
  private lastLayoutIndex: number | null = null;
  private lastVisibleSet: Set<number> = new Set();

  private pendingAnimToken = 0;
  private animFallbackTimerId: number | null = null;

  private cleanup: Array<() => void> = [];

  private reflectGuard = false;

  connectedCallback(): void {
    this.render();
    this.readAttributes({ isInit: true });
    this.refresh();
  }

  disconnectedCallback(): void {
    this.destroy();
  }

  attributeChangedCallback(
    _name: string,
    _oldValue: string | null,
    _newValue: string | null,
  ): void {
    if (!this.isConnected) return;
    if (this.reflectGuard) return;

    this.readAttributes({ isInit: false });

    const indexAttr = readStringAttr(this, 'index');

    if (indexAttr != null) {
      const next = normalizeIndex(Number(indexAttr), this.cards.length);

      if (Number.isFinite(next) && next !== this.currentIndex) {
        this.goTo(next);

        return;
      }
    }

    this.applyLayoutAndA11y({ announce: true, emitChange: false });
  }

  public next(): void {
    this.goTo(this.currentIndex + 1);
  }

  public prev(): void {
    this.goTo(this.currentIndex - 1);
  }

  public goTo(index: number): void {
    if (this.isAnimating) return;

    const nextIndex = normalizeIndex(index, this.cards.length);

    if (nextIndex === this.currentIndex) return;

    this.isAnimating = true;
    this.currentIndex = nextIndex;

    this.reflectIndexAttr();

    this.applyLayoutAndA11y({ announce: true, emitChange: true });
    this.lockUntilTransitionEnd();
  }

  public refresh(): void {
    this.rebuildCardsFromLightDom();

    const startIndex = readIntAttr(this, 'start-index', 0);
    const indexAttr = readStringAttr(this, 'index');

    const baseIndex = indexAttr != null ? Number(indexAttr) : startIndex;
    const safeIndex = Number.isFinite(baseIndex) ? baseIndex : 0;

    this.currentIndex = normalizeIndex(safeIndex, this.cards.length);

    this.reflectIndexAttr();

    this.buildDots();

    this.hasAppliedInitialLayout = false;
    this.lastLayoutIndex = null;
    this.lastVisibleSet = new Set();

    this.applyLayoutAndA11y({ announce: true, emitChange: false });
    this.dispatchReady();
  }

  public destroy(): void {
    if (this.animFallbackTimerId !== null) {
      window.clearTimeout(this.animFallbackTimerId);

      this.animFallbackTimerId = null;
    }

    this.cleanup.forEach((fn) => {
      fn();
    });

    this.cleanup = [];

    this.isAnimating = false;
  }

  public adoptStylesheet(sheet: CSSStyleSheet): void {
    this.applyStyles(sheet);
  }

  public adoptStyles(styles: StylesInput): void {
    this.applyStyles(styles);
  }

  private readAttributes(opts: { isInit: boolean }): void {
    if (!this.rootEl) this.render();

    const showArrows = hasBoolAttr(this, 'show-arrows', false);
    const showDots = hasBoolAttr(this, 'show-dots', false);

    this.prevBtn.style.display = showArrows ? '' : 'none';
    this.nextBtn.style.display = showArrows ? '' : 'none';
    this.dotsEl.style.display = showDots ? '' : 'none';

    const label = this.getAttribute('aria-label');

    if (label) this.rootEl.setAttribute('aria-label', label);

    if (opts.isInit) {
      this.setAttribute('aria-roledescription', 'carousel');
    }
  }

  private render(): void {
    this.applyStyles(null);

    this.rootEl = document.createElement('div');
    this.rootEl.className = 'cfc';

    this.trackEl = document.createElement('div');
    this.trackEl.className = 'cfc__track';

    this.prevBtn = document.createElement('button');
    this.prevBtn.type = 'button';
    this.prevBtn.className = 'cfc__arrow cfc__arrow--left';
    this.prevBtn.setAttribute('aria-label', 'Previous');
    this.prevBtn.textContent = '‹';

    this.nextBtn = document.createElement('button');
    this.nextBtn.type = 'button';
    this.nextBtn.className = 'cfc__arrow cfc__arrow--right';
    this.nextBtn.setAttribute('aria-label', 'Next');
    this.nextBtn.textContent = '›';

    this.dotsEl = document.createElement('div');
    this.dotsEl.className = 'cfc__dots';

    this.liveRegion = document.createElement('div');
    this.liveRegion.className = 'cfc__sr';
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');

    this.rootEl.append(this.trackEl, this.prevBtn, this.nextBtn, this.dotsEl, this.liveRegion);

    this.shadow.innerHTML = '';

    if (this.styleEl) this.shadow.append(this.styleEl);

    this.shadow.append(this.rootEl);

    this.bindEvents();
  }

  private bindEvents(): void {
    this.cleanup.forEach((fn) => {
      fn();
    });

    this.cleanup = [];

    const onPrev = () => this.prev();
    const onNext = () => this.next();

    this.prevBtn.addEventListener('click', onPrev);
    this.nextBtn.addEventListener('click', onNext);

    this.cleanup.push(() => this.prevBtn.removeEventListener('click', onPrev));
    this.cleanup.push(() => this.nextBtn.removeEventListener('click', onNext));

    const onTransitionEnd = (e: TransitionEvent) => {
      if (!this.isAnimating) return;
      if (e.propertyName !== 'transform') return;
      if (!(e.target instanceof HTMLElement)) return;

      const active = this.cards[this.currentIndex];

      if (!active) return;
      if (e.target !== active) return;

      this.unlockAnimation();
    };

    this.rootEl.addEventListener('transitionend', onTransitionEnd);
    this.cleanup.push(() => this.rootEl.removeEventListener('transitionend', onTransitionEnd));

    const onScratchComplete = (e: Event) => {
      const target = e.target;

      if (!(target instanceof HTMLElement)) return;
      if (target.tagName !== 'SCRATCH-REVEAL') return;

      const composedPath = (e as Event & { composedPath?: () => EventTarget[] }).composedPath?.();

      if (!composedPath?.length) return;

      const card = composedPath.find(
        (n): n is HTMLElement =>
          n instanceof HTMLElement &&
          n.classList.contains('cfc__card') &&
          n.dataset.cfcIndex != null,
      );

      if (!card) return;

      const index = Number(card.dataset.cfcIndex);

      if (!Number.isFinite(index)) return;

      const detailFromScratch = (e as CustomEvent<{ percent?: number }>).detail;
      const percent = detailFromScratch?.percent ?? 100;

      this.dispatchEvent(
        new CustomEvent('coverflow-carousel:scratch-complete', {
          detail: { index, length: this.cards.length, percent },
          bubbles: true,
          composed: true,
        }),
      );
    };

    this.rootEl.addEventListener('complete', onScratchComplete as EventListener);
    this.cleanup.push(() =>
      this.rootEl.removeEventListener('complete', onScratchComplete as EventListener),
    );
  }

  private rebuildCardsFromLightDom(): void {
    const existingCards = Array.from(this.trackEl.children).filter(
      (n): n is HTMLElement => n instanceof HTMLElement && n.classList.contains('cfc__card'),
    );

    const existingSlides: HTMLElement[] = [];

    existingCards.forEach((card) => {
      const slide = card.firstElementChild;

      if (slide instanceof HTMLElement) existingSlides.push(slide);
    });

    const newLightDomSlides = Array.from(this.children).filter(
      (n): n is HTMLElement => n instanceof HTMLElement,
    );

    const slides = [...existingSlides, ...newLightDomSlides];

    const nextCards: HTMLElement[] = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const card = existingCards[i] ?? document.createElement('div');

      if (!existingCards[i]) {
        card.className = 'cfc__card';

        this.trackEl.append(card);
      }

      if (card.firstElementChild !== slide) {
        card.replaceChildren(slide);
      }

      nextCards.push(card);
    }

    for (let i = slides.length; i < existingCards.length; i++) {
      existingCards[i]?.remove();
    }

    this.cards = nextCards;

    this.hasAppliedInitialLayout = false;
    this.lastLayoutIndex = null;
    this.lastVisibleSet = new Set();
  }

  private getVisibleSet(): Set<number> {
    const n = this.cards.length;
    const set = new Set<number>();

    if (n <= 0) return set;

    const maxAbs = Math.floor(n / 2);

    if (HALF_WINDOW >= maxAbs) {
      for (let i = 0; i < n; i++) set.add(i);

      return set;
    }

    for (let d = -HALF_WINDOW; d <= HALF_WINDOW; d++) {
      set.add(normalizeIndex(this.currentIndex + d, n));
    }

    return set;
  }

  private buildDots(): void {
    const existingDots = Array.from(this.dotsEl.children).filter(
      (n): n is HTMLElement => n instanceof HTMLElement && n.classList.contains('cfc__dot'),
    );

    const showDots = hasBoolAttr(this, 'show-dots', false);

    if (!showDots) {
      existingDots.forEach((d) => {
        d.remove();
      });

      this.dots = [];

      return;
    }

    const nextDots: HTMLElement[] = [];
    const needed = this.cards.length;

    for (let i = 0; i < needed; i++) {
      const dot = existingDots[i] ?? document.createElement('span');

      if (!existingDots[i]) {
        this.dotsEl.append(dot);
      }

      dot.className = 'cfc__dot';
      dot.setAttribute('aria-hidden', 'true');

      nextDots.push(dot);
    }

    for (let i = needed; i < existingDots.length; i++) {
      existingDots[i]?.remove();
    }

    this.dots = nextDots;
    this.updateDotsVisualState();
  }

  private computeCardState(i: number): CardState {
    const n = this.cards.length;

    const delta = circularDelta(this.currentIndex, i, n);
    const abs = Math.abs(delta);

    return {
      index: i,
      delta,
      abs,
      isVisible: abs <= HALF_WINDOW,
      isActive: i === this.currentIndex,
    };
  }

  private applyCardState(card: HTMLElement, state: CardState): void {
    card.setAttribute('aria-hidden', state.isVisible ? 'false' : 'true');
    card.dataset.active = state.isActive ? 'true' : 'false';
    card.dataset.cfcIndex = String(state.index);

    card.setAttribute('role', 'group');
    card.setAttribute('aria-roledescription', 'slide');
    card.setAttribute('aria-setsize', String(this.cards.length));
    card.setAttribute('aria-posinset', String(state.index + 1));

    const slideId = `${this.instanceId}-slide-${state.index}`;

    card.id = slideId;

    const nextDelta = String(state.delta);
    const nextAbs = String(state.abs);

    const prevDelta = card.dataset.cfcDelta;
    const prevAbs = card.dataset.cfcAbs;

    if (prevDelta !== nextDelta) {
      card.style.setProperty('--cfc-delta', nextDelta);
      card.dataset.cfcDelta = nextDelta;
    }

    if (prevAbs !== nextAbs) {
      card.style.setProperty('--cfc-abs', nextAbs);
      card.dataset.cfcAbs = nextAbs;
    }
  }

  private applyLayoutAndA11y(opts: { announce: boolean; emitChange: boolean }): void {
    if (!this.cards.length) return;

    if (!this.hasAppliedInitialLayout) {
      for (let i = 0; i < this.cards.length; i++) {
        const card = this.cards[i];

        if (!card) continue;

        const state = this.computeCardState(i);

        this.applyCardState(card, state);
      }

      this.hasAppliedInitialLayout = true;
      this.lastLayoutIndex = this.currentIndex;
      this.lastVisibleSet = this.getVisibleSet();
    } else {
      const nextVisibleSet = this.getVisibleSet();
      const toUpdate = new Set<number>();

      this.lastVisibleSet.forEach((i) => {
        toUpdate.add(i);
      });

      nextVisibleSet.forEach((i) => {
        toUpdate.add(i);
      });

      if (this.lastLayoutIndex != null) toUpdate.add(this.lastLayoutIndex);

      toUpdate.add(this.currentIndex);

      toUpdate.forEach((i) => {
        const card = this.cards[i];

        if (!card) return;

        const state = this.computeCardState(i);

        this.applyCardState(card, state);
      });

      this.lastLayoutIndex = this.currentIndex;
      this.lastVisibleSet = nextVisibleSet;
    }

    this.updateDotsVisualState();

    if (opts.announce && hasBoolAttr(this, 'announce-changes', true)) {
      this.announce(`Slide ${this.currentIndex + 1} of ${this.cards.length}`);
    }

    if (opts.emitChange) {
      this.emitChange();
    }
  }

  private updateDotsVisualState(): void {
    if (!this.dots.length) return;

    for (let i = 0; i < this.dots.length; i++) {
      const dot = this.dots[i];
      const isActive = i === this.currentIndex;

      dot.dataset.active = isActive ? 'true' : 'false';
    }
  }

  private lockUntilTransitionEnd(): void {
    this.pendingAnimToken++;

    const token = this.pendingAnimToken;

    if (prefersReducedMotion()) {
      this.unlockAnimation();

      return;
    }

    const active = this.cards[this.currentIndex];

    if (!active) {
      this.unlockAnimation();

      return;
    }

    const cs = getComputedStyle(active);
    const ms = getTransitionMsForPropertyFromComputedStyle(cs, 'transform');

    if (ms <= 0) {
      this.unlockAnimation();

      return;
    }

    const fallbackBase = parseDurationToMs(cs.getPropertyValue('--cfc-transition-ms').trim(), 400);

    const bufferMs = 60;
    const fallbackMs = Math.max(ms, fallbackBase) + bufferMs;

    if (this.animFallbackTimerId !== null) {
      window.clearTimeout(this.animFallbackTimerId);
    }

    this.animFallbackTimerId = window.setTimeout(() => {
      if (this.pendingAnimToken === token) {
        this.unlockAnimation();
      }
    }, fallbackMs);
  }

  private unlockAnimation(): void {
    this.isAnimating = false;

    if (this.animFallbackTimerId !== null) {
      window.clearTimeout(this.animFallbackTimerId);

      this.animFallbackTimerId = null;
    }
  }

  private emitChange(): void {
    this.dispatchEvent(
      new CustomEvent('coverflow-carousel:change', {
        detail: { index: this.currentIndex, length: this.cards.length },
      }),
    );
  }

  private dispatchReady(): void {
    this.dispatchEvent(
      new CustomEvent('coverflow-carousel:ready', {
        detail: { index: this.currentIndex, length: this.cards.length },
      }),
    );
  }

  private announce(text: string): void {
    this.liveRegion.textContent = '';

    queueMicrotask(() => {
      this.liveRegion.textContent = text;
    });
  }

  private reflectIndexAttr(): void {
    this.reflectGuard = true;

    try {
      this.setAttribute('index', String(this.currentIndex));
    } finally {
      this.reflectGuard = false;
    }
  }

  private applyStyles(styles: StylesInput): void {
    if (typeof styles === 'string') {
      if (supportsAdoptedStyleSheets(this.shadow)) {
        const sheet = makeConstructableSheet(styles);

        if (sheet) {
          this.shadow.adoptedStyleSheets = [sheet];
          this.styleEl = null;

          return;
        }
      }

      if (!this.styleEl) this.styleEl = document.createElement('style');

      this.styleEl.textContent = styles;

      return;
    }

    if (styles && supportsAdoptedStyleSheets(this.shadow)) {
      this.shadow.adoptedStyleSheets = [styles];
      this.styleEl = null;

      return;
    }

    if (CoverflowCarouselElement.defaultStylesheet && supportsAdoptedStyleSheets(this.shadow)) {
      this.shadow.adoptedStyleSheets = [CoverflowCarouselElement.defaultStylesheet];
      this.styleEl = null;

      return;
    }

    if (!this.styleEl) this.styleEl = document.createElement('style');

    this.styleEl.textContent = DEFAULT_CSS_TEXT_RAW;
  }
}
