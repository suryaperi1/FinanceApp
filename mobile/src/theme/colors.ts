/**
 * Color tokens, matching the CSS custom properties in
 * Web/Red30 Tech Dashboard.html. Dark mode uses its own stepped series colors
 * (validated against the dark surface), not an automatic inversion.
 *
 * Series colors are assigned in fixed order and never cycled; text always
 * uses the text tokens, never a series color.
 */

export interface Palette {
  page: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  gridline: string;
  axis: string;
  border: string;
  accent: string;
  series: readonly [string, string, string, string];
}

export const lightPalette: Palette = {
  page: '#f9f9f7',
  surface: '#fcfcfb',
  textPrimary: '#0b0b0b',
  textSecondary: '#52514e',
  textMuted: '#898781',
  gridline: '#e1e0d9',
  axis: '#c3c2b7',
  border: 'rgba(11,11,11,0.10)',
  accent: '#2a78d6',
  series: ['#2a78d6', '#1baf7a', '#eda100', '#4a3aa7'],
};

export const darkPalette: Palette = {
  page: '#0d0d0d',
  surface: '#1a1a19',
  textPrimary: '#ffffff',
  textSecondary: '#c3c2b7',
  textMuted: '#898781',
  gridline: '#2c2c2a',
  axis: '#383835',
  border: 'rgba(255,255,255,0.10)',
  accent: '#3987e5',
  series: ['#3987e5', '#199e70', '#c98500', '#9085e9'],
};
