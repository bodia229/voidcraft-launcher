export type AuthMode = 'microsoft' | 'offline'

export interface AccountProfile {
  id: string
  name: string
  uuid: string
  accessToken: string
  refreshToken?: string
  mode: AuthMode
  expiresAt?: number
}

export interface LauncherSettings {
  ramMinGb: number
  ramMaxGb: number
  javaPath: string | null
  closeOnLaunch: boolean
  showSnapshots: boolean
  discordRpc: boolean
  jvmArgs: string
  gameDir: string
  theme: 'dark' | 'light' | 'arcane'
  defaultServer: string | null
  manifestUrl: string | null
  localPackPath: string | null
}

export interface ModpackManifest {
  id: string
  name: string
  version: string
  mcVersion: string
  forgeVersion: string
  description: string
  releaseNotes?: string
  java: { major: number; downloadUrl: string }
  files: ModpackFile[]
  archives?: ModpackArchive[]
  configs?: ModpackFile[]
  defaultServer?: { name: string; address: string }
}

export interface ModpackArchive {
  name: string
  extractTo: string
  url: string
  sha256: string
  size: number
}

export interface ModpackFile {
  path: string
  url: string
  sha256: string
  size: number
  required: boolean
  side: 'client' | 'server' | 'both'
}

export type InstallPhase =
  | 'idle'
  | 'fetching-manifest'
  | 'installing-java'
  | 'installing-forge'
  | 'downloading-mods'
  | 'verifying'
  | 'launching'
  | 'running'
  | 'error'

export interface InstallProgress {
  phase: InstallPhase
  current: number
  total: number
  message: string
  speedBps?: number
  etaSec?: number
}

export interface NewsItem {
  id: string
  title: string
  body: string
  url: string
  publishedAt: string
}

export type PackKind = 'resourcepacks' | 'shaderpacks'

export interface PackInfo {
  kind: PackKind
  fileName: string
  displayName: string
  description: string
  iconBase64: string | null
  sizeBytes: number
  enabled: boolean
}

export interface ServerStatus {
  online: boolean
  address: string
  motd?: string
  playersOnline?: number
  playersMax?: number
  version?: string
  latencyMs?: number
  iconBase64?: string | null
  error?: string
  fetchedAt: number
}

export interface IpcChannels {
  'auth:login': (mode: AuthMode, username?: string) => Promise<AccountProfile>
  'auth:logout': () => Promise<void>
  'auth:current': () => Promise<AccountProfile | null>
  'settings:get': () => Promise<LauncherSettings>
  'settings:set': (settings: Partial<LauncherSettings>) => Promise<LauncherSettings>
  'modpack:status': () => Promise<{ installed: boolean; version: string | null }>
  'modpack:install': () => Promise<void>
  'modpack:installLocal': () => Promise<void>
  'modpack:pickLocalPack': () => Promise<string | null>
  'modpack:launch': () => Promise<void>
  'news:fetch': () => Promise<NewsItem[]>
  'logs:tail': () => Promise<string[]>
  'app:openExternal': (url: string) => Promise<void>
  'app:openFolder': (which: 'game' | 'logs' | 'mods' | 'resourcepacks' | 'shaderpacks') => Promise<void>
  'packs:list': (kind: PackKind) => Promise<PackInfo[]>
  'packs:add': (kind: PackKind, sourcePath: string) => Promise<PackInfo | null>
  'packs:remove': (kind: PackKind, fileName: string) => Promise<void>
  'packs:setEnabled': (fileName: string, enabled: boolean) => Promise<void>
  'server:ping': (address: string) => Promise<ServerStatus>
  'window:minimize': () => Promise<void>
  'window:maximize': () => Promise<boolean>
  'window:close': () => Promise<void>
  'window:isMaximized': () => Promise<boolean>
}

export const IPC: { [K in keyof IpcChannels]: K } = {
  'auth:login': 'auth:login',
  'auth:logout': 'auth:logout',
  'auth:current': 'auth:current',
  'settings:get': 'settings:get',
  'settings:set': 'settings:set',
  'modpack:status': 'modpack:status',
  'modpack:install': 'modpack:install',
  'modpack:installLocal': 'modpack:installLocal',
  'modpack:pickLocalPack': 'modpack:pickLocalPack',
  'modpack:launch': 'modpack:launch',
  'news:fetch': 'news:fetch',
  'logs:tail': 'logs:tail',
  'app:openExternal': 'app:openExternal',
  'app:openFolder': 'app:openFolder',
  'packs:list': 'packs:list',
  'packs:add': 'packs:add',
  'packs:remove': 'packs:remove',
  'packs:setEnabled': 'packs:setEnabled',
  'server:ping': 'server:ping',
  'window:minimize': 'window:minimize',
  'window:maximize': 'window:maximize',
  'window:close': 'window:close',
  'window:isMaximized': 'window:isMaximized'
}

export const EVENT = {
  installProgress: 'install:progress',
  mcStdout: 'mc:stdout',
  mcStderr: 'mc:stderr',
  mcExit: 'mc:exit'
} as const
