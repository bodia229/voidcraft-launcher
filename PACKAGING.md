# Packaging the TechnoMagia modpack

End-to-end process from a clean mods folder to a release that the launcher installs automatically for users.

## 0. Prerequisites

- Node.js 20+
- A GitHub repo for the modpack (separate from the launcher, or the same one — it doesn't matter)
- ~3-5 GB of free space for testing

## 1. Assemble the mods locally

First get the modpack working in a regular launcher (CurseForge App / Prism / MultiMC) on Minecraft 1.12.2 + Forge 14.23.5.2860:

1. Download the mods from CurseForge / Modrinth into `pack/mods/`
2. Copy the configs (preferably after the first launch, once all mods have generated their defaults) into `pack/config/`
3. If you have custom CraftTweaker scripts — `pack/scripts/`
4. Verify that the pack launches and doesn't crash

For the list of recommended mods, see `README.md`.

## 2. Generate the manifest

```bash
npm run manifest -- \
  --pack ./pack \
  --baseUrl https://github.com/USER/technomagia-modpack/releases/download/v0.1.0 \
  --version 0.1.0 \
  --mcVersion 1.12.2 \
  --forgeVersion 14.23.5.2860 \
  --notes "Initial release: 87 mods, ~2.1 GB"
```

The result is `modpack/manifest.json` with a list of files and their SHA256 hashes.

## 3. Create a GitHub Release

1. In the GitHub repo (`technomagia-modpack`), create a `v0.1.0` tag and a Release
2. Upload `modpack/manifest.json` as an asset **without renaming it**
3. Upload **all files from `pack/`** as assets, replacing `/` with `__`:
   ```
   pack/mods/jei-1.12.2-4.16.1.301.jar  →  mods__jei-1.12.2-4.16.1.301.jar
   pack/config/jei/colors.cfg            →  config__jei__colors.cfg
   ```

This simplifies automatic uploading with a bash script:
```bash
cd pack
for f in $(find . -type f); do
  rel="${f#./}"
  cp "$f" "../release-assets/${rel//\//__}"
done
gh release upload v0.1.0 release-assets/* modpack/manifest.json
```

## 4. Wire up the URL in the launcher

`src/shared/constants.ts`:
```ts
export const MODPACK = {
  ...
  manifestUrl: 'https://github.com/USER/technomagia-modpack/releases/latest/download/manifest.json'
} as const
```

`/latest/download/` automatically resolves to the current release — to update the modpack, just upload a new release.

## 5. Release a new modpack version

1. Make changes in `pack/` (add a mod, update a config)
2. Bump `--version` in `npm run manifest`
3. Create a new GitHub Release with a new tag
4. On the next launch, the launcher will see the new manifest, download only the changed files (thanks to the proactive SHA check), and start the updated game

## 6. Release a new launcher version

1. Bump `version` in `package.json`
2. Create a git tag: `git tag v0.1.1 && git push --tags`
3. GitHub Actions (`.github/workflows/release.yml`) builds the Windows artifacts and publishes a GitHub Release
4. Existing users receive the update automatically via electron-updater

## Troubleshooting

| Symptom | Solution |
|---|---|
| `Forge installer exited with code 1` | Make sure you're on Java 8 (not 17+!) — the Forge 1.12.2 installer crashes on newer Java |
| `SHA256 mismatch` | GitHub Releases sometimes compresses assets — make sure you're downloading the raw files |
| MC crashes with `Mixin error` | Mod version conflict — compare against the original E2E manifest |
| `Out of memory` | Raise the RAM slider in Settings to 8+ GB |
| `Could not reserve enough space` | Lower Xms in the JVM args — there isn't a large enough contiguous block of memory |
