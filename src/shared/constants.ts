export const APP_NAME = 'Voidcraft'
export const APP_VERSION = '0.1.0'

export const MODPACK = {
  id: 'technomagia',
  name: 'Voidcraft',
  mcVersion: '1.12.2',
  forgeVersion: '14.23.5.2860',
  manifestUrl:
    'https://github.com/bodia229/technomagia-modpack1/releases/latest/download/manifest.json'
} as const

export const JAVA = {
  major: 8,
  adoptiumApi:
    'https://api.adoptium.net/v3/assets/latest/8/hotspot?architecture=x64&image_type=jre&os=windows&vendor=eclipse'
} as const

export const DISCORD = {
  clientId: '0000000000000000000',
  details: 'Играет в Voidcraft',
  largeImageKey: 'logo',
  largeImageText: 'Voidcraft 1.12.2'
} as const

export const DEFAULT_SETTINGS = {
  ramMinGb: 6,
  ramMaxGb: 10,
  javaPath: null,
  closeOnLaunch: false,
  showSnapshots: false,
  discordRpc: true,
  jvmArgs:
    [
      // Aikar's flags — tuned for modded MC 1.12.2.
      '-XX:+UseG1GC',
      '-XX:+ParallelRefProcEnabled',
      '-XX:MaxGCPauseMillis=200',
      '-XX:+UnlockExperimentalVMOptions',
      '-XX:+DisableExplicitGC',
      '-XX:+AlwaysPreTouch',
      '-XX:G1NewSizePercent=30',
      '-XX:G1MaxNewSizePercent=40',
      '-XX:G1HeapRegionSize=8M',
      '-XX:G1ReservePercent=20',
      '-XX:G1HeapWastePercent=5',
      '-XX:G1MixedGCCountTarget=4',
      '-XX:InitiatingHeapOccupancyPercent=15',
      '-XX:G1MixedGCLiveThresholdPercent=90',
      '-XX:G1RSetUpdatingPauseTimePercent=5',
      '-XX:SurvivorRatio=32',
      '-XX:+PerfDisableSharedMem',
      '-XX:MaxTenuringThreshold=1',
      // Cuts dedupe overhead on long sessions.
      '-XX:+UseStringDeduplication',
      // Trim duplicate JIT inlining decisions.
      '-XX:+OptimizeStringConcat',
      // Forge auto-confirms missing-mod prompts so the loader doesn't block on stdin.
      '-Dfml.queryResult=confirm',
      // Mute the log4shell lookup attempt — no real risk on 1.12.2, but it bloats startup logs.
      '-Dlog4j2.formatMsgNoLookups=true',
      // Forge classloader is happier when this is off on Java 8.
      '-Djava.net.preferIPv4Stack=true',
      // Skip the IPv6 stack the JVM probes on Windows boot.
      '-Dfml.ignorePatchDiscrepancies=true',
      '-Dfml.ignoreInvalidMinecraftCertificates=true'
    ].join(' '),
  gameDir: '',
  theme: 'arcane' as const,
  defaultServer: null,
  manifestUrl: null,
  localPackPath: null
}

export const NEWS_FEED_URL =
  'https://api.github.com/repos/bodia229/technomagia-modpack1/releases'
