# Extracted design data — Phase 0b recon

## Scale factor

Every frame's artboard is **1080 × 1920px** (Frame 35 is 1080 × 2057, same width, taller for
scrollable content). 1080 is not a raw point value — it's a 3x-density Android export of a
**360dp-wide** baseline frame (`1080 / 3 = 360`, `1920 / 3 = 640`).

**Scale factor: divide every raw SVG coordinate by 3** to get the dp/pt value to use in React
Native layout (`StyleSheet` numbers, `space.*`, `radius.*`). A 360dp-wide baseline is close
enough to a typical phone's logical width (iPhone: 390–393pt, common Android: 360–412dp) that
using it directly, without further re-scaling, is correct for this app — RN layout is flex-based
and reflows to the actual device width regardless.

## ⚠️ Text is outlined — no font-family/size/weight/letter-spacing data in the SVGs

`grep -roE 'font-family="[^"]*"' frames/*/*.svg` and the matching greps for `font-size`,
`font-weight`, and `letter-spacing` all return **zero matches** across all 7 SVGs. Every frame
has `0` `<text>` elements and dozens of `<path>` elements instead — Figma exported all text as
outlined vector paths. This is exactly the case the brief calls out in §3b: **falling back to
the PNG references + the §4 token table**, not guessing at font metrics from the vector paths.

Compounding this: real PNG exports exist only for **Frame 3** and **Frame 24** (ad-hoc phone
screenshots, not full-resolution Figma exports). **Frames 23, 34, 35, 36, 38 have no PNG at
all** — confirmed via `find frames -type f`. So for 5 of 7 screens there is currently no
pixel reference to screenshot-diff against in Phase 6, only the shape/color/radius data minable
from the outlined SVGs below. This is noted in `UI_NOTES.md` as an open gap — more PNG exports
from Figma would improve Phase 6 fidelity for those 5 screens.

Typography values (`type.*` in tokens.ts) are therefore **judgment calls**, not extracted facts:
geometric sans, likely `Poppins`, `Outfit`, or `DM Sans` per the brief's suggested candidates.
Chose in Phase 2 and recorded in `UI_NOTES.md`.

## Fill colors (all `fill="..."` values across all 7 SVGs, by count)

```
 74  #E6396E   <- by far the most-used ink/accent color: buttons, active tab, icon strokes+fills,
                  headers, and (since no separate darker ink hex exists anywhere) also the
                  color used for headings/body text rendered as outlined paths
 30  white     <- base/safe-area underlay rect in several frames (34,35,36,38), not user-visible
                  ground color (it sits *under* the pink/cream rects, not over them)
 29  #FDEFDE   <- cream: splash bg (Frame 3), permission-screen bg (Frame 24), header bars and
                  card fills in Frame 23/36/38
  7  none      <- (not a color; unfilled paths, e.g. compound stroke-only shapes)
  7  #F8CBC8   <- primary app background pink (confirmed as the full-canvas rect in Frames 23,
                  34, 35, 38 via `<rect width="1080" height="1920" fill="#F8CBC8"/>`)
  3  #DE0303   <- delayed/error red
  2  #FFD0D8   <- lighter pink, used inside the Frame 24 pin-in-heart illustration only
  2  #006929   <- on-time green (primary — used twice)
  1  #12750E   <- on-time green (secondary/near-duplicate shade, likely a stroke variant of the
                  same green; #006929 wins as the token value, higher count)
```

Stroke colors track the same palette: `#E6396E` (12+11+7+6+6+1 = 43 uses, icon/border strokes),
`#006929` (2, Frame 34 only).

**No separate "muted/secondary text" hex exists.** Muted text and hairlines are done with
`fill-opacity` on the same colors, not a distinct color:
`fill-opacity` values found: `0.19, 0.2, 0.23, 0.27, 0.44, 0.64, 0.76, 0.83` (mostly on `#E6396E`
and `#FDEFDE`). Use `~0.6` opacity on `crimson`/`maroon` as the `maroonMuted` derivation, and a
low opacity (`~0.2–0.27`) tint for hairlines (`line`).

## Resulting color mapping (feeds `tokens.ts`)

| token | hex | source |
|---|---|---|
| `colors.pink` | `#F8CBC8` | full-canvas background rect, 4 frames |
| `colors.cream` | `#FDEFDE` | splash/permission bg + card fills, 29 uses |
| `colors.pinkDeep` / `colors.crimson` | `#E6396E` | dominant accent, 74 fill + 43 stroke uses — used for buttons, active states, AND text/headings (no separate ink hex exists) |
| `colors.maroon` (body text) | `#E6396E` at full opacity | same hex as crimson — the frames don't distinguish a separate darker ink; kept as one token so a future correction is a one-line change |
| `colors.maroonMuted` | `#E6396E` @ ~60% opacity | derived from the `fill-opacity` values found (0.44–0.83 cluster) |
| `colors.onTime` | `#006929` | Frame 34, 2 uses (vs. 1 use of `#12750E`) |
| `colors.delayed` | `#DE0303` | Frame 34/35, 3 uses |
| `colors.line` (hairlines) | `#E6396E` @ ~20–27% opacity | lowest opacity cluster (0.19–0.27) |
| `colors.white` | `#FFFFFF` | base rect underlay |

No hex found for a color named exactly in the brief's placeholder table (`#FAF0DF`, `#9E1B32`,
`#6E2233`, `#A0707C`, `#5FB45F`, `#F0A9B4`, `#E4B9C0`) — the brief's own table was explicitly
flagged there as "eyeballed from a compressed screenshot, fallback only." The values above,
mined directly from the SVG source, supersede it per the brief's own instruction.

## Corner radii (`rx="..."` across all SVGs, raw px → ÷3 → dp)

```
raw px : 8.5   9    15   18   19.5  20    24   30   40    40.5  49    50    56.47  65    102  113.96  206
÷3 dp  : 2.8   3    5    6    6.5   6.7   8    10   13.3  13.5  16.3  16.7  18.8   21.7  34   38      68.7
```

Bucketed for `radius.*`:
- `radius.sm` ≈ 6dp (chips, small pills, status dots) — cluster at 5–8dp raw÷3
- `radius.md` ≈ 16dp (buttons, input fields) — cluster at 13–19dp raw÷3
- `radius.lg` ≈ 34dp (cards, hero panels) — cluster at 21–38dp raw÷3 (the 102/113.96 raw values,
  ÷3 = 34/38, are the big cream card corners in Frame 3/24)
- `radius.pill` = 999 (full round — buttons sized by height/2, not a fixed rx; the raw 206
  value, ÷3 = 68.7dp, is a large circular badge/avatar, not a pill button)

## Stroke widths (`stroke-width="..."`, raw px → ÷3 → dp)

```
raw px : 3    4    5    6    10
÷3 dp  : 1    1.3  1.7  2    3.3
```
Use 1dp for hairlines, ~2dp for emphasized borders (timeline rail, card outline), ~3dp for the
thick decorative strokes (timeline dots, icon rings).

## Artboard sizes (for reference)

| Frame | raw px | ÷3 dp |
|---|---|---|
| 3 | 1080 × 1920 | 360 × 640 |
| 23 | 1080 × 1920 | 360 × 640 |
| 24 | 1080 × 1920 | 360 × 640 |
| 34 | 1080 × 1920 | 360 × 640 |
| 35 | 1080 × 2057 | 360 × 685.7 (scrollable content, taller than viewport) |
| 36 | 1080 × 1920 | 360 × 640 |
| 38 | 1080 × 1920 | 360 × 640 |

## Fonts / illustration assets on disk

- `frames/fonts/Samarkan.ttf` — **not present**. Yatra One (Google Fonts) fallback per brief §5 is mandatory, not optional, until/unless the human drops the TTF in.
- `frames/assets/` — **does not exist**. No isolated wordmark/illustration exports. Only raw
  material: `frames/frame 3/Group 1.png` (pink scalloped card shape, transparent bg, usable) and
  `frames/frame 3/_ (32) 1.png` (loco illustration — **has a visible "adobestock" watermark
  tiled across it per `frames/Claude outputs/FRAMES_FOLDER_SETUP.md`, do not ship this file**).
  Illustrations for Splash (loco) and LocationPermission (pin-in-heart) will be built as simple
  flat-color `react-native-svg` primitives (circles/paths matching the outlined shapes in the
  SVG source) rather than shipping the watermarked stock asset, per that doc's suggested
  fallback #3 ("trace/simplify it yourself as a flat 2-colour icon").
