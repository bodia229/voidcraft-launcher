# CLAUDE.md — context handoff for Voidcraft Launcher

You are continuing work on a Minecraft 1.12.2 modpack launcher built from scratch over the previous session. This file is a complete handoff: read it before doing anything else.

## What this is

**Voidcraft Launcher** (previously TechnoMagia) — a custom Electron app that installs and launches a Forge 1.12.2 tech+magic modpack. Distributed as a Windows portable .exe. Replaces using CurseForge/Prism/MultiMC for this specific pack.

- Project root: `C:\Users\user\technomagia-launcher` (folder kept the old name for path stability)
- Modpack repo: https://github.com/bodia229/technomagia-modpack1 (kept old name, used via `releases/latest/download/`)
- User: bodia229 (Microsoft MC account, GitHub same handle)
- Desktop shortcut: `C:\Users\user\Desktop\Voidcraft.lnk`
- Built artifact: `C:\Users\user\technomagia-launcher\release\Voidcraft 0.1.0.exe`
- gameDir / MODPACK.id intentionally kept as `technomagia` so existing installs don't break — display name is the only rebrand.

The user speaks Russian/Ukrainian. **Respond in Ukrainian**, but launcher UI is **Russian**. (per persistent memory `feedback_language_ukrainian`).

## Stack (versions matter — these were debugged for compatibility)

- **Electron 34.5.8** + **electron-vite 5** + **Vite 6** + **React 19** + **TypeScript 5.7**
- **Tailwind 3.4** (NOT 4 — config format breaking) + **shadcn/ui** components (Radix UI primitives)
- **minecraft-launcher-core 3.18** for launching MC
- **msmc 5.0** for Microsoft OAuth (note: API changed from msmc 4)
- **discord-rpc 4** for Rich Presence
- **electron-store 10** for settings persistence
- **electron-updater 6.6** for self-updates (gracefully degrades if app-update.yml missing)
- **archiver 8** for zip creation in deploy script — **exports classes, not a factory function**. Use `new ZipArchive(...)` not `archiver(...)`.
- **fs-extra 11**, **unzipper 0.12**, **p-limit 6**
- **Node 24.16.0** runtime, **npm 11**
- **Java 8** required for Forge 1.12.2 (auto-downloaded from Adoptium API). Never Java 17+ for this MC version.

## Architecture

```
src/
  shared/                  - types + constants shared between main and renderer
    types.ts               - IPC channel type map + all data shapes
    constants.ts           - MODPACK.manifestUrl, NEWS_FEED_URL, DEFAULT_SETTINGS
  main/                    - Electron main process
    index.ts               - entry, window creation, IPC registration
    modules/
      auth.ts              - msmc Microsoft OAuth + offline (UUID v3 from "OfflinePlayer:<name>")
      settings.ts          - electron-store wrapper
      modpack.ts           - install pipeline (manifest fetch -> Java -> Forge -> mods -> archives)
      downloader.ts        - SHA256-verified streaming download with 4x retry + exp backoff
      forge.ts             - spawns java -jar forge-installer.jar --installClient (headless)
      launcher.ts          - launches MC via minecraft-launcher-core with version.custom = forgeVersionId
      java.ts              - auto-downloads JRE 8 from Adoptium API + unzip
      packManager.ts       - resourcepacks/shaderpacks: scan, add (drag-drop), remove, enable/disable
      serverStatus.ts      - pings Minecraft servers via mcstatus.io HTTP API (no native deps)
      news.ts              - GitHub releases feed
      discordRpc.ts        - presence updates (skips silently if clientId is placeholder)
      autoUpdate.ts        - electron-updater wrapper, gracefully no-ops without app-update.yml
      appHandlers.ts       - shell:openExternal, openFolder
  preload/
    index.ts               - contextBridge: invoke<K>, on, events, getPathForFile (webUtils)
  renderer/                - React app (Vite)
    src/
      App.tsx              - sidebar + page router
      components/
        Sidebar.tsx        - left nav with active indicator
        AccountPanel.tsx   - MS / Offline login
        ServerStatusCard.tsx - online/players/ping for defaultServer
        UpdateBanner.tsx   - shows when self-update is downloaded
        Toaster.tsx        - Radix toast container
        ui/                - shadcn primitives (button, card, slider, progress, etc.)
      pages/
        Home.tsx           - branding + install/play button + server card
        Library.tsx        - pack info, "check for updates"
        Packs.tsx          - resourcepacks/shaderpacks manager (drag-drop)
        News.tsx           - GitHub releases as news
        Logs.tsx           - MC stdout/stderr stream
        SettingsPage.tsx   - RAM, JVM args, discord, manifest URL
      hooks/
        useLauncherState.ts - main store: account, settings, install progress, MC logs
        useUpdateState.ts   - electron-updater state
        useToast.ts         - global toast singleton (no provider needed)
      lib/
        api.ts              - typed wrapper over window.api
        utils.ts            - cn() classname helper, formatBytes/Duration
scripts/
  build-icons.mjs           - SVG -> PNG/ICO (sharp + png-to-ico)
  build-manifest.mjs        - manual manifest builder (rarely used; superseded by deploy-modpack)
  deploy-modpack.mjs        - END-TO-END deploy: walk pack/, zip subfolders, upload to GH Release, write manifest
  create-shortcut.vbs       - creates desktop .lnk (PowerShell is unavailable in this dev env, hence VBS)
pack/                       - source modpack content
  mods/                     - 95 .jar mods copied from user's .minecraft/mods/
  config/, scripts/         - ~1400 small files, get zipped before upload
  resourcepacks/, shaderpacks/ - usually empty
modpack/
  manifest.json             - generated by deploy
resources/                  - icon.svg/png/ico for builder
.github/workflows/          - ci.yml + release.yml
```

## Key non-obvious decisions and gotchas

1. **GitHub asset rename**: GitHub Releases auto-replaces `[`, `]`, ` ` in asset names with `.` or strips them. E.g. `BAUBLES [LIB].jar` becomes `BAUBLES.LIB.jar`. The deploy script handles this by capturing `browser_download_url` from the upload response and using THAT in the manifest, not a pre-constructed URL. **Never construct URLs by pattern after upload — always use the returned URL.**

2. **GitHub release 1000-asset limit**: configs/ alone is 1400+ files. The deploy script ships `mods/` as individual files (so the launcher can show per-mod progress) but bundles `config/`, `scripts/`, `resourcepacks/`, `shaderpacks/`, `kubejs/` each as a single `.zip`. The manifest has both `files: []` and `archives: []` arrays. Launcher downloads archives and extracts via `unzipper`.

3. **GitHub release empty-asset rejection**: 0-byte files (like `.gitkeep`) get HTTP 422 on upload. Script skips them.

4. **GitHub repo-empty rejection**: Creating a release on a repo with zero commits returns 422 "Repository is empty". Script auto-pushes a README via Contents API first if `/branches` is empty.

5. **electron-updater needs app-update.yml**: Without it, `checkForUpdates()` throws synchronously on packaged builds, which blocked the window from showing in the original build. `autoUpdate.ts` now checks for the file's existence first and bails to `status: 'unavailable'` if missing. Also `createWindow()` has a 5-second `ready-to-show` timeout fallback that force-shows the window.

6. **Electron 32+ removed `File.path`**: drag-drop needs `webUtils.getPathForFile(file)` exposed via preload. Available as `window.api.getPathForFile`.

7. **electron binary missing after npm install**: The post-install script that extracts the Electron binary into `node_modules/electron/dist/` sometimes silently fails (network or AV). Symptoms: `electron-vite dev` errors "Electron uninstall" or `spawn electron.exe ENOENT`. Fix: unzip `%LOCALAPPDATA%/electron/Cache/electron-v<version>-win32-x64.zip` into `node_modules/electron/dist/` and create `node_modules/electron/path.txt` containing exactly `electron.exe` (no trailing newline — use `printf` not `echo`).

8. **React 19 dropped global JSX namespace**: `src/renderer/src/global.d.ts` re-declares `namespace JSX` from `React.JSX` so `JSX.Element` return annotations still work without per-file imports.

9. **minecraft-launcher-core's `forge:` option is unreliable on 1.12.2**: `forge.ts` runs the installer jar headlessly with `--installClient` and then `launcher.ts` passes `version.custom = "<mc>-forge-<forge>"` pointing at the installed version JSON. This was changed from the original `forge:` config because the latter doesn't produce a working install for some 1.12.2 mod sets.

10. **CSP must allowlist all network targets**: `src/renderer/index.html` has a strict CSP meta tag. If you add a new external API, add it to `connect-src`. Current allowed: github.com, api.github.com, api.adoptium.net, api.mcstatus.io, maven.minecraftforge.net.

11. **Renderer mods filter `side`**: only files with `side !== 'server'` are downloaded client-side. Manifest sets `side: 'both'` by default, `'server'` only for `pack/servers/`.

12. **PowerShell is unavailable in this dev environment**: the original session created the desktop shortcut via `cscript scripts/create-shortcut.vbs`. If you need to do Windows shell operations from a script, prefer VBScript over PowerShell.

13. **gh CLI is also unavailable**: deploy uses raw GitHub REST API with `GH_TOKEN`. Do NOT suggest `gh release create` to the user.

14. **archiver 8 API change**: it exports `{ Archiver, ZipArchive, TarArchive, JsonArchive }` classes, NOT a factory function. Use `new ZipArchive({...})`, not `archiver('zip', {...})`. Import via createRequire because it's a CJS package.

## Build / dev / deploy commands

```bash
npm install                          # install deps (may need rebuild electron afterwards — see #7)
npm run dev                          # electron-vite dev mode (HMR for renderer)
npm run typecheck                    # both tsconfig.node.json and tsconfig.web.json
npm run build                        # production build (out/main, out/preload, out/renderer)
npm run build:portable               # + electron-builder portable .exe to release/
npm run build:win                    # + NSIS installer (not built yet — needs publisher info)
node scripts/build-icons.mjs         # SVG -> PNG/ICO
GH_TOKEN=ghp_... npm run deploy:modpack -- --version X.Y.Z --notes "..."
```

The launcher build typically completes in ~60-90s on this machine. `build:portable` adds another 30-60s for electron-builder packaging.

## What's done (snapshot at handoff)

- Full Electron skeleton + IPC pipeline working
- Microsoft auth (msmc 5) tested by user — successful login as `bodia229`
- Java 8 auto-download from Adoptium
- Headless Forge installer
- SHA256-verified mod downloader with 4x retry
- Modpack manifest with `files[]` + `archives[]` schema, extraction on install
- Auto-updater that degrades gracefully when not configured
- Dark glassmorphism UI with arcane theme (purple → orange gradients, Cinzel font)
- 5 pages: Home / Library / Packs / News / Logs / Settings
- Drag-drop resourcepack/shaderpack manager with pack.mcmeta + pack.png parsing
- Server status pinger via mcstatus.io
- Toast notifications (Radix)
- Discord RPC (skips silently without real client ID)
- Self-built icon (SVG → PNG 512 + multi-size ICO)
- Desktop shortcut via VBScript
- 95 mods + ~1400 config files copied from user's `.minecraft/`
- GitHub Actions CI + release workflows
- deploy-modpack script with smart skip-if-uploaded + uses GitHub-returned URLs

## Current open issue (when handing off)

The user just ran deploy after the latest fix (browser_download_url + skip-if-uploaded). They need to:

1. Re-run `npm run deploy:modpack` to regenerate manifest with correct URLs (previous manifest had broken URLs for the 5 mods with special chars in names)
2. Restart the launcher (kill old process first — `taskkill /F /IM "TechnoMagia Launcher 0.1.0.exe"`)
3. Click "Install modpack"

If install still fails on a specific mod, get the exact mod name from the red toast and check:
- Does the GitHub release have that asset?
- Does the manifest URL match the asset's `browser_download_url`?
- Network/AV blocking 28+ MB downloads?

## What's NOT done / known gaps

- Code signing certificate (Windows SmartScreen shows "Unknown publisher")
- electron-updater publish config still points at placeholder USER/repo for the LAUNCHER (the modpack repo is separate). Self-updates won't work until launcher itself is published.
- No NSIS installer build run yet — only portable
- No mod compatibility validation: Mo'Creatures + DivineRPG + Atum + Aether may have conflicts at runtime
- OptiFine is included in pack/ — redistribution may violate its license. Mention to user only if they ask about a public release.
- No FTBQuests pre-populated quest tree — they have the mod but the quest book isn't designed yet
- Renderer bundle is 800 KB — could be code-split per page if it becomes a problem

## How the user works

- Wants short responses in Ukrainian
- Tech-comfortable but doesn't know Electron/React internals — explain what changes and why, not the JS
- Has Microsoft Minecraft license (bodia229 account, owns the game)
- Runs commands in `cmd.exe`, not PowerShell or bash
- Tendency to paste literal placeholders into commands (e.g. pasted `ghp_your_token_here` verbatim — the deploy script now validates token format before sending)
- Once leaked a token in chat — if they share a token again, IMMEDIATELY warn them to revoke it. Do not store, do not use.

## When in doubt

- Read the file before editing — same Edit tool rules.
- Don't add features unless asked. Don't rename/refactor things that work.
- If you change UI behavior, also run typecheck + build to verify before reporting "done".
- After any change to main/, preload/, or shared/, the .exe must be rebuilt (`npm run build:portable`) before the desktop shortcut launches the new version. Renderer changes hot-reload in dev mode only.
- The deploy script is idempotent — safe to re-run.
- If the user reports the launcher "doesn't open", first try running the unpacked exe (`release/win-unpacked/TechnoMagia Launcher.exe`) from the terminal to capture stderr — the portable .exe extracts to %TEMP% and swallows console output.
