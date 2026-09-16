import { type } from './tokens';

// SAMARKAN is not on Google Fonts (google/fonts#5798 was never actioned) and no package like
// @expo-google-fonts/samarkan exists. The human may drop the real TTF at
// mobile-1/assets/fonts/Samarkan.ttf; if it's absent we fall back to Yatra One, the closest
// legitimate Devanagari-styled Latin display face that IS on Google Fonts. This resolves at
// module load, synchronously, so it never depends on an async fetch succeeding.
export let display = 'YatraOne_400Regular';
export const extraFonts: Record<string, unknown> = {};

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  extraFonts.Samarkan = require('../assets/fonts/Samarkan.ttf');
  display = 'Samarkan';
} catch {
  // file not shipped — stay on Yatra One
}

// theme/tokens.ts ships `display` pre-set to the Yatra One fallback; patch it here once we know
// whether the real Samarkan.ttf shipped, so every screen reading `type.display` gets the right
// family without needing to import theme/fonts.ts directly.
type.display.fontFamily = display;
