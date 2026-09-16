// Design tokens mined from frames/**/*.svg — see theme/EXTRACTED.md for the raw counts
// and reasoning behind every value below. No other file in this app may contain a literal
// hex, font size, or border radius — everything routes through here.

export const colors = {
  // ground
  cream: '#FDEFDE', // splash / permission background, card fill
  pink: '#F8CBC8', // primary app background
  pinkDeep: '#E6396E', // buttons, active tab, header bar, primary accent
  pinkLight: '#FFD0D8', // Frame 24 pin-in-heart illustration only
  // ink — the frames use one ink color throughout (no separate darker hex exists)
  crimson: '#E6396E', // wordmark, headings, primary text
  maroon: '#E6396E', // body text (same hex as crimson, kept distinct for future correction)
  maroonMuted: 'rgba(230, 57, 110, 0.6)', // secondary / placeholder text
  // status
  onTime: '#006929',
  delayed: '#DE0303',
  // structure
  line: 'rgba(230, 57, 110, 0.22)', // hairlines, timeline rail, input borders
  white: '#FFFFFF',
  // neutral ink — added for the TrainDetail/Track Stitch screens (train_overview.html,
  // itinerary.html), which deliberately separate brand-pink emphasis text from plain dark-gray
  // body text (gray-800/gray-500 in that file) — a real distinction the Figma frames' single
  // outlined-text color didn't capture (see EXTRACTED.md), preserved here rather than forcing
  // everything into pink.
  ink: '#1F2937',
  inkMuted: '#6B7280',
  confidence: '#059669',
  confidenceBg: 'rgba(16, 185, 129, 0.12)',
} as const;

export const radius = {
  sm: 6,
  md: 16,
  lg: 34,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

type TextStyle = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
};

// fontFamily values are resolved against theme/fonts.ts's `display` (Samarkan/Yatra One) for
// the wordmark, and the UI sans family loaded in theme/fonts.ts for everything else. Never
// pair a bare fontWeight with these — each weight is its own family name (Android trap, see
// UI_REBUILD.md Phase 2).
// `display` is resolved at runtime in theme/fonts.ts (Samarkan if the TTF ships, else Yatra One)
// — this placeholder name is overwritten by getType() below, never read directly by a screen.
export const type: Record<'display' | 'h1' | 'h2' | 'body' | 'label' | 'micro', TextStyle> = {
  display: { fontFamily: 'YatraOne_400Regular', fontSize: 40, lineHeight: 48, letterSpacing: 0 },
  h1: { fontFamily: 'Poppins_700Bold', fontSize: 24, lineHeight: 30, letterSpacing: 0 },
  h2: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, lineHeight: 24, letterSpacing: 0 },
  body: { fontFamily: 'Poppins_400Regular', fontSize: 15, lineHeight: 21, letterSpacing: 0 },
  label: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, lineHeight: 16, letterSpacing: 1.2 },
  micro: { fontFamily: 'Poppins_500Medium', fontSize: 10, lineHeight: 14, letterSpacing: 0.8 },
};

// Second palette/type scale, deliberately kept separate from `colors`/`type` above. The user's
// Stitch project (stitch.withgoogle.com, project 11448949455890968462) generated Home,
// TrainDetail's 4-tab flow (Train View/Track/Behavior/Alerts), and LiveMap as real HTML/Tailwind,
// and the explicit instruction was to use ITS palette exactly rather than reconciling it with the
// Figma-derived tokens Splash/LocationPermission already match pixel-for-pixel. Two of Stitch's
// screens (train_overview.html, livemap.html) actually reuse the Figma hexes directly
// (`colors.pinkDeep`/`pink`/`cream` above) — only home/behavior/itinerary/alerts.html use this
// Material-You-flavored scaffold, pulled verbatim from those files' own `tailwind.config` blocks.
export const stitchColors = {
  primary: '#b10b52',
  primaryContainer: '#d32f6a',
  onPrimary: '#ffffff',
  background: '#fff8f7',
  onBackground: '#26181b',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#fff0f1',
  surfaceContainer: '#ffe8eb',
  surfaceContainerHigh: '#fce2e6', // also the .arch-header fill in home.html
  surfaceVariant: '#f6dce0',
  onSurface: '#26181b',
  onSurfaceVariant: '#594045',
  outline: '#8d7075',
  outlineVariant: '#e0bec4',
  secondary: '#655d53',
  secondaryContainer: '#ece1d3',
  tertiary: '#006929', // "on time" / good-reliability green
  tertiaryContainer: '#008536',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
} as const;

// spacing scale in home.html's tailwind config is numerically identical to `space` above
// (xs/sm/md/lg/xl = 4/8/16/24/32) — reuse `space`, no separate scale needed.
export const stitchRadius = {
  sm: 4, // DEFAULT
  md: 8, // lg
  lg: 12, // xl
  pill: 999,
} as const;

export const stitchType: Record<
  'displayLg' | 'headlineLg' | 'headlineLgMobile' | 'headlineMd' | 'bodyLg' | 'bodyMd' | 'labelBold' | 'labelSm',
  TextStyle
> = {
  displayLg: { fontFamily: 'Inter_800ExtraBold', fontSize: 32, lineHeight: 40, letterSpacing: -0.64 },
  headlineLg: { fontFamily: 'Inter_700Bold', fontSize: 24, lineHeight: 32, letterSpacing: 0 },
  headlineLgMobile: { fontFamily: 'Inter_700Bold', fontSize: 22, lineHeight: 28, letterSpacing: 0 },
  headlineMd: { fontFamily: 'Inter_700Bold', fontSize: 20, lineHeight: 28, letterSpacing: 0 },
  bodyLg: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  bodyMd: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  labelBold: { fontFamily: 'Inter_700Bold', fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
  labelSm: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 16, letterSpacing: 0 },
};

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  button: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
} as const;
