# Liangzhu particle cover

`liangzhu-village.ply` contains 480,000 display points sampled from the project's original 2,000,000-point Marble scene, **Terraced Rice Paddies Farmstead**:

https://marble.worldlabs.ai/world/d73fdf51-3e4e-4151-baf6-7a2625e9b8fa

The recovered original SPZ has SHA-256:

`0b19d77418a08038c097e813ddf3998ad983e6fb02ff66e24888f55ba7b2a717`

The derived binary little-endian PLY includes XYZ, RGB and alpha (16 bytes per vertex). It contains sampled base colors and positions, without Gaussian scale, rotation or spherical harmonics. Of the retained points, 350,000 preserve detail in the forward village sector (Z > .25, |X| < Z × 1.4, radius < 16, display Y < 2); the other 130,000 preserve the surrounding world. Both groups exclude alpha ≤ 24 and use a reproducible shuffle seeded with 20261024. The renderer flips Y for display, fades distant/sky points and animates the points in a shader. Depth testing preserves the roof, door, rocks and terrace edges instead of overlaying opposite surfaces. The original full SPZ remains separately preserved; this PLY is not a lossless Gaussian backup. The earlier, uniformly sampled 180,000-point `liangzhu-particles.ply` remains available for older cached covers.

`particle-cover.js` and `particle-cover.css` are specific to `sections/ai3d.html`. They use native WebGL with no CDN or runtime library, follow the existing `portfolio:language` event and preserve the site's shared theme, font and navigation. They pause drawing when the cover is outside the viewport or the page is hidden. Reduced-motion preferences disable autoplay. Mobile rendering uses a lower point and pixel budget; vertical scrolling and native pinch zoom remain available.

The cover's local controls are translated within this page's script, so no shared translation file needs to change.

The initial view is a close-up of the homestead, centered on display coordinates [0, −.3, 1.85], with distance 1.75 and a 44° vertical field of view (52° on narrow screens). The close-up moves gently; Orbit stays within a small arc around the same subject. Dragging and zoom remain bounded to keep the village in view. Default density is 95%, drift 20%, scatter 4%; mobile drawing uses at most 320,000 points before the density multiplier. The `#liangzhu-particle-cover` anchor links directly to the cover. Reduced-motion preferences disable autoplay.
