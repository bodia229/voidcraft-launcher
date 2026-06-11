#!/usr/bin/env node
/**
 * Builds the Voidcraft resource pack:
 *   - pack.mcmeta
 *   - pack.png (icon shown in the in-game resource pack list)
 *   - assets/minecraft/textures/gui/title/background/panorama_0..5.png
 *     (the six skybox faces shown behind the main menu in 1.12.2)
 *   - assets/minecraft/textures/gui/options_background.png
 *     (the dirt fallback shown on every loading / pause screen)
 *
 * Output: pack/resourcepacks/voidcraft.zip
 */

import { createWriteStream, mkdirSync, rmSync, writeFileSync, readFileSync, copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import sharp from 'sharp'

const { ZipArchive } = createRequire(import.meta.url)('archiver')
const __dirname = dirname(fileURLToPath(import.meta.url))
const TMP = join(__dirname, '..', '.build', 'voidcraft-rp')
const OUT_DIR = join(__dirname, '..', 'pack', 'resourcepacks')
const OUT_ZIP = join(OUT_DIR, 'voidcraft.zip')

// Wipe the staging dir so stale files from earlier builds (e.g. the broken
// minecraft.png atlas we used to write) don't end up baked into the zip.
rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })
mkdirSync(OUT_DIR, { recursive: true })

// ---- pack.mcmeta ---------------------------------------------------------

const mcmeta = {
  pack: {
    pack_format: 3, // 1.11–1.12.2
    description: '§cVoidcraft§r — gothic main menu, loading background, panorama.'
  }
}
writeFileSync(join(TMP, 'pack.mcmeta'), JSON.stringify(mcmeta, null, 2))

// ---- pack.png ------------------------------------------------------------
// Reuse the launcher's existing icon — same brand mark.

const PACK_PNG = join(__dirname, '..', 'resources', 'icon.png')
await sharp(PACK_PNG).resize(128, 128).png().toFile(join(TMP, 'pack.png'))

// ---- panorama faces (6 × 256×256) ---------------------------------------
// Each face is a moody red-gradient backdrop with subtle "crack" runes.
// Faces are nearly identical so the rotation feels continuous, with a hand-
// drawn glyph baked into face 0 (front) for a focal anchor.

const TEX_DIR = join(TMP, 'assets', 'minecraft', 'textures', 'gui', 'title', 'background')
mkdirSync(TEX_DIR, { recursive: true })

const PANORAMA_SIZE = 1024

function panoramaSvg(faceIdx) {
  // Six skybox faces. Each gets a tinted blood glow at a different position
  // so the slow rotation of the menu reveals new focal points instead of
  // looking like one repeated tile. Face 0 (front) carries the Voidcraft seal.
  const glowSpots = [
    { x: 512, y: 512, r: 320, op: 0.55 }, // front — seal sits behind it
    { x: 700, y: 400, r: 260, op: 0.30 },
    { x: 350, y: 600, r: 240, op: 0.28 },
    { x: 600, y: 700, r: 280, op: 0.32 },
    { x: 850, y: 600, r: 220, op: 0.22 }, // top
    { x: 200, y: 800, r: 240, op: 0.20 }  // bottom
  ][faceIdx]

  // A few stray "embers" scattered across each face for life.
  const embers = []
  // Deterministic by face index so all 6 faces stay distinct but stable.
  let seed = faceIdx * 7919
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let i = 0; i < 14; i++) {
    embers.push({
      cx: Math.round(rand() * 1024),
      cy: Math.round(rand() * 1024),
      r: 1 + Math.round(rand() * 2),
      op: 0.3 + rand() * 0.4
    })
  }

  // Face 0 also gets the cracked-seal glyph.
  const seal = faceIdx === 0 ? `
    <g transform="translate(512 540)" stroke="url(#blood)" fill="none" stroke-linecap="round">
      <!-- outer cracked ring -->
      <path d="M -240 -88  A 256 256 0 0 1 -88 -240" stroke-width="6" opacity="0.85"/>
      <path d="M  88 -240 A 256 256 0 0 1  240 -88" stroke-width="6" opacity="0.85"/>
      <path d="M  240 88  A 256 256 0 0 1  88  240" stroke-width="6" opacity="0.85"/>
      <path d="M -88 240  A 256 256 0 0 1 -240 88"  stroke-width="6" opacity="0.85"/>
      <!-- inner diamond -->
      <g transform="rotate(45)">
        <rect x="-92" y="-92" width="184" height="184" fill="none" stroke="url(#blood)" stroke-width="4" opacity="0.85"/>
        <rect x="-60" y="-60" width="120" height="120" fill="#0a0303" stroke="url(#blood)" stroke-width="2" opacity="0.75"/>
      </g>
      <!-- vertical crack -->
      <path d="M 0 -140 L -6 -90 L 8 -40 L -4 0 L 6 40 L -4 90 L 4 140" stroke-width="3" opacity="0.9"/>
      <!-- center hot spot -->
      <circle r="14" fill="#fca5a5" stroke="none" opacity="0.95"/>
      <circle r="22" fill="none" stroke="#ef4444" stroke-width="2" opacity="0.7"/>
    </g>` : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PANORAMA_SIZE}" height="${PANORAMA_SIZE}" viewBox="0 0 1024 1024">
    <defs>
      <radialGradient id="g" cx="50%" cy="55%" r="80%">
        <stop offset="0%"  stop-color="#3a0a0a"/>
        <stop offset="35%" stop-color="#1a0505"/>
        <stop offset="100%" stop-color="#020101"/>
      </radialGradient>
      <linearGradient id="blood" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"  stop-color="#ef4444"/>
        <stop offset="100%" stop-color="#7f1d1d"/>
      </linearGradient>
      <radialGradient id="hot" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ef4444" stop-opacity="0.9"/>
        <stop offset="60%" stop-color="#7f1d1d" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <!-- base gradient -->
    <rect width="1024" height="1024" fill="url(#g)"/>
    <!-- main blood glow -->
    <circle cx="${glowSpots.x}" cy="${glowSpots.y}" r="${glowSpots.r}" fill="url(#hot)" opacity="${glowSpots.op}"/>
    <!-- horizon vignette -->
    <rect width="1024" height="1024" fill="url(#g)" opacity="0.4"/>
    <!-- scattered embers -->
    ${embers.map(e => `<circle cx="${e.cx}" cy="${e.cy}" r="${e.r}" fill="#ef4444" opacity="${e.op}"/>`).join('')}
    ${seal}
    <!-- film grain -->
    <rect width="1024" height="1024" fill="#000" opacity="0.06"/>
  </svg>`
}

for (let i = 0; i < 6; i++) {
  const svg = panoramaSvg(i)
  await sharp(Buffer.from(svg)).png().toFile(join(TEX_DIR, `panorama_${i}.png`))
}
console.log(`  ✓ 6 panorama faces written (1024×1024)`)

// options_background.png intentionally left as vanilla dirt — Voidcraft only
// repaints the main-menu skybox and FML splash, not pause/world-select panes.

const GUI_DIR = join(TMP, 'assets', 'minecraft', 'textures', 'gui')
mkdirSync(GUI_DIR, { recursive: true })

// ---- Mojang splash replacement -------------------------------------------
const TITLE_DIR = join(TMP, 'assets', 'minecraft', 'textures', 'gui', 'title')
mkdirSync(TITLE_DIR, { recursive: true })
const ICON_SRC = join(__dirname, '..', 'resources', 'icon.png')
// mojang.png: fully transparent so native MC pre-FML "Mojang splash" can't
// draw anything visible. The coremod's TextureManager hook skips a bunch of
// bind calls, but the very first frames go through paths that hijack is too
// early for. A transparent texture means those frames just paint nothing on
// our black clear-color.
await sharp({
  create: { width: 256, height: 256, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
}).png().toFile(join(TITLE_DIR, 'mojang.png'))

// NOTE: in 1.12.2 the main-menu "MINECRAFT" wordmark is built from a sprite
// atlas where each "letter" is actually a 3D block tile, not the literal
// text. Overwriting minecraft.png with a flat wordmark turns it into
// unreadable pink mush. We leave the atlas alone — the title still reads
// "MINECRAFT" for now; full rebrand needs the CustomMainMenu mod.
// edition.png ("Java Edition" subtitle) IS a flat PNG and is safe to replace.
const TITLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="128" viewBox="0 0 512 128">
  <defs>
    <linearGradient id="t" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fca5a5"/>
      <stop offset="100%" stop-color="#dc2626"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <text x="256" y="86" font-family="Georgia, 'Times New Roman', serif" font-weight="700"
        font-size="42" fill="url(#t)" text-anchor="middle"
        letter-spacing="6" filter="url(#glow)">VOIDCRAFT · 1.12.2</text>
</svg>`
await sharp(Buffer.from(TITLE_SVG)).png().toFile(join(TITLE_DIR, 'edition.png'))
console.log(`  ✓ edition.png (subtitle) replaced — atlas left alone`)

// ---- FML / Voidcraft loading logo -----------------------------------------
const VC_GUI_DIR = join(TMP, 'assets', 'voidcraft', 'textures', 'gui')
mkdirSync(VC_GUI_DIR, { recursive: true })
await sharp(ICON_SRC).resize(256, 256).png().toFile(join(VC_GUI_DIR, 'loading_logo.png'))
console.log(`  ✓ loading_logo.png written`)

// ---- Custom splash texts -------------------------------------------------
const TEXTS_DIR = join(TMP, 'assets', 'minecraft', 'texts')
mkdirSync(TEXTS_DIR, { recursive: true })
const SPLASHES = [
  'Бездна ждёт',
  'Reality.exe остановлен',
  'Forging the void',
  'Кровь и сталь',
  'Магия требует жертв',
  '97 модов, 1 апокалипсис',
  '519 квестов',
  'Эфир пробуждается',
  'Welcome, voidwalker',
  'Forge 1.12.2 forever',
  'Где-то крошится разум',
  'Mekanism > жизнь',
  'Botania цветёт',
  'Thaumcraft исследует тебя',
  'AE2 знает всё',
  'Не смотри в Bedrock',
  'Java 8, как и положено',
  'Сейчас точно крашнется',
  'Сруби 1000 деревьев',
  'Дроп шанс: да',
  'Тигр в Mo\'Creatures > котёнок',
  'Эндер-дракон трепещет',
  'Глаз Гайи смотрит',
  'Демон-сделка готова',
  'Voidcraft v0.1.5',
  'Pretty unscary',
  'Made by Bodia',
  'IC2 + Mek + Therm = 💀',
  '§4§lНе нажимай F3+H',
  '§cСохраняйся почаще',
  'Шахта зовёт',
  'Algorhythm-free since 2026'
]
writeFileSync(join(TEXTS_DIR, 'splashes.txt'), SPLASHES.join('\n') + '\n')
console.log(`  ✓ ${SPLASHES.length} custom splash texts`)

// ---- mirror CLS textures so pre-scan finds them -------------------------
// CLS pre-scans textures BEFORE ResourceLoader's CustomResources pack is
// registered, so configs that reference `customloadingscreen:textures/...`
// must resolve via an EAGER resource pack — i.e. this one (voidcraft.zip).
const CLS_TEX_SRC = join(__dirname, '..', 'pack', 'resources', 'assets', 'customloadingscreen', 'textures')
const VC_CLS_DIR = join(TMP, 'assets', 'customloadingscreen', 'textures')
mkdirSync(VC_CLS_DIR, { recursive: true })
for (const fname of ['voidcraft_bg.png', 'voidcraft_logo.png']) {
  const src = join(CLS_TEX_SRC, fname)
  if (existsSync(src)) {
    copyFileSync(src, join(VC_CLS_DIR, fname))
    console.log(`  ✓ ${fname} (mirrored into voidcraft.zip)`)
  }
}

// ---- zip ----------------------------------------------------------------

await new Promise((resolve, reject) => {
  const out = createWriteStream(OUT_ZIP)
  const archive = new ZipArchive({ zlib: { level: 9 } })
  out.on('close', resolve)
  archive.on('error', reject)
  archive.pipe(out)
  archive.directory(TMP, false)
  archive.finalize()
})

console.log(`Wrote ${OUT_ZIP}`)
