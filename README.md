# Voidcraft Launcher

> Custom Minecraft launcher for the **Voidcraft 1.12.2** modpack — tech + magic expert pack built on Forge.

<div align="center">

[![Electron](https://img.shields.io/badge/Electron-34-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
![Platform](https://img.shields.io/badge/Platform-Windows%20x64-0078D6?logo=windows&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

</div>

---

**Voidcraft Launcher** is a standalone desktop application that fully handles installing and launching the Voidcraft modpack (Minecraft 1.12.2, Forge `14.23.5.2860`). It automatically downloads Java 8, installs Forge, pulls mods and configs from GitHub Releases (with SHA256 verification), manages authentication, memory and JVM settings, and streams the game's logs into a built-in panel. It replaces CurseForge / Prism / MultiMC for this specific pack — the user just has to click a single button.

## Features

### Authentication and launching
- **Microsoft OAuth** (via `msmc`) + **offline mode** with a local username (UUID v3 from `OfflinePlayer:<name>`)
- Launches Minecraft via `minecraft-launcher-core` with a custom Forge version
- **RAM slider** and custom **JVM arguments** (defaults to Aikar's flags, optimized for modded 1.12.2)
- Optional **auto-connect to a configured server** on launch (user-configurable; disabled by default)

### Modpack installation
- 🔽 **Auto-download of Java 8** (Adoptium Temurin, JRE x64 for Windows)
- 🔨 **Auto-install of Forge 1.12.2** — headless run of `forge-installer.jar --installClient`
- 🔒 **SHA256-verified downloader** with streaming, 4 retries, and exponential backoff
- 📦 Support for `files[]` (individual mods — per-mod progress) and `archives[]` (config / scripts / resourcepacks as a single `.zip`, extracted via `unzipper`)
- ♻️ **Incremental updates** — the launcher skips files whose SHA256 and size match, and downloads only what changed

### Interface and integrations
- 🎨 Dark **glassmorphism** theme (arcane: purple-orange gradients, Cinzel font) built on Tailwind + shadcn/ui
- 🧩 **Resource-/shaderpack manager** with drag-and-drop, `pack.mcmeta` and `pack.png` parsing
- 📡 **Server status** — online / players / ping via `mcstatus.io`
- 📰 **News feed** from the modpack's GitHub Releases
- 📜 **Log streaming** of Minecraft (stdout/stderr) into a built-in panel
- 🎮 **Discord Rich Presence** (silently disabled if a placeholder client ID is set)
- 🔔 **Self-update** via `electron-updater` (degrades gracefully without `app-update.yml`)
- 🍞 Toast notifications (Radix)

## Tech stack

| Layer | Technologies |
|---|---|
| **Runtime / build** | Electron 34 · electron-vite 5 · Vite 6 · TypeScript 5.7 |
| **UI** | React 19 · Tailwind CSS 3.4 · shadcn/ui (Radix UI) · lucide-react |
| **Minecraft** | minecraft-launcher-core 3.18 · msmc 5 (Microsoft OAuth) · Java 8 (Adoptium) |
| **Infrastructure** | electron-store 10 (settings) · electron-updater 6.6 · discord-rpc 4 |
| **Downloading** | axios · node-fetch · unzipper · fs-extra · p-limit · uuid |
| **Packaging** | electron-builder 25 (NSIS installer + portable) · sharp · png-to-ico |

## Quick start

### Prerequisites
- **Node.js 20+** (22+ recommended) and npm
- OS: **Windows x64**

### Install and run in dev mode

```bash
npm install      # install dependencies
npm run dev      # electron-vite dev (HMR for renderer)
```

> If `spawn electron.exe ENOENT` appears after `npm install`, the Electron binary sometimes fails to unpack during post-install. Extract the cached `%LOCALAPPDATA%/electron/Cache/electron-v<version>-win32-x64.zip` into `node_modules/electron/dist/` and create `node_modules/electron/path.txt` containing `electron.exe` (with no trailing newline).

### Helper commands

```bash
npm run typecheck   # tsc for tsconfig.node.json + tsconfig.web.json
npm run lint        # eslint (.ts/.tsx, max-warnings 0)
```

## Build

```bash
npm run build:win        # NSIS installer + portable .exe (x64)
npm run build:portable   # portable .exe only (x64)
```

The resulting artifacts appear in the **`release/`** directory (for example, `release/Voidcraft <version>.exe`).

## Project structure

> The tree shows key files, not a complete listing.

```
src/
  shared/                 # types (IPC) + constants for main and renderer
    types.ts
    constants.ts          # MODPACK.manifestUrl, NEWS_FEED_URL, DEFAULT_SETTINGS
  main/                   # Electron main process
    index.ts              # window + IPC registration
    modules/
      auth.ts             # Microsoft OAuth + offline
      settings.ts         # electron-store wrapper
      modpack.ts          # install pipeline (manifest → Java → Forge → mods → archives)
      downloader.ts       # SHA256 + streaming download with retries
      forge.ts            # headless forge-installer
      launcher.ts         # minecraft-launcher-core wrapper
      java.ts             # auto-download of JRE 8 from Adoptium
      packManager.ts      # resource-/shaderpacks (drag-drop)
      serverStatus.ts     # server pinging via mcstatus.io
      news.ts             # GitHub Releases feed
      discordRpc.ts       # Rich Presence
      autoUpdate.ts       # electron-updater
      appHandlers.ts      # openExternal / openFolder
  preload/
    index.ts              # contextBridge API (invoke, on, getPathForFile)
  renderer/               # React UI (Vite)
    src/
      components/         # Sidebar, AccountPanel, ServerStatusCard, TitleBar,
                          #   UpdateBanner, EmbersBackground, FloatingRunes, … ui/ (shadcn)
      pages/              # Home, Library, Packs, News, Logs, SettingsPage
      hooks/              # useLauncherState, useUpdateState, useToast, useMagnetic
      lib/                # api wrapper, utils
scripts/
  deploy-modpack.mjs      # end-to-end deploy of the pack to a GitHub Release + manifest generation
  build-manifest.mjs      # manual manifest generator (with --baseUrl)
  build-icons.mjs         # SVG → PNG/ICO
  build-resourcepack.mjs  # resourcepack build
  build-loading-screen.mjs
  build-bq-quests.mjs     # FTBQuests generation
  create-shortcut.vbs     # desktop .lnk creation
  test-runner.mjs
modpack/
  manifest.json           # generated by deploy
  manifest.example.json   # safe example to commit
resources/                # icon.svg / png / ico for electron-builder
```

## Modpack hosting

The launcher doesn't bundle the mods itself — it pulls them from the modpack's **GitHub Releases** using a manifest:

```
https://github.com/bodia229/technomagia-modpack1/releases/latest/download/manifest.json
```

The URL is configured in `src/shared/constants.ts` → `MODPACK.manifestUrl`. The `/latest/download/` path automatically resolves to the current release **for the manifest itself only**, so to update the pack you just need to publish a new GitHub Release. The URLs of individual assets inside the manifest, by contrast, are **pinned to the specific release tag** (for example, `…/releases/download/v0.2.30/…`) they were uploaded to.

**The `manifest.json` format** contains two arrays:
- `files[]` — individual mods. Each entry follows the schema `{ path, url, sha256, size, required, side }` so that per-mod progress can be shown;
- `archives[]` — large bundles of small files (`config/`, `scripts/`, `resourcepacks/`, etc.) packed into a `.zip` and extracted via `unzipper`.

> ℹ️ GitHub Releases renames assets, replacing special characters (`/`, spaces, parentheses). That's why names in the manifest look like `mods__<name>.jar`, and the `url` field stores exactly the URL GitHub returned after upload — the URL is never constructed from a template.

The manifest is generated by the `npm run deploy:modpack` script, which walks the `pack/` folder, uploads assets to the release, and records exactly the URLs GitHub returned. The repository is hardcoded in this script (`--repo bodia229/technomagia-modpack1`), and the token is passed via the `GH_TOKEN` environment variable; the version and notes are passed via `--`:

```bash
GH_TOKEN=ghp_… npm run deploy:modpack -- --version X.Y.Z --notes "..."
```

A separate `npm run manifest` script (`build-manifest.mjs`) builds the manifest locally from a provided `--baseUrl` without uploading assets — these are not interchangeable commands. The detailed end-to-end process is in [`PACKAGING.md`](PACKAGING.md).

> 💡 The Java used to install the modpack is **Java 8** only. The Forge 1.12.2 installer fails on Java 17+. The launcher downloads the required JRE automatically.

## Known limitations

- **Windows x64 only** — other platforms are not built.
- **No code signing** — Windows SmartScreen will show "Unknown publisher".
- **Self-update is inactive** until the launcher itself is published: the `publish` block in `package.json` still points at the placeholder `owner: "USER"`.

## Contributing

Pull requests and issues are welcome. Before opening a PR, please:

1. Run `npm run typecheck` and `npm run lint` — both must pass without errors.
2. After changes to `main/`, `preload/`, or `shared/`, verify the build via `npm run build:portable`.
3. If you add a new external API, add its host to `connect-src` in the CSP in `src/renderer/index.html`.

## License

The launcher code is distributed under the **MIT** license (see the [`LICENSE`](LICENSE) file).

> ⚠️ The MIT license applies **only to the launcher code**. It does not cover the modpack itself: the mods, configs, resource packs, and other assets belong to their respective authors and are distributed under their own terms. Before distributing the pack publicly, make sure you have the right to do so (in particular regarding mods with third-party licenses).
