# UI rebuild notes

Substitutions, omissions, and places the design asked for data the API doesn't return — kept
here per UI_REBUILD.md's Definition of Done rather than as inline code comments.

## Server-IP config modal — removed, superseded by auto-configuration

UI_REBUILD.md originally required this modal to survive the redesign ("without it the app cannot
reach a LAN backend from a phone"). Once `App.tsx` started auto-applying the right host at launch
(reusing `services/api.ts`'s own built-in IP auto-detection, just correcting the port — see the
comment above `setCustomHost(...)` in `App.tsx`), that requirement was satisfied without any UI
at all. Per explicit instruction ("I don't want the settings thingy in my app at all, this is a
proper user made application"), the settings-gear icon, its modal (`components/ui/ConfigModal.tsx`,
deleted), and the state wiring in `HomeScreen.tsx` are gone. Home's header is back to Stitch's
own plain centered wordmark, matching `home.html`.

If this ever needs to point at a *different* machine (not the one running the auto-detection
logic), or the deployed backend moves off the currently-hardcoded port, that now requires editing
the `BACKEND_PORT` constant in `App.tsx` — there's no in-app way to override it anymore, by
design.

## Backend wiring pass — real FastAPI server, real bugs found and fixed

Ran the actual `server/` FastAPI backend (`python3 -m uvicorn server.api.main:app --port 8001` —
port 8000 was squatted by an unrelated stray process, see below) and drove the whole app against
it end-to-end (Home search → TrainTabs → Track/Map → Behavior → Alerts → PNR → StationSearch),
rather than just visually reviewing screens. This surfaced three real bugs a visual-only pass
had missed:

1. **The map was blank on web.** `react-native-webview`'s `<WebView>` has no web implementation
   — confirmed by inspecting the DOM (zero `<iframe>` elements where it should render). Fixed by
   adopting `mobile/components/LiveTrackMap.tsx`'s own proven technique: a plain
   `<iframe srcDoc={html}>` on `Platform.OS === 'web'`, falling back to the real `WebView` native
   module everywhere else. New shared component: `components/ui/LiveMap.tsx`, used by
   `TrackScreen.tsx`'s map toggle. Also folded in that same reference file's better map
   ingredients while at it — a real route polyline built from `route_progress[].lat/lon`,
   colored station markers (departed/current/upcoming), and an animated pulsing train marker —
   rather than the single static pin the first pass shipped.
2. **The server-IP config modal (and therefore PNR) were completely unreachable from the
   rebuilt Home.** `home.html`'s own markup has no hamburger/settings affordance at all, and the
   Stitch rebuild carried that gap straight through — along with silently dropping the "Check PNR
   status" link the old segmented-tabs Home used to have, orphaning `PNRScreen.tsx` entirely.
   Both are hard requirements from UI_REBUILD.md's Definition of Done ("must survive the
   redesign" / PNR "stays functional"). Added a small settings-gear icon to `HomeScreen.tsx`'s
   header (wired to the existing `ConfigModal`) and a "Check PNR status →" link under the three
   cards — neither in the Stitch reference, both necessary so real functionality isn't lost.
3. **`ConfigModal`'s save confirmation used `Alert.alert`, which has no real web implementation
   either** — RN-web's fallback is a blocking `window.alert()` that freezes the page's JS thread
   until a human dismisses it, which very nearly looked like a frozen renderer during automated
   testing. Replaced with an inline "Connected — backend set to …" banner inside the modal that
   works identically on every platform.

**Port 8000 conflict**: an unrelated, pre-existing Python process (a plain file server for
`/Users/aryan/Public/snake-hand`, running since well before this task) was already bound to
`localhost:8000`, which is `services/api.ts`'s hardcoded default port. Per the human's explicit
choice, the real backend runs on **port 8001** instead, reached through the app's own
hamburger → "Configure backend server" modal (type `localhost:8001`, tap Connect, tap Done) —
exactly the mechanism that config modal exists for. `services/api.ts` is frozen and wasn't
touched; nothing in the app code hardcodes 8000 beyond that file's own existing default.

**Testing note**: automated clicks by DOM `<button>`/text-match index occasionally hit the wrong
element, because React Navigation keeps previously-pushed stack screens mounted (off-screen,
zero-size) rather than unmounting them — e.g. `document.querySelectorAll('button')[0]` from the
PNR screen actually matched Home's still-mounted (invisible) settings button, not PNR's own back
arrow, and looked exactly like a broken back button until caught by inspecting each button's
`aria-label` and bounding rect. Real user taps are never affected (they only ever hit whatever's
visually on top), but it's worth knowing if re-testing this way.

## Stitch project supersedes the original Home/TrainDetail/Track/LiveMap frames

Partway through, the human pointed at a Stitch project
(`stitch.withgoogle.com/projects/11448949455890968462`) as the authoritative design for
Home onward, superseding the original Figma-frame interpretation for those screens. Raw
`htmlCode` exports were pulled via the Stitch MCP and saved to `mobile-1/.stitch-ref/` (kept as
provenance — not part of the app bundle). What changed:

- **Home** — rebuilt from `home.html`: no more segmented tabs; two (now three, see below)
  stacked cards under an arch-motif "Where to?" header.
- **TrainDetail → the `TrainView` tab** — rebuilt from `train_overview.html`: confidence-gauge
  slider, Earliest/Most Probable/Latest milestone row, expandable delay-reasons card.
- **RouteTimeline + LiveTrack → merged into one `Track` tab** — rebuilt from `itinerary.html`
  (rich per-stop cards, "Track My Train" toggle) with `livemap.html`'s real Leaflet+CartoDB map
  as a local `showMap` toggle inside the same screen (the reference's "Map View" FAB), rather
  than a separate stack route — both of Stitch's own screenshots keep the same 4-tab bar visible
  underneath, which only makes sense if it's one screen swapping content, not a push.
- **Two brand-new tabs**, `Behavior` (`train_behavior.html`) and `Alerts` (`alerts.html`), that
  don't correspond to any of the original 7 Figma frames at all.
- All four live under a new `TrainTabs` bottom-tab group (`navigation/TrainTabsScreen.tsx`),
  replacing the old flat stack routes `TrainDetail`/`RouteTimeline`/`LiveTrack`. The shared
  "navarail" header + back button now live once in that wrapper instead of once per screen.

**Palette**: explicitly instructed to match Stitch's colors exactly rather than reconciling them
with the Figma-mined tokens Splash/LocationPermission already match. In practice, on inspection
most of Stitch's own exported HTML uses the *same* real hexes (`#E6396E`/`#F8CBC8`/`#FDEFDE`)
via inline `style=` overrides even where the Tailwind config scaffolding suggested otherwise —
`TrainDetail`/`Track`/`Alerts` all reuse the existing `colors` tokens for exactly that reason.
Only `Home` and `Behavior`'s source HTML consistently used a handful of genuinely different
values (a Material-You-style scaffold: `primary #b10b52`, `background #fff8f7`, plus real dark
neutrals like `#26181b` for body text that the Figma frames' single-ink-color extraction never
captured) — those live in the new `stitchColors`/`stitchType`/`stitchRadius` tokens, used only
by `HomeScreen.tsx`. Body/UI font is Inter (installed via `@expo-google-fonts/inter`) on these
screens rather than Poppins, matching that HTML's own `font-family` declarations; the "navarail"/
"Navarail" wordmark still resolves through the shared Samarkan/Yatra One `type.display` token
everywhere.

**Icons**: Material Symbols Outlined (the design's icon font) has no direct RN equivalent, so
every icon is substituted with its closest `lucide-react-native` glyph (`train`→`Train`,
`route`→`Route`, `location_on`→`MapPin`, `swap_vert`→`ArrowUpDown`, `radio_button_unchecked`→
implied by `MapPin` outline, `analytics`/`bar_chart`→`ChartColumn`/`BarChart3`,
`notifications`→`Bell`, `check`→`Check`, `warning`→`AlertTriangle`, `check_circle`→`CheckCircle2`).

**Data gaps introduced by the new screens** (same "render what's real" rule as `Platform` in
Frame 35):
- `Behavior`'s 7-day punctuality bar chart has no backing field in `ETAResponse` — only
  `historical_on_time_pct` (one rolled-up number) exists. Renders that number plus an honest
  empty state for the chart, not 7 fabricated data points.
- `Track`'s per-stop cards drop the reference's platform/halt-duration/distance-traveled figures
  — none of `platform`, `halt_min`, `distance_km` exist on `RouteStop`.
- `Alerts` has no dedicated alerts-feed endpoint. Cards are derived live from the same
  `ETAResponse` every other tab reads (current delay status, next-stop ETA, each
  `delay_reasons[]` entry) rather than the reference's fixed demo copy ("Arriving Soon" /
  "5 minutes away…" etc., which isn't computable from real data without a real GPS-distance
  calculation the API doesn't expose).
- `TrainDetail`'s Earliest/Latest milestone values reuse `confidence_90.{lower,upper}` — the
  reference shows a wider absolute bound distinct from the narrower 90%-confidence window, and
  `ETAResponse` has no separate field for that wider bound.

**Map**: `react-native-webview` was added to render `livemap.html`'s exact approach (Leaflet +
free CartoDB Voyager tiles, no API key) rather than a schematic fallback, since the Stitch
reference confirmed that's the intended look. **It renders nothing on the web preview** — the
library has no web platform implementation, confirmed by inspecting the DOM (zero `<iframe>`
elements where the WebView should be) — but works normally in Expo Go on iOS/Android, where
WebView is natively supported. This is a real, expected gap in the web-only verification loop
this environment can run; a device pass is needed to actually see the map.

**Verification**: exercised all 4 tabs plus the Home→search→TrainTabs flow end-to-end against a
throwaway local mock HTTP server (not the real FastAPI backend, which wasn't running) standing
in for `ETAResponse`/search results, confirmed via `getBoundingClientRect()`/computed-style
inspection in the browser devtools rather than screenshots for the tab bar specifically — the
screenshot tool in this environment was capped at a fixed resolution regardless of the actual
browser window size, making pixel screenshots unreliable for confirming layout below the fold;
DOM-level checks (element positions, active-tab color) confirmed correctness where screenshots
couldn't. The mock server and its `setCustomHost()` call in `App.tsx` were both removed before
finishing — nothing from that QA pass shipped in the app.

## Font substitutions

- **Wordmark (`type.display`)**: SAMARKAN is not on Google Fonts and no
  `@expo-google-fonts/samarkan` package exists (`google/fonts#5798` was never actioned). The real
  `SAMAN___.TTF` was downloaded from dafont.com (Titivillus Foundry, 1993/1995) and lives at
  `assets/fonts/Samarkan.ttf` — the app now renders the wordmark in real Samarkan, not the Yatra
  One fallback. **License note**: dafont lists it "Shareware, Personal Use" — the font's own
  README asks for a $7.50 registration fee to Ethel Enterprises if used beyond personal use; it
  does not block redistribution but flags it for whoever ships this beyond a hackathon prototype.
  `theme/fonts.ts` still falls back to Yatra One automatically if this file is ever removed — no
  code change needed either way, confirmed by a live Metro test that a missing-file `require()`
  resolves to a `null` dependency-map entry and throws at runtime inside the `try/catch`, not at
  bundle time.
- **UI sans (`h1`/`h2`/`body`/`label`/`micro`)**: the frame SVGs have all text converted to
  outline paths (`grep font-family` returns zero matches across all 7 files — see
  `theme/EXTRACTED.md`), so there is no extracted font-family string to match. Chose **Poppins**
  as the geometric sans from the brief's three suggested candidates (Poppins/Outfit/DM Sans) —
  it's the most common in Indian-travel-app UI and reads well at the rounded corner radii the
  frames use. If a human confirms a different face from the original Figma file, this is a
  one-line swap in `theme/tokens.ts`'s `type` export plus the font imports in `App.tsx`.

## Color / ink

- The frames use a **single ink hex (`#E6396E`)** for both the primary accent (buttons, active
  tab, headers) and all text/headings — there is no separate darker "text" color anywhere in the
  74 fill + 43 stroke uses mined from the SVGs. `colors.crimson` and `colors.pinkDeep` are
  therefore the same hex on purpose (see `theme/EXTRACTED.md`), not a mistake.
- **Real bug found and fixed during Phase 6 verification**: `AppHeader`'s hamburger icon
  originally used `colors.crimson` on the `colors.pinkDeep` header bar — since those are the
  same hex, the icon was invisible. Fixed to `colors.cream` (matching the wordmark, which was
  already correct). Caught by an actual screenshot, not by reading the code — this is exactly
  the class of bug Phase 6 exists to catch.
- `colors.maroonMuted` and `colors.line` are opacity-derived from `colors.crimson`
  (`rgba(230, 57, 110, 0.6)` and `0.22` respectively) rather than separate hexes, because the
  frames encode secondary/muted text and hairlines via `fill-opacity` on the same base color,
  not a distinct color value (opacity cluster: 0.19–0.83, see EXTRACTED.md).

## Illustrations

- The human added a `me/` folder at the repo root containing isolated Figma exports —
  `Group 1.png` (the Frame 3 arch/scalloped card, 844×1172) and `_ (32) 1.png` (the loco,
  912×631) among others. **Splash now uses these real raster assets** (copied to
  `assets/illustrations/splash-card.png` and `splash-loco.png`) positioned with the *exact*
  pixel coordinates read back out of `frames/frame 3/Frame 3.svg`'s own `<path>`/`<rect>` data —
  the card's path bounding box is `(118, 375, 844, 1172)` on the SVG's 1080×1920 canvas (matching
  `Group 1.png`'s own dimensions exactly), and the loco sits in a
  `<rect x="50" y="779" width="912" height="631" fill="url(#pattern...)"/>` (matching
  `_ (32) 1.png`'s own dimensions exactly). `SplashScreen.tsx` converts those four numbers to
  percentages of the 1080×1920 canvas so the layout holds at any screen size.
- `_ (32) 1.png` carries a visible tiled Adobe Stock watermark (flagged in
  `frames/Claude outputs/FRAMES_FOLDER_SETUP.md`) — shipped as-is per explicit instruction, to be
  swapped for a licensed export before this goes beyond a prototype.
- **LocationPermission (Frame 24) rebuilt the same way once the human placed the real exports in
  `FRAMES/frame 24/`**: `Group 3.png`/`Group 4.png` (the two pin illustrations), `Vector 4.png`
  (the connecting stroke), `Allow your location.png` (the heading, pre-rendered as a raster with
  its own drop shadow), `ALLOW LOCATION.png`/`MAYBE LATER.png` (button/link labels), copied to
  `assets/illustrations/`. Positions for the page card and the button pill came straight off
  `Frame 24.svg`'s own `<rect>` values; positions for the two pins came from matching each pin
  PNG's own inner light-pink-circle center (measured in the asset itself) against that same
  circle's exact `<ellipse cx cy>` in the SVG — solving for the asset's top-left corner rather
  than guessing. The connecting line's placement is the one exception: its SVG path's control-point
  bounding box doesn't match the exported asset's own crop (the stroke dips behind both pins at
  both ends, so Figma's export bounds don't equal the path's mathematical bounds), so that one
  placement is a visual match against `frames/frame 24/Screenshot ...4.05.17 PM.png` rather than
  a value read off the vector data.
- The old flat-color inline-SVG pin-in-heart placeholder (`components/ui/Illustration.tsx` +
  `SvgXml`) is gone — deleted once real assets replaced it, since nothing else used that
  component. If a future frame needs a quick placeholder before its real asset export exists,
  the pattern is easy to recreate (`SvgXml` from `react-native-svg`), just not worth keeping as
  dead code between uses.
- **Real bug found and fixed while building this screen**: react-native-web's `<Image>` does not
  derive height from a bare `aspectRatio` + percentage `width` the way native RN does — it
  silently falls back to the source asset's raw intrinsic pixel height (confirmed via
  `getBoundingClientRect()` in the browser: images were rendering at their native 487–724px
  heights regardless of the percentage width applied). Every image in both `SplashScreen.tsx` and
  `LocationPermissionScreen.tsx` therefore gets an **explicit width AND height**, both computed
  from the asset's own pixel aspect ratio, never a bare `aspectRatio` prop on `<Image>`. Caught by
  inspecting real DOM layout in Chrome, not by reading the code.
- **Second bug caught the same way**: a percentage `width`/`height` on a child is relative to its
  *immediate* parent's resolved size, not the outer canvas — the button label image was computed
  as a percentage of the full canvas width but rendered inside a button that's only ~70% of that
  canvas width, silently shrinking the label. Fixed by expressing that image's size as a
  percentage of the button's own dimensions instead.

## Data the API doesn't return

- **Platform** (Frame 35's three-up stat row: Current Station / Next Stop / Platform) does not
  exist on `ETAResponse`. Rendered as `—` in `TrainDetailScreen`, per the brief's explicit
  instruction not to add a backend field for it.

## Map (Phase 5 choice)

- Chose **option 2** from UI_REBUILD.md §8: a `react-native-svg` schematic rail with a moving
  marker (`LiveTrackScreen.tsx`), not `react-native-maps`. Zero new native dependencies, works
  in Expo Go on every platform including web. The marker's horizontal position is the train's
  index within `route_progress` (`current` stop / total stops), not a real lat/lon projection —
  same simplification the original `mobile/components/LiveTrackMap.tsx` made for its schematic
  fallback path. `LATITUDE`/`LONGITUDE` `StatChip`s below the rail are real, bound directly to
  `data.lat`/`data.lon`.

## Navigation

- The hand-rolled `useState` tab switching in the old `mobile/App.tsx` is gone. `mobile-1/App.tsx`
  uses `@react-navigation/native-stack` for the full flow (Splash → LocationPermission → Home →
  every detail screen), and `Home` itself hosts the Frame 23 segmented control
  (`components/ui/SegmentedTabs.tsx`) as local state, not a nested tab navigator — simpler, and
  the three views (By Train / Between Stations / Station Board) don't need independent
  navigation history.
- **Added `AppHeader`'s `onBackPress`** (a back chevron) partway through Phase 6: every screen
  except Home is pushed with `headerShown: false` on the native-stack navigator, which means
  there was no way to navigate back on web (no gesture, no header) until this was added. Found
  by actually clicking through the app in a browser, not by reading the navigator config.
- PNR has no frame per the brief, so no prescribed entry point either. Reachable from a text
  link ("Check PNR status →") under Home's tab content, and from a "Track this train" button
  inside the PNR result card back to `TrainDetail`.
- The server-IP config modal (`components/ui/ConfigModal.tsx`) is restyled and hangs off the
  hamburger icon in `AppHeader`, shown only on `Home` (other screens show a back arrow in that
  slot instead — see above).

## Verification (Phase 6) — what was and wasn't checked

- All 8 routes were exercised in a real browser (Chrome, via `expo start --web`) at a
  393×852-ish viewport: Splash, LocationPermission, Home (all 3 tab states), StationSearch,
  TrainDetail, RouteTimeline, LiveTrack, PNR. Screenshots are in `frames/_actual/`. No console
  errors in any of them; `npx tsc --noEmit` and `npm run lint:tokens` are both clean.
- **Only Frames 3 and 24 have a matching PNG export to diff against** (`frames/frame 3/*.png`,
  `frames/frame 24/*.png` — ad-hoc phone screenshots, not full Figma exports). Frames 23, 34,
  35, 36, 38 have no PNG at all (confirmed via `find frames -type f`), so their comparison in
  Phase 6 was against the outlined-SVG shape/color/radius data in `theme/EXTRACTED.md`, not a
  pixel reference. **More Figma PNG exports would meaningfully improve fidelity checking for
  those 5 screens** — this is a real gap, not something code can close.
- **TrainDetail, RouteTimeline, and LiveTrack could only be screenshotted in their loading
  state** — reaching them normally requires a live train result to tap from Home/StationSearch/
  PNR, which requires the FastAPI backend (`server/`) running, which it wasn't during this
  build. Per the "no mock data anywhere" rule in the Definition of Done, no fake `ETAResponse`
  was inserted to force these screens into their populated state for a screenshot. **Once
  `server/` is running, these three screens' hero/stat-row/timeline/track states still need a
  human (or a follow-up session with the backend up) to screenshot-diff against Frame 35/36/38.**
- Not yet done: a real-device Expo Go pass (safe-area insets on a notched phone, font loading on
  Android specifically, keyboard covering the Home search fields) — the brief calls this out as
  a separate finishing step after the web pass, and it requires a physical device or simulator
  this environment doesn't have.

## Known pre-existing issue in `mobile/` (not caused by this rebuild)

- `mobile/` had uncommitted working-tree changes at the start of this task — regenerated
  icon/splash PNGs and a deleted `mobile/.claude/settings.json` — that predate this session. They
  were left untouched throughout (`mobile-1/` was forked from whatever was on disk at Phase 0a),
  per instruction not to modify anything under `mobile/` or run git operations against the real
  repository. `git status` will still show `mobile/` as dirty for that pre-existing reason, not
  because of any change made while building `mobile-1/`.
