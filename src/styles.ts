import DEFAULT_CSS_TEXT from './coverflow-carousel.css?raw';

export const coverflowCarouselCssText: string = DEFAULT_CSS_TEXT;

export type StylesInput = CSSStyleSheet | string | null | undefined;

export function supportsAdoptedStyleSheets(root: ShadowRoot): boolean {
  return 'adoptedStyleSheets' in root;
}

export function makeConstructableSheet(cssText: string): CSSStyleSheet | null {
  try {
    const sheet = new CSSStyleSheet();

    sheet.replaceSync(cssText);

    return sheet;
  } catch {
    return null;
  }
}

export const DEFAULT_STYLESHEET: CSSStyleSheet | null = makeConstructableSheet(DEFAULT_CSS_TEXT);

export const DEFAULT_CSS_TEXT_RAW: string = DEFAULT_CSS_TEXT;
