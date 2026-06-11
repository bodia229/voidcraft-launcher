#!/usr/bin/env node
/**
 * Headless test runner: launches Minecraft directly via minecraft-launcher-core
 * with an offline TestBot profile, waits up to TIMEOUT seconds, and writes
 * a summary of:
 *   - whether the JVM started
 *   - whether any [VoidcraftCore] log lines printed
 *   - whether the game made it past "Loading dimensions" / "Stopping!"
 *   - the latest crash report (path + first 30 lines)
 *
 * Usage:  node scripts/test-runner.mjs [--timeout 90]
 */

import { Client } from 'minecraft-launcher-core'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const GAME_DIR = 'C:\\Users\\user\\AppData\\Roaming\\.technomagia\\technomagia'
const JAVA = 'C:\\Users\\user\\AppData\\Roaming\\voidcraft-launcher\\runtime\\java\\jre-8\\bin\\javaw.exe'
const TIMEOUT = parseInt(process.argv.find((a, i) => process.argv[i - 1] === '--timeout') ?? '90', 10)

const REPORTS_DIR = join(__dirname, '..', '.test-reports')
mkdirSync(REPORTS_DIR, { recursive: true })

// --- sync pack/ -> gameDir before launch ----------------------------------
// We bypass the launcher's install step, so without this we'd be testing
// whatever the gameDir last had on disk (often stale).
const PACK_DIR = join(__dirname, '..', 'pack')
async function rsyncDir(src, dst) {
  const { cp } = await import('node:fs/promises')
  await cp(src, dst, { recursive: true, force: true })
}
console.log('[runner] syncing pack/ -> gameDir…')
for (const sub of ['mods', 'config', 'resources', 'scripts']) {
  const src = join(PACK_DIR, sub)
  const dst = join(GAME_DIR, sub)
  if (!existsSync(src)) continue
  await rsyncDir(src, dst)
}
// resourcepacks: copy individual files (mods folder logic)
const rpSrc = join(PACK_DIR, 'resourcepacks')
if (existsSync(rpSrc)) {
  const rpDst = join(GAME_DIR, 'resourcepacks')
  mkdirSync(rpDst, { recursive: true })
  for (const f of readdirSync(rpSrc)) {
    const { copyFileSync } = await import('node:fs')
    copyFileSync(join(rpSrc, f), join(rpDst, f))
  }
}
console.log('[runner] sync done.')

// --- profile -------------------------------------------------------------
const opts = {
  authorization: {
    access_token: '0',
    client_token: '0',
    uuid: '00000000-0000-0000-0000-000000000001',
    name: 'TestBot',
    user_properties: '{}',
    meta: { type: 'mojang', xuid: '', demo: false }
  },
  root: GAME_DIR,
  version: { number: '1.12.2', type: 'release', custom: '1.12.2-forge-14.23.5.2860' },
  memory: { min: '4G', max: '8G' },
  javaPath: JAVA,
  customArgs: [
    '-XX:+UseG1GC',
    '-XX:MaxGCPauseMillis=200',
    '-Dfml.queryResult=confirm',
    '-Dlog4j2.formatMsgNoLookups=true'
  ],
  overrides: {
    detached: false,
    gameDirectory: GAME_DIR
  }
}

// --- launch --------------------------------------------------------------
console.log(`[runner] launching MC, timeout ${TIMEOUT}s…`)
const launcher = new Client()
const stdout = []
const stderr = []
let exitCode = null
let exited = false

launcher.on('data', (line) => { stdout.push(String(line).trimEnd()) })
launcher.on('debug', (line) => { stdout.push(`[debug] ${line}`) })
launcher.on('error', (err) => { stderr.push(`[error] ${err.message}`) })
launcher.on('close', (code) => { exitCode = code; exited = true })

await launcher.launch(opts)

// --- wait ---------------------------------------------------------------
const start = Date.now()
while (!exited && (Date.now() - start) / 1000 < TIMEOUT) {
  await new Promise((r) => setTimeout(r, 1000))
}

if (!exited) {
  console.log(`[runner] timeout — killing javaw…`)
  try { execFileSync('taskkill', ['/F', '/IM', 'javaw.exe'], { stdio: 'ignore' }) } catch {}
}

// --- summarise ----------------------------------------------------------
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
writeFileSync(join(REPORTS_DIR, `stdout-${stamp}.log`), stdout.join('\n'))
writeFileSync(join(REPORTS_DIR, `stderr-${stamp}.log`), stderr.join('\n'))

const voidcraftLines = stdout.filter((l) => l.includes('[VoidcraftCore]'))
const exceptionLine = stdout.find((l) => /Exception|Error/.test(l) && !l.includes('[VoidcraftCore]'))

console.log('\n========= RESULT =========')
console.log(`exit:               ${exitCode === null ? 'KILLED (timeout)' : exitCode}`)
console.log(`stdout lines:       ${stdout.length}`)
console.log(`[VoidcraftCore]:    ${voidcraftLines.length}`)
voidcraftLines.forEach((l) => console.log(`  ${l}`))

// latest crash report
const crashes = join(GAME_DIR, 'crash-reports')
if (existsSync(crashes)) {
  const files = readdirSync(crashes)
    .map((f) => ({ f, m: statSync(join(crashes, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m)
  if (files.length > 0 && Date.now() - files[0].m < 5 * 60 * 1000) {
    const path = join(crashes, files[0].f)
    console.log(`\ncrash: ${path}`)
    const head = readFileSync(path, 'utf8').split('\n').slice(0, 40).join('\n')
    console.log(head)
  } else {
    console.log('\nno fresh crash report.')
  }
}

// last 25 stdout
console.log('\n--- last 25 stdout lines ---')
stdout.slice(-25).forEach((l) => console.log(l))

if (exceptionLine) console.log(`\nfirst exception: ${exceptionLine}`)
