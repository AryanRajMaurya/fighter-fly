# fighter · fly

A standalone rebuild of the UI8 Forge fragment **"fighter"** — the pixel-art
fighter jet you reach at `remix.ui8.ai/fly`.

Sprite-stacked jet over stacked islands, drawn into one low-resolution pixel
buffer and scaled up with hard pixels. No engine.

## Fly it

- **Space** — overhead → chase → cockpit
- **Mouse** — steer; click rolls; hold fires the thrusters
- **Arrows / WASD** — fly, **Shift** — boost
- **Gamepad** — left stick flies, Cross rolls, R2 thrusters, Triangle changes view
- **Touch** — drag to steer, tap to roll, on-screen View / Boost buttons

Extras: **F** fullscreen, **R** reset to the original look, **H** toggle the panel.
Every setting is written to the URL hash, so a look can be copied and shared.

The **Controls** button (top right) opens all 34 settings from the original
fragment, in the same sections, with the same ranges and defaults. On a phone
the panel becomes a bottom sheet.

## Run locally

Open `index.html` in a browser — it is a plain classic script, so it works off
the filesystem. Or:

```sh
python3 -m http.server 8000   # → http://localhost:8000
```

`dist/fighter-fly.html` is the same site as one self-contained file (CSS and JS
inlined) for dropping on any static host.

## Source

```
index.html  styles.css  app.js      the built site
src/app.ts                        harness: canvas loop, input, help line, panel
src/story.ts                      the 34 controls, their ranges and defaults
src/lib/scene.ts                the renderer
src/lib/jet-model.ts              the jet: 13 slices of 34×46 px, RLE → base64
src/lib/cockpit.ts                cockpit art
src/lib/flame-layer.ts            smooth thruster flames (WebGL overlay)
```

Rebuild with:

```sh
bun build src/app.ts --target browser --outfile app.js
```

## Credits

Inspired by the UI8 Forge fragment **"fighter"** by its original author —
scene code and jet model are used unchanged from
[forge.ui8.ai/share/frag_1eb8944c-57b1-42ca-a909-5c2d7e517c24](https://forge.ui8.ai/share/frag_1eb8944c-57b1-42ca-a909-5c2d7e517c24).
Rebuilt here as a standalone page; not affiliated with UI8.
