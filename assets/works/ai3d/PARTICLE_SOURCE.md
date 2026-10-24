# Liangzhu particle cover

`liangzhu-particles.ply` contains 180,000 display points sampled from the project's original 2,000,000-point Marble scene, **Terraced Rice Paddies Farmstead**:

https://marble.worldlabs.ai/world/d73fdf51-3e4e-4151-baf6-7a2625e9b8fa

The recovered original SPZ has SHA-256:

`0b19d77418a08038c097e813ddf3998ad983e6fb02ff66e24888f55ba7b2a717`

The derived binary little-endian PLY includes XYZ, RGB and alpha (16 bytes per vertex). It contains sampled base colors and positions, without Gaussian scale, rotation or spherical harmonics. The renderer flips Y for display, fades distant/sky points and animates the points in a shader. The original full SPZ remains separately preserved; this PLY is not a lossless Gaussian backup.

`particle-cover.js` and `particle-cover.css` are specific to `sections/ai3d.html`. They use native WebGL with no CDN or runtime library, follow the existing `portfolio:language` event and preserve the site's shared theme, font and navigation. They pause drawing when the cover is outside the viewport or the page is hidden. Reduced-motion preferences disable autoplay. Mobile rendering uses a lower point and pixel budget; vertical scrolling and native pinch zoom remain available.

The cover's local controls are translated within this page's script, so no shared translation file needs to change.
