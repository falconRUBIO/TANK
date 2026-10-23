# Tako Tank: Loading Screen

Screenshots: `docs/audit/loading/`. Check: `node tools/loading_check.mjs` (passes).

## The animation
- **0–0.5 s:** deep teal water, with the TAKO TANK wordmark already in place (wide-tracked, a thin rule under it, no waves or bubbles). The reef is faint.
- **0.5–1.5 s:**
  - Two light shafts fade in and sway slowly.
  - About 30 small square motes drift upward, matching the tank's low-poly look.
  - The reef and sand come up to full strength.
- **1.5–3.4 s:** a low-poly octopus rises from behind the middle rock until only its head and eyes show. Its slit pupils look one way, then the other. It blinks and sinks back.
- **After that:** seaweed sways, and now and then a dark fish silhouette crosses in the distance. No character loops.
- **Variations:** the first open always plays the standard peek. Later opens rotate through four versions:
  - the standard peek
  - a look to one side with a double blink, while one arm tip curls over the rock
  - a shorter peek showing just the eyes
  - no octopus at all
- **Reduced motion:** everything is shown still, and the octopus and fish are left out.

## Asset reuse and performance
- **No WebGL, no images, no fonts to download.**
  - The scene is inline SVG, CSS animation and one small 2D canvas for the motes.
  - The wordmark uses a system font stack: Avenir Next, then Futura.
  - Everything is in `index.html`, so it appears before three.js or any game code downloads.
- **Size:** about 9 KB of HTML and CSS.
- **No aquarium is rendered twice:** the motes stop and the screen is removed (display: none) 0.5 s after the fade.
- The real tank's shaders compile behind the cover during its first frames.

## Loading stages (real, in order)
| Status line | What is actually happening |
|---|---|
| Waking up the cove… | Page shown; game code downloading |
| Finding your tank… | Sign-in and tank lookup (`runOnboarding`) |
| Checking on your friends… | Waiting for the shared tank's server snapshot (animals, decorations, shells, progress) |
| Bringing the reef to life… | Building the 3D scene |

- **No percentages and no progress bar.** A slow start shows "Still reaching the cove…" after 12 s while the scene keeps moving.
- **Failure handling:**
  - If the snapshot hasn't arrived within 30 s, or anything fails to start, a plain reason and a **Try again** button appear.
  - When offline, it says so, and it reloads by itself once the connection is back.
  - There is a 40 s overall limit, so nobody is ever left on the screen indefinitely.

## Transition
- The tank is revealed only after the server snapshot has arrived **and three full frames have been drawn**, so there is no empty tank and no pop-in.
- The cover then fades over 420 ms into the live tank. There is no splash afterward.
- **The octopus never delays entry:** if loading finishes at 0.8 s, the fade simply cuts the sequence short.

## Sound
None. The browser won't play audio before the first touch, and a startup sound wasn't wanted.

## Tested here (headless Chromium)
- The sequence at 0.2, 1.4, 2.1, 2.6 and 4.6 s
- Screen sizes: 320×568, 390×844 and 430×932
- Reduced motion
- A real start: fades only after boot and is gone afterward
- The failure screen

**Not tested here:** a real iPhone (Dynamic Island, smoothness), warm vs cold launch, background and foreground during loading, and real slow or offline networks. Those need your phone.
