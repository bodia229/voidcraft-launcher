#!/usr/bin/env node
/**
 * Builds the CustomLoadingScreen (by Lumien231) assets for Voidcraft.
 *   - pack/config/customloadingscreen/background.png  — full-screen backdrop
 *   - pack/config/customloadingscreen/logo.png        — VOIDCRAFT wordmark
 *   - pack/config/customloadingscreen/customloadingscreen.json
 *
 * CLS reads images from its own config dir via `localfile:./name.png` and
 * lays them out via a JSON tree. The exact 1.5.x schema is permissive —
 * elements have type + xy + width/height. If something doesn't parse, CLS
 * falls back to its vanilla-style default, which is fine.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
// CLS pre-scans textures during mod init, BEFORE the regular resource-pack
// manager has registered "voidcraft:". The customloadingscreen: namespace,
// however, is owned by the CLS mod itself and is always registered early —
// ResourceLoader's "CustomOverridingResources" pack lets us drop overrides
// into it. So we write textures into the customloadingscreen namespace.
const PACK_DIR = join(__dirname, '..', 'pack')
const CLS_DIR = join(PACK_DIR, 'config', 'customloadingscreen')
const TEX_DIR = join(PACK_DIR, 'resources', 'assets', 'customloadingscreen', 'textures')
mkdirSync(CLS_DIR, { recursive: true })
mkdirSync(TEX_DIR, { recursive: true })

// ---- background.png (1920×1080) -----------------------------------------

const BG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="80%">
      <stop offset="0%"  stop-color="#1a0808"/>
      <stop offset="40%" stop-color="#0a0303"/>
      <stop offset="100%" stop-color="#020101"/>
    </radialGradient>
    <radialGradient id="hot" cx="50%" cy="50%" r="50%">
      <stop offset="0%"  stop-color="#dc2626" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#7f1d1d" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="blood" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"  stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#7f1d1d"/>
    </linearGradient>
  </defs>

  <!-- base -->
  <rect width="1920" height="1080" fill="url(#bg)"/>

  <!-- left blood pool -->
  <ellipse cx="200" cy="900" rx="500" ry="180" fill="url(#hot)" opacity="0.6"/>
  <!-- right ember crackle -->
  <ellipse cx="1700" cy="900" rx="450" ry="160" fill="url(#hot)" opacity="0.5"/>

  <!-- huge cracked seal in the centre, very faded so the bar reads on top -->
  <g transform="translate(960 540)" stroke="url(#blood)" fill="none" stroke-linecap="round" opacity="0.18">
    <path d="M -300 -110 A 320 320 0 0 1 -110 -300" stroke-width="8"/>
    <path d="M  110 -300 A 320 320 0 0 1  300 -110" stroke-width="8"/>
    <path d="M  300  110 A 320 320 0 0 1  110  300" stroke-width="8"/>
    <path d="M -110  300 A 320 320 0 0 1 -300  110" stroke-width="8"/>
    <g transform="rotate(45)">
      <rect x="-120" y="-120" width="240" height="240" fill="none" stroke="url(#blood)" stroke-width="5"/>
    </g>
    <path d="M 0 -180 L -8 -120 L 12 -60 L -6 0 L 9 60 L -6 120 L 5 180" stroke-width="4"/>
  </g>

  <!-- scattered embers -->
  ${Array.from({ length: 60 }, () => {
    const x = Math.floor(Math.random() * 1920)
    const y = Math.floor(Math.random() * 1080)
    const r = 1 + Math.floor(Math.random() * 3)
    const op = (0.3 + Math.random() * 0.5).toFixed(2)
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#ef4444" opacity="${op}"/>`
  }).join('')}

  <!-- horizon vignette -->
  <rect width="1920" height="1080" fill="url(#bg)" opacity="0.35"/>
  <!-- film grain -->
  <rect width="1920" height="1080" fill="#000" opacity="0.08"/>
</svg>`

import { copyFileSync, existsSync } from 'node:fs'
const CONCEPT_PATH = join(CLS_DIR, 'background.png')
const RP_BG_PATH = join(TEX_DIR, 'voidcraft_bg.png')
if (existsSync(CONCEPT_PATH)) {
  copyFileSync(CONCEPT_PATH, RP_BG_PATH)
  console.log(`  ✓ voidcraft_bg.png (from user concept) → customloadingscreen namespace`)
} else {
  await sharp(Buffer.from(BG_SVG)).png().toFile(RP_BG_PATH)
  console.log(`  ✓ voidcraft_bg.png (fallback SVG)`)
}

// ---- logo.png (800×260) — flame icon + VOIDCRAFT wordmark ----------------

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="260" viewBox="0 0 800 260">
  <defs>
    <linearGradient id="t" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"  stop-color="#fca5a5"/>
      <stop offset="100%" stop-color="#dc2626"/>
    </linearGradient>
    <linearGradient id="blood" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#7f1d1d"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- flame icon above the wordmark -->
  <g transform="translate(400 50)" fill="url(#blood)" filter="url(#glow)" stroke="none">
    <path d="M 0 -36 C -6 -24, -18 -18, -16 -2 C -14 14, -2 22, 0 32 C 2 22, 14 14, 16 -2 C 18 -18, 6 -24, 0 -36 Z"/>
  </g>

  <!-- wordmark -->
  <text x="400" y="170" font-family="Georgia, 'Times New Roman', serif" font-weight="700"
        font-size="84" fill="url(#t)" text-anchor="middle"
        letter-spacing="14" filter="url(#glow)">VOIDCRAFT</text>

  <!-- subtitle -->
  <text x="400" y="210" font-family="Georgia, 'Times New Roman', serif"
        font-size="20" fill="#fca5a5" text-anchor="middle"
        letter-spacing="10" opacity="0.85">1.12.2 · MODPACK · EXPERT</text>

  <!-- hairline accent under subtitle -->
  <line x1="320" y1="225" x2="480" y2="225" stroke="url(#blood)" stroke-width="1" opacity="0.6"/>
</svg>`

await sharp(Buffer.from(LOGO_SVG)).png().toFile(join(TEX_DIR, 'voidcraft_logo.png'))
console.log(`  ✓ voidcraft_logo.png (800×260) → customloadingscreen namespace`)

// ---- Pre-FML splash override ----------------------------------------------
// Strategy: ship our splash PNG inside the coremod jar at a path that the
// embedded Minecraft jar DOES NOT have ("voidcraft_splash.png" directly in
// assets/minecraft/). The classloader will fail to find it in MC's jar and
// keep searching, eventually hitting our coremod jar.
// Then patch SplashProgress's LDC "textures/gui/title/mojang.png" string to
// "voidcraft_splash.png" — the splash thread asks for our file, gets it,
// draws OUR texture as the quad.
const COREMOD_RES = join(__dirname, '..', 'coremod-src', 'voidcraft', 'src', 'main', 'resources', 'assets', 'minecraft')
mkdirSync(COREMOD_RES, { recursive: true })
const SPLASH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="70%">
      <stop offset="0%"  stop-color="#1a0606"/>
      <stop offset="60%" stop-color="#0a0303"/>
      <stop offset="100%" stop-color="#020101"/>
    </radialGradient>
    <linearGradient id="t" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"  stop-color="#fca5a5"/>
      <stop offset="100%" stop-color="#dc2626"/>
    </linearGradient>
    <linearGradient id="blood" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#7f1d1d"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <!-- flame icon -->
  <g transform="translate(256 180)" fill="url(#blood)" filter="url(#glow)">
    <path d="M 0 -50 C -10 -32, -28 -22, -24 -2 C -20 22, -2 32, 0 50 C 2 32, 20 22, 24 -2 C 28 -22, 10 -32, 0 -50 Z"/>
  </g>
  <!-- VOIDCRAFT wordmark -->
  <text x="256" y="300" font-family="Georgia, 'Times New Roman', serif" font-weight="700"
        font-size="46" fill="url(#t)" text-anchor="middle"
        letter-spacing="8" filter="url(#glow)">VOIDCRAFT</text>
  <!-- subtitle -->
  <text x="256" y="335" font-family="Georgia, 'Times New Roman', serif"
        font-size="13" fill="#fca5a5" text-anchor="middle"
        letter-spacing="6" opacity="0.85">1.12.2 · MODPACK · EXPERT</text>
  <!-- hairline accent -->
  <line x1="170" y1="350" x2="342" y2="350" stroke="url(#blood)" stroke-width="1" opacity="0.6"/>
</svg>`
// Prefer the user-supplied Nether scene PNG if it exists (same one CLS uses
// as background). The splash quad is square so we resize-and-extend to keep
// the scene readable in 512×512.
const USER_NETHER = join(__dirname, '..', 'pack', 'resources', 'assets', 'customloadingscreen', 'textures', 'voidcraft_bg.png')
if (existsSync(USER_NETHER)) {
  await sharp(USER_NETHER)
    .resize(512, 512, { fit: 'cover', position: 'centre' })
    .png()
    .toFile(join(COREMOD_RES, 'voidcraft_splash.png'))
  console.log(`  ✓ voidcraft_splash.png -> user Nether scene (cropped to 512×512)`)
} else {
  await sharp(Buffer.from(SPLASH_SVG)).png().toFile(join(COREMOD_RES, 'voidcraft_splash.png'))
  console.log(`  ✓ voidcraft_splash.png -> generated SVG fallback`)
}

// ---- customloadingscreen.json -------------------------------------------

// CLS 1.5.x actually wants a "renders" array of strings (sample refs) or
// objects ({"image": {...}}). I'd guessed an "elements" map — wrong schema,
// the config failed to parse and CLS fell back to its built-in default.
// This version is built from the in-jar sample/dark.json template:
//   1. solid black flat_background underneath everything
//   2. our background.png stretched full-screen
//   3. our logo.png centred up top
//   4. a loading bar (no percentage text, no status text — those would
//      drive the FontRenderer + cyrillic-glyph crash again)
const config = {
  renders: [
    // 1. Black underlay so any uncovered pixel stays gothic instead of white.
    { image: { parent: 'sample/flat_background', colour: '0xFF_05_05_05' } },
    // 2. Full-screen Voidcraft Nether scene. builtin/image needs a
    //    `texture` block with UV coords or it silently skips the render.
    {
      image: {
        parent: 'builtin/image',
        image: 'customloadingscreen:textures/voidcraft_bg.png',
        position_type: 'TOP_LEFT',
        offset_pos: 'TOP_LEFT',
        position: { x: 0, y: 0, width: 'screen_width', height: 'screen_height' },
        texture: { x: 0, y: 0, width: 1, height: 1 }
      }
    },
    // 3. VOIDCRAFT wordmark + flame, centred near the top.
    {
      image: {
        parent: 'builtin/image',
        image: 'customloadingscreen:textures/voidcraft_logo.png',
        position_type: 'TOP_LEFT',
        offset_pos: 'TOP_LEFT',
        position: {
          x: 'screen_width / 2 - 400',
          y: 80,
          width: 800,
          height: 260
        },
        texture: { x: 0, y: 0, width: 1, height: 1 }
      }
    },
    // 4. Loading bar (no text). Re-uses CLS's bevelled bar style.
    'sample/loading_bar_bevel'
  ],
  functions: [],
  factories: [],
  actions: [],
  variables: {}
}

writeFileSync(
  join(CLS_DIR, 'voidcraft.json'),
  JSON.stringify(config, null, 2)
)
console.log(`  ✓ voidcraft.json (${config.renders.length} renders)`)

// Master CLS config — tells the mod which JSON to load instead of picking
// a built-in panorama at random.
const cfg = `# Configuration file
# Auto-generated by build-loading-screen.mjs — points CLS at the Voidcraft
# layout instead of a built-in random sample.

debug {
    B:resource_loading=false
}

general {
    I:fps_limit=75
    S:random_configs <
        sample/default
        sample/white
        sample/scrolling
        sample_panorama_lower
     >
    S:screen_config=config/voidcraft
    B:smooth_init=true
    B:use_custom=true
    B:use_frame=false
}
`
writeFileSync(join(PACK_DIR, 'config', 'customloadingscreen.cfg'), cfg)
console.log(`  ✓ customloadingscreen.cfg (screen_config=config/voidcraft)`)
console.log(`Done. Files in ${CLS_DIR}`)
