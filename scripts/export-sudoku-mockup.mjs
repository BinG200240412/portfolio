#!/usr/bin/env node
/* Export the editable product scene without generating or redrawing its UI.
 * Uses the existing scene geometry and original screenshots. The inverse
 * homography is sampled directly, so there are no mesh seams or affine facets.
 * Run: node scripts/export-sudoku-mockup.mjs [--base image.png] [--output image.png]
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const { createCanvas, loadImage, Path2D, ImageData } = require('@napi-rs/canvas');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const works = resolve(root, 'assets/works/sudoku');
const size = 1254;
const sourceWidth = 1320;
const sourceHeight = 2868;
const samplesPerAxis = 3;
const options = {
  base: resolve(works, 'iphone-duo-studio-black-transparent.png'),
  output: resolve(works, 'iphone-duo-sudoku-transparent.png'),
};
for (let index = 2; index < process.argv.length; index += 2) {
  const name = process.argv[index]?.replace(/^--/, '');
  if (!Object.hasOwn(options, name) || !process.argv[index + 1]) {
    throw new Error('Usage: export-sudoku-mockup.mjs [--base image.png] [--output image.png]');
  }
  options[name] = resolve(process.argv[index + 1]);
}

// Read the webpage's single source of truth without running its DOM lifecycle.
const sceneSource = await readFile(resolve(root, 'assets/sudoku-product-scene.js'), 'utf8');
function sceneLiteral(name) {
  const match = sceneSource.match(new RegExp(`  const ${name} = (\\{[\\s\\S]*?\\n  \\});`));
  if (!match) throw new Error(`Scene ${name} declaration was not found.`);
  return vm.runInNewContext(`(${match[1]})`);
}
const quads = sceneLiteral('quads');
const outlines = sceneLiteral('outlines');
const projectSource = sceneSource.match(/  function project\(quad\) \{[\s\S]*?\n  \}/)?.[0];
if (!projectSource) throw new Error('Scene project() function was not found.');
const project = vm.runInNewContext(`(${projectSource.trim()})`);

function homography(quad) {
  const values = project(quad).slice('matrix3d('.length, -1).split(',').map(Number);
  return [values[0], values[4], values[12], values[1], values[5], values[13], values[3], values[7], values[15]];
}

function inverse(matrix) {
  const [a, b, c, d, e, f, g, h, i] = matrix;
  const determinant = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(determinant) < 1e-14) throw new Error('The screen homography is singular.');
  return [
    e * i - f * h, c * h - b * i, b * f - c * e,
    f * g - d * i, a * i - c * g, c * d - a * f,
    d * h - e * g, b * g - a * h, a * e - b * d,
  ].map(value => value / determinant);
}

function apply(matrix, x, y) {
  const divisor = matrix[6] * x + matrix[7] * y + matrix[8];
  return [(matrix[0] * x + matrix[1] * y + matrix[2]) / divisor,
    (matrix[3] * x + matrix[4] * y + matrix[5]) / divisor];
}

function alignmentError(matrix, quad) {
  const corners = [[0, 0], [sourceWidth, 0], [sourceWidth, sourceHeight], [0, sourceHeight]];
  return Math.max(...corners.map(([x, y], index) => {
    const [u, v] = apply(matrix, x, y);
    return Math.hypot(u - quad[index][0], v - quad[index][1]);
  }));
}

async function projectedScreenshot(path, quad) {
  const image = await loadImage(path);
  if (image.width !== sourceWidth || image.height !== sourceHeight) {
    throw new Error(`Expected an unchanged ${sourceWidth} × ${sourceHeight} screenshot: ${path}`);
  }
  const sourceCanvas = createCanvas(sourceWidth, sourceHeight);
  const sourceContext = sourceCanvas.getContext('2d');
  sourceContext.drawImage(image, 0, 0);
  const source = sourceContext.getImageData(0, 0, sourceWidth, sourceHeight).data;
  const matrix = homography(quad);
  const inv = inverse(matrix);
  const pixels = new Uint8ClampedArray(size * size * 4);
  const minX = Math.max(0, Math.floor(Math.min(...quad.map(point => point[0]))) - 1);
  const maxX = Math.min(size, Math.ceil(Math.max(...quad.map(point => point[0]))) + 1);
  const minY = Math.max(0, Math.floor(Math.min(...quad.map(point => point[1]))) - 1);
  const maxY = Math.min(size, Math.ceil(Math.max(...quad.map(point => point[1]))) + 1);
  const sampleCount = samplesPerAxis ** 2;

  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      let red = 0, green = 0, blue = 0, alpha = 0;
      for (let sy = 0; sy < samplesPerAxis; sy++) {
        for (let sx = 0; sx < samplesPerAxis; sx++) {
          const px = x + (sx + 0.5) / samplesPerAxis;
          const py = y + (sy + 0.5) / samplesPerAxis;
          const denominator = inv[6] * px + inv[7] * py + inv[8];
          const u = (inv[0] * px + inv[1] * py + inv[2]) / denominator;
          const v = (inv[3] * px + inv[4] * py + inv[5]) / denominator;
          if (u < 0 || u > sourceWidth || v < 0 || v > sourceHeight) continue;
          const sourceX = Math.max(0, Math.min(sourceWidth - 1, u - 0.5));
          const sourceY = Math.max(0, Math.min(sourceHeight - 1, v - 0.5));
          const x0 = Math.floor(sourceX), y0 = Math.floor(sourceY);
          const x1 = Math.min(sourceWidth - 1, x0 + 1), y1 = Math.min(sourceHeight - 1, y0 + 1);
          const tx = sourceX - x0, ty = sourceY - y0;
          const indices = [(y0 * sourceWidth + x0) * 4, (y0 * sourceWidth + x1) * 4,
            (y1 * sourceWidth + x0) * 4, (y1 * sourceWidth + x1) * 4];
          const weights = [(1 - tx) * (1 - ty), tx * (1 - ty), (1 - tx) * ty, tx * ty];
          for (let index = 0; index < 4; index++) {
            const offset = indices[index];
            const weight = weights[index] * source[offset + 3] / 255;
            red += source[offset] * weight;
            green += source[offset + 1] * weight;
            blue += source[offset + 2] * weight;
            alpha += weight;
          }
        }
      }
      if (alpha === 0) continue;
      const offset = (y * size + x) * 4;
      pixels[offset] = Math.round(red / alpha);
      pixels[offset + 1] = Math.round(green / alpha);
      pixels[offset + 2] = Math.round(blue / alpha);
      pixels[offset + 3] = Math.round(alpha / sampleCount * 255);
    }
  }
  const canvas = createCanvas(size, size);
  canvas.getContext('2d').putImageData(new ImageData(pixels, size, size), 0, 0);
  return { canvas, error: alignmentError(matrix, quad) };
}

const base = await loadImage(options.base);
if (base.width !== size || base.height !== size) throw new Error(`Expected a ${size} × ${size} base image.`);
const canvas = createCanvas(size, size);
const context = canvas.getContext('2d');
context.drawImage(base, 0, 0);
const basePixels = context.getImageData(0, 0, size, size).data;
const screenMask = createCanvas(size, size);
const maskContext = screenMask.getContext('2d');
const occlusion = new Path2D(`M0 0 H${size} V${size} H0 Z ${outlines.body}`);
const errors = {};
for (const side of ['back', 'front']) {
  const screenshot = resolve(works, side === 'front' ? 'coach.png' : 'launch.png');
  const projected = await projectedScreenshot(screenshot, quads[side]);
  errors[side] = projected.error;
  for (const drawing of [context, maskContext]) {
    drawing.save();
    drawing.clip(new Path2D(outlines[side]));
    if (side === 'back') drawing.clip(occlusion, 'evenodd');
    if (drawing === context) drawing.drawImage(projected.canvas, 0, 0);
    else { drawing.fillStyle = '#fff'; drawing.fillRect(0, 0, size, size); }
    drawing.restore();
  }
}

await mkdir(dirname(options.output), { recursive: true });
await writeFile(options.output, canvas.toBuffer('image/png'));
const pixels = context.getImageData(0, 0, size, size).data;
const mask = maskContext.getImageData(0, 0, size, size).data;
const pixel = (buffer, x, y) => Array.from(buffer.slice((y * size + x) * 4, (y * size + x) * 4 + 4));
let transparent = 0, partial = 0, exteriorAlphaChanges = 0;
for (let index = 0; index < pixels.length; index += 4) {
  const alpha = pixels[index + 3];
  if (alpha === 0) transparent++;
  else if (alpha < 255) partial++;
  if (mask[index + 3] === 0 && alpha !== basePixels[index + 3]) exteriorAlphaChanges++;
}
console.log(JSON.stringify({
  output: options.output,
  dimensions: [size, size],
  transparentPixels: transparent,
  partiallyTransparentPixels: partial,
  cornerAlpha: [[0, 0], [size - 1, 0], [size - 1, size - 1], [0, size - 1]]
    .map(([x, y]) => pixel(pixels, x, y)[3]),
  maxCornerProjectionErrorPx: errors,
  baseAlphaChangesOutsideScreens: exteriorAlphaChanges,
  frontBezelOcclusionProbe: { point: [690, 720], base: pixel(basePixels, 690, 720), output: pixel(pixels, 690, 720) },
  screenshotSampling: `${samplesPerAxis} × ${samplesPerAxis} subpixel samples; bilinear source sampling`,
}, null, 2));
