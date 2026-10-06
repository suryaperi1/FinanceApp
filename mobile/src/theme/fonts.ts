import { Platform } from 'react-native';

/**
 * Font for SVG chart text. Native platforms already use the system font;
 * browsers default SVG text to a serif face, so name the system stack there.
 */
export const chartFontFamily = Platform.select({
  web: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  default: undefined,
});
