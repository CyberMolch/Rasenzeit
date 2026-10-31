// Dateiprüfung beim Upload und plattformabhängiges Speichern/Teilen von Exporten.

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const DOC_TYPES = ['application/pdf', ...IMAGE_TYPES];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_DOC_BYTES = 15 * 1024 * 1024; // 15 MB

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toLocaleString('de-DE', { maximumFractionDigits: 0 })} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 / 1024).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`;
  return `${(n / 1024 ** 3).toLocaleString('de-DE', { maximumFractionDigits: 1 })} GB`;
}

export function validateUpload(file: File, kind: 'foto' | 'dokument'): string | null {
  const allowed = kind === 'foto' ? IMAGE_TYPES : DOC_TYPES;
  const max = kind === 'foto' ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;
  if (!allowed.includes(file.type)) {
    return kind === 'foto'
      ? `„${file.name}“ ist kein unterstütztes Foto. Erlaubt sind JPEG, PNG und WebP.`
      : `„${file.name}“ hat ein nicht unterstütztes Format. Erlaubt sind PDF, JPEG, PNG und WebP.`;
  }
  if (file.size > max) return `„${file.name}“ ist ${fmtBytes(file.size)} groß. Maximal erlaubt sind ${fmtBytes(max)}.`;
  if (file.size === 0) return `„${file.name}“ ist leer.`;
  return null;
}

/** Verkleinert große Fotos, um Speicherplatz zu sparen. Originalformat bleibt bei PNG erhalten. */
export async function downscaleImage(file: File, maxEdge = 2400): Promise<Blob> {
  try {
    if (!('createImageBitmap' in window)) return file;
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
    if (scale >= 1 && file.size < 2.5 * 1024 * 1024) { bmp.close?.(); return file; }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.86));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

// ---------- Plattform: Browser oder native Android-Hülle (Capacitor) ----------

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, any>;
}

function capacitor(): CapacitorGlobal | null {
  return ((window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor) ?? null;
}

export function isNativeApp(): boolean {
  return !!capacitor()?.isNativePlatform?.();
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/**
 * Speichert eine Datei. Im Browser als Download, in der Android-App über
 * Dateisystem + Teilen-Dialog (Capacitor-Plugins @capacitor/filesystem und @capacitor/share).
 */
export async function saveFile(filename: string, blob: Blob): Promise<'download' | 'shared'> {
  const cap = capacitor();
  if (cap?.isNativePlatform?.()) {
    const fs = cap.Plugins?.Filesystem;
    const share = cap.Plugins?.Share;
    if (!fs || !share) throw new Error('Die Export-Funktion der App ist unvollständig installiert (Filesystem/Share fehlen).');
    const data = await blobToBase64(blob);
    const res = await fs.writeFile({ path: filename, data, directory: 'CACHE' });
    await share.share({ title: filename, files: [res.uri], dialogTitle: 'Datei speichern oder teilen' });
    return 'shared';
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'download';
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(file, 'utf-8');
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!m) throw new Error('Ungültige Anhangsdaten');
  const mime = m[1] || 'application/octet-stream';
  if (m[2]) {
    const bin = atob(m[3]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
  return new Blob([decodeURIComponent(m[3])], { type: mime });
}
