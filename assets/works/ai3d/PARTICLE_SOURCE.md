# Liangzhu particle cover

`liangzhu-village.ply` contains 480,000 display points sampled from the project's original 2,000,000-point Marble scene, **Terraced Rice Paddies Farmstead**:

https://marble.worldlabs.ai/world/d73fdf51-3e4e-4151-baf6-7a2625e9b8fa

The recovered original SPZ has SHA-256:

`0b19d77418a08038c097e813ddf3998ad983e6fb02ff66e24888f55ba7b2a717`

The derived binary little-endian PLY includes XYZ, RGB and alpha (16 bytes per vertex). It contains sampled base colors and positions, without Gaussian scale, rotation or spherical harmonics. Of the retained points, 350,000 preserve detail in the forward village sector (Z > .25, |X| < Z × 1.4, radius < 16, display Y < 2); the other 130,000 preserve the surrounding world. Both groups exclude alpha ≤ 24 and use a reproducible shuffle seeded with 20261024. The renderer flips Y for display, fades distant/sky points and renders the original positions as round particles. Depth testing preserves the roof, door, rocks and terrace edges instead of overlaying opposite surfaces. The original full SPZ remains separately preserved; this PLY is not a lossless Gaussian backup. The earlier, uniformly sampled 180,000-point `liangzhu-particles.ply` remains available for older cached covers.

`particle-cover.js` and `particle-cover.css` are specific to `sections/ai3d.html`. They use native WebGL with no CDN or runtime library, follow the existing `portfolio:language` event and preserve the site's shared theme, font and navigation. Drawing runs only while the camera responds to input or the viewport changes, and stops offscreen or when the page is hidden. Reduced-motion preferences remove camera easing. Mobile rendering uses a lower pixel budget; vertical scrolling and native pinch zoom remain available.

The cover has no visible controls. Its accessible instructions and loading status are translated within this page's script, so no shared translation file needs to change.

The composition is centered on the homestead at display coordinates [0, −.3, 1.85], with distance fixed at 4 (the previous distance control's maximum) and a 44° vertical field of view (52° on narrow screens). Density is fixed at 100%: all 480,000 retained points are drawn on every screen size. Drift and scatter are both zero: the shader uses the original positions directly and has no time animation. Moving the mouse across the canvas smoothly changes the camera angle within a small arc; leaving the canvas restores its initial composition. Touchscreens retain horizontal dragging and keyboard users retain arrow-key viewpoint changes. View presets, distance adjustment, pause/play and double-click scatter are removed. The `#liangzhu-particle-cover` anchor links directly to the cover.
