# Living Invite — Anchored WebAR Wedding/Event Invitation Engine

A printed invitation "comes alive" when scanned: a gold-framed AR experience anchors
on the real card, a film plays, then a photo gallery — camera/room visible behind
(transparent). No app. Runs in the phone browser. Free stack (MindAR + A-Frame).

## Deploy (Netlify drag-and-drop)
Drag the **inner folder that contains `index.html`** (this folder) onto netlify.com.
Open: `https://YOURSITE.netlify.app/?card=demo-emerald-5`
Preview without camera (test on laptop): add `&preview=1`

## Per-client setup (≈30–45 min)
1. Copy a `cards/demo-*` folder → rename `cards/clientname/`.
2. Replace `videos/01.mp4` (H.264 MP4, <8MB, 720p) and `gallery/01.jpg … NN.jpg` (portrait).
3. Compile `targets.mind` from a PHOTO OF THE PRINTED CARD (mindar image-target compiler) → put in the folder.
4. Edit `config.json` (names, tagline, theme, **frame**, playlist captions). Video must be the FIRST playlist item.
5. Deploy. Link is `...netlify.app/?card=clientname`.

## config.json
```json
{
  "coupleNames": "Vijay & Rashmika",
  "tagline": "together forever",
  "theme": "emerald",          // emerald | sapphire
  "frame": "baroque",          // <-- FRAME NAME (see list below). Optional; default "gold"
  "targetsFile": "targets.mind",
  "playlist": [
    { "type":"video", "src":"videos/01.mp4", "caption":"", "section":"" },
    { "type":"photo", "src":"gallery/01.jpg", "caption":"...", "section":"..." }
  ]
}
```

## FRAME SYSTEM
Frames are swappable PNGs in `assets/`. Pick one by name with the `"frame"` field in
config.json, or test instantly with the URL param `?frame=NAME` (overrides config).

### Available frames (in `assets/frame-NAME.png`)
WEDDING
- `baroque`       — photoreal ornate carved gold + white flowers (PREMIUM showcase)
- `gold`          — classic elegant gold (default)
- `emerald-gold`  — emerald damask band + gold + lotus corners

CULTURAL / RELIGIOUS
- `peacock`       — photoreal peacocks + Ganesha + maroon damask (PREMIUM showcase, backdrop style)
- `maroon-gold`   — maroon damask band + gold lotus
- `mandala`       — emerald + gold rosette/mandala corners

BIRTHDAY
- `birthday`      — teal band + gold stars (festive)
- `birthday-royal`— navy band + gold stars (elegant)

CORPORATE
- `corporate`     — minimal gold lines + corner brackets

Examples:
`...netlify.app/?card=demo-emerald-5&frame=baroque`
`...netlify.app/?card=demo-sapphire-10&frame=peacock`

### Adding your OWN frame (no engine changes ever needed)
Every frame is a **PNG, exactly 880×1120 px**, with a **transparent center window
800×1040 px, centred** (photo/video shows through there). Outside the window may be
transparent (cut-out frame) or fully opaque (backdrop card). Keep under 300KB.
See `FRAME-TEMPLATE-spec.png` (in deliverables) for the exact guide.

Convert any artwork to a frame with the included tool:
```
python3 tools_make_frame.py myart.jpg myname --mode cutout     # ornate frame on white bg
python3 tools_make_frame.py myart.jpg myname --mode backdrop   # full decorated card
```
Then set `"frame": "myname"` in config.json (or test `?frame=myname`).

## Notes / gotchas
- Self-hosted libs in `lib/` — never switch to CDN (fails on slow WiFi).
- Filenames are case-sensitive; video must be exactly `01.mp4`, photos `01.jpg`.
- iPhone .mov/HEVC must be re-encoded to H.264 MP4 (HandBrake).
- In-app browsers (WhatsApp/Instagram) block the camera → tell guests "Open in Chrome/Brave".
- Good even lighting on the card; avoid glare.
