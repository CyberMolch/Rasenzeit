// Anbindung an die Android-Hülle (Capacitor). Im Browser ohne Wirkung.

interface CapApp { addListener(ev: 'backButton', cb: (e: { canGoBack: boolean }) => void): void; exitApp(): void }

export function setupNative() {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { App?: CapApp } } }).Capacitor;
  if (!cap?.isNativePlatform?.()) return;
  document.documentElement.classList.add('native');
  const app = cap.Plugins?.App;
  if (!app) return;
  // Zurück-Taste: zuerst offene Dialoge schließen, dann in der App zurück, sonst App beenden
  app.addListener('backButton', () => {
    const open = document.querySelector<HTMLDialogElement>('dialog[open]');
    if (open) { open.dispatchEvent(new Event('cancel', { cancelable: true })); return; }
    const h = window.location.hash.replace(/^#/, '');
    if (h && h !== '/') window.history.back();
    else app.exitApp();
  });
}
