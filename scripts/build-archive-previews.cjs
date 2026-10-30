#!/usr/bin/env node
/* Source-faithful, bounded-size previews for the moving Skills archive.
 * Install sharp, or set NODE_PATH to the existing workspace node_modules.
 * Run: node scripts/build-archive-previews.cjs
 * Check derived files without reading/fetching originals: add --check.
 * The original SVG src, dimensions, order and source hashes remain unchanged.
 */
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..');
const CATALOG = path.join(ROOT, 'assets/works/design-skills/catalog.json');
const PREVIEWS = 'assets/works/design-skills/archive/previews';
const WIDTH = 640, HEIGHT = 960;
const digest = input => crypto.createHash('sha256').update(input).digest('hex');
const previewFor = entry => `${PREVIEWS}/${entry.id}.webp`;
async function source(relative) {
  try { return await fs.readFile(path.join(ROOT, relative)); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    // Sparse release checkouts retain originals in Git. Only request this
    // individual source blob, never materialize the complete media archive.
    return execFileSync('git', ['show', `HEAD:${relative}`], {
      cwd: ROOT, maxBuffer: 16 * 1024 * 1024,
    });
  }
}
async function main() {
  sharp.cache(false); sharp.concurrency(1);
  const catalog = JSON.parse(await fs.readFile(CATALOG, 'utf8'));
  const entries = catalog.gallery || [];
  if (!entries.length) throw new Error('The source archive is empty');
  const checking = process.argv.includes('--check');
  await fs.mkdir(path.join(ROOT, PREVIEWS), {recursive:true});
  let total = 0, completed = 0;
  for (const entry of entries) {
    const relative = previewFor(entry);
    if (!/^[\w-]+$/.test(entry.id)) throw new Error('Invalid archive ID');
    const output = path.join(ROOT, relative);
    if (checking) {
      if (entry.preview !== `../${relative}`) throw new Error(`Missing preview reference: ${entry.id}`);
      const data = await fs.readFile(output);
      const meta = await sharp(data).metadata();
      if (data.length !== entry.previewBytes || meta.width !== entry.previewWidth ||
          meta.height !== entry.previewHeight || meta.width > WIDTH || meta.height > HEIGHT ||
          digest(data) !== entry.previewSha256) throw new Error(`Stale preview: ${entry.id}`);
      total += data.length;
    } else {
      const inputPath = entry.src.replace(/^\.\.\//, '');
      if (!inputPath.startsWith('assets/works/design-skills/archive/') ||
          !inputPath.endsWith('.svg') || inputPath.includes('/../')) throw new Error('Invalid source path');
      const input = await source(inputPath);
      if (digest(input) !== entry.sha256) throw new Error(`Source SHA256 changed: ${entry.id}`);
      // Rasterize at close to the output scale, rather than decoding a full
      // multi-megapixel SVG into RAM before reducing it. Process one at a time.
      const scale = Math.min(1, WIDTH / entry.width, HEIGHT / entry.height);
      const density = Math.max(1, Math.ceil(72 * scale));
      const {data, info} = await sharp(input, {density})
        .resize({width:WIDTH, height:HEIGHT, fit:'inside', withoutEnlargement:true})
        .webp({quality:90, alphaQuality:100, effort:6})
        .toBuffer({resolveWithObject:true});
      const expectedRatio = entry.width / entry.height;
      if (Math.abs(info.width / info.height - expectedRatio) > 2 / info.height)
        throw new Error(`Source ratio changed: ${entry.id}`);
      await fs.writeFile(output, data);
      Object.assign(entry, {preview:`../${relative}`, previewWidth:info.width,
        previewHeight:info.height, previewBytes:data.length, previewSha256:digest(data)});
      total += data.length;
    }
    completed++;
    if (completed % 10 === 0 || completed === entries.length)
      console.log(`${checking ? 'Checked' : 'Rendered'} ${completed}/${entries.length}: ${total.toLocaleString('en-US')} B`);
  }
  if (!checking) await fs.writeFile(CATALOG, JSON.stringify(catalog, null, 2) + '\n');
  console.log(`${entries.length} previews: ${total.toLocaleString('en-US')} B; originals preserved.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
