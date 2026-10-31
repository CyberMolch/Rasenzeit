// Minimaler Hash-Router (funktioniert im Browser, als Datei und in der Android-Hülle).

import { useEffect, useState } from 'react';

export function currentPath(): string {
  const h = window.location.hash.replace(/^#/, '');
  return h.startsWith('/') ? h : '/';
}

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  const target = `#${path}`;
  if (opts.replace) window.history.replaceState(null, '', target);
  else window.location.hash = path;
  if (opts.replace) window.dispatchEvent(new HashChangeEvent('hashchange'));
}

let inAppSteps = 0;
window.addEventListener('hashchange', () => { inAppSteps++; });

export function back(fallback: string) {
  if (inAppSteps > 0) { inAppSteps -= 2; window.history.back(); }
  else navigate(fallback, { replace: true });
}

export function usePath(): string {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const on = () => {
      setPath(currentPath());
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}

/** Vergleicht ein Muster wie "/plan/aufgabe/:id" mit einem Pfad. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const s = path.split('?')[0].split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

export function query(path: string): URLSearchParams {
  return new URLSearchParams(path.split('?')[1] ?? '');
}
