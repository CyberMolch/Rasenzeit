// Update-Prüfung für die Android-App über GitHub-Releases.
// Die App fragt das neueste Release ab, vergleicht die Version und bietet die APK zum Download an.
// Android installiert sie über die bestehende App (gleiche Signatur, höhere Versionsnummer);
// die Daten der App bleiben dabei erhalten.

import { isNativeApp } from './files';

declare const __APP_VERSION__: string;
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';
export const UPDATE_REPO = 'CyberMolch/Rasenzeit';
export const RELEASES_URL = `https://github.com/${UPDATE_REPO}/releases`;

const LAST_CHECK = 'rz.update.lastCheck';
const SKIPPED = 'rz.update.skipped';
const DAY = 24 * 60 * 60 * 1000;

export interface ReleaseInfo {
  version: string;
  name: string;
  notes: string;
  publishedAt: string;
  apkUrl: string | null;
  apkSize: number | null;
  pageUrl: string;
}

export type UpdateResult =
  | { status: 'aktuell'; latest: ReleaseInfo | null }
  | { status: 'verfuegbar'; latest: ReleaseInfo }
  | { status: 'fehler'; message: string };

/** Vergleicht "1.2.10" mit "1.2.9". Ergebnis > 0, wenn a neuer ist. */
export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/i, '').split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  const pb = b.replace(/^v/i, '').split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length, 3); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

function store(key: string, value?: string): string | null {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch { /* Speicher nicht verfügbar */ }
  return null;
}

export async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' }, signal: ctrl.signal, cache: 'no-store',
    });
    if (res.status === 404) return null; // noch kein Release veröffentlicht
    if (!res.ok) throw new Error(`GitHub antwortet mit Status ${res.status}.`);
    const r = await res.json() as {
      tag_name: string; name: string | null; body: string | null; published_at: string; html_url: string;
      assets: { name: string; browser_download_url: string; size: number }[];
    };
    const apk = r.assets.find((a) => a.name.toLowerCase().endsWith('.apk'));
    return {
      version: r.tag_name.replace(/^v/i, ''),
      name: r.name || r.tag_name,
      notes: (r.body ?? '').trim(),
      publishedAt: r.published_at,
      apkUrl: apk?.browser_download_url ?? null,
      apkSize: apk?.size ?? null,
      pageUrl: r.html_url,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkForUpdate(): Promise<UpdateResult> {
  try {
    const latest = await fetchLatestRelease();
    store(LAST_CHECK, String(Date.now()));
    if (latest && latest.apkUrl && compareVersions(latest.version, APP_VERSION) > 0) return { status: 'verfuegbar', latest };
    return { status: 'aktuell', latest };
  } catch (e) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return {
      status: 'fehler',
      message: offline
        ? 'Keine Internetverbindung. Die Update-Prüfung braucht kurz Netz, Rasenzeit selbst funktioniert offline.'
        : `Die Update-Prüfung ist fehlgeschlagen${e instanceof Error && e.message && !e.message.includes('abort') ? `: ${e.message}` : '.'}`,
    };
  }
}

/** Automatische Prüfung: nur in der Android-App und höchstens einmal pro Tag. */
export function shouldAutoCheck(): boolean {
  if (!isNativeApp()) return false;
  const last = Number(store(LAST_CHECK) ?? 0);
  return !last || Date.now() - last > DAY;
}

export function isSkipped(version: string): boolean {
  return store(SKIPPED) === version;
}
export function skipVersion(version: string) {
  store(SKIPPED, version);
}

/** Öffnet den APK-Download im System-Browser (Android lädt und installiert von dort). */
export function openDownload(url: string) {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { Browser?: { open(o: { url: string }): Promise<void> } } } }).Capacitor;
  const browser = cap?.isNativePlatform?.() ? cap.Plugins?.Browser : undefined;
  if (browser) { void browser.open({ url }).catch(() => { window.location.href = url; }); return; }
  window.open(url, '_blank', 'noopener');
}
