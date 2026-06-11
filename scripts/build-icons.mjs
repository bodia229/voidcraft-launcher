#!/usr/bin/env node
/**
 * Generates icon.png (512x512) and icon.ico (multi-size) from resources/icon.svg.
 *
 * Requires: sharp, png-to-ico (added on first run via `npm i -D`).
 *
 * Usage:
 *   node scripts/build-icons.mjs
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'

let sharp, pngToIco
try {
  sharp = (await import('sharp')).default
  pngToIco = (await import('png-to-ico')).default
} catch {
  console.error('Missing deps. Install with: npm i -D sharp png-to-ico')
  process.exit(1)
}

const root = new URL('..', import.meta.url).pathname.replace(/^\//, '')
const svg = await readFile(join(root, 'resources/icon.svg'))

const sizes = [16, 24, 32, 48, 64, 128, 256]
const pngs = await Promise.all(
  sizes.map((s) => sharp(svg).resize(s, s).png().toBuffer())
)

await mkdir(join(root, 'resources'), { recursive: true })
await writeFile(join(root, 'resources/icon.png'), await sharp(svg).resize(512, 512).png().toBuffer())
await writeFile(join(root, 'resources/icon.ico'), await pngToIco(pngs))

console.log('Wrote resources/icon.png (512x512) and resources/icon.ico (multi-size)')
