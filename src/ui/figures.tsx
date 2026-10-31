import type { ReactElement } from 'react';
// Schematische Abbildungen für die Bestimmungshilfen (keine Fotos, keine Bestimmungsgrundlage für sich).

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const FIGS: Record<string, ReactElement> = {
  'leaf-grass': <g {...s}><path d="M14 44c2-14 4-26 6-36M24 44c0-12 0-24 2-34M34 44c-1-12-3-22-6-32M44 44c-2-10-5-18-10-26" /></g>,
  'leaf-broad': <g {...s}><path d="M32 40c-14 0-20-10-14-24 12 0 18 10 14 24Z" /><path d="M32 40 20 18" /></g>,
  'leaf-round': <g {...s}><path d="M32 38c-10 0-16-6-16-13s7-13 16-13 16 6 16 13-6 13-16 13Z" strokeDasharray="3 2" /><path d="M32 38v8" /></g>,
  'leaf-three': <g {...s}><circle cx="32" cy="16" r="7" /><circle cx="22" cy="28" r="7" /><circle cx="42" cy="28" r="7" /><path d="M32 28v16" /></g>,
  'leaf-toothed': <g {...s}><path d="M32 44 26 38l4-1-7-5 5-1-7-6 6-1-5-7 6 1-2-8 6 4 6-4-2 8 6-1-5 7 6 1-7 6 5 1-7 5 4 1Z" /></g>,
  'spikes-finger': <g {...s}><path d="M32 46V24M32 24 18 6M32 24 26 4M32 24l6-20M32 24 46 6" /></g>,
  'growth-creeping': <g {...s}><path d="M6 36c10-4 20-4 26 0s18 4 26 0" /><path d="M14 35v6M30 37v6M46 37v6" /><circle cx="14" cy="30" r="3" /><circle cx="30" cy="32" r="3" /><circle cx="46" cy="31" r="3" /></g>,
  'growth-rosette': <g {...s}><path d="M32 34 14 26M32 34l18-8M32 34 20 16M32 34l12-18M32 34V12" /><path d="M10 40h44" /></g>,
  'soil-grainy': <g fill="currentColor"><circle cx="18" cy="22" r="3" /><circle cx="28" cy="18" r="2.5" /><circle cx="38" cy="24" r="3" /><circle cx="24" cy="30" r="2.5" /><circle cx="34" cy="32" r="3" /><circle cx="44" cy="30" r="2.2" /><circle cx="20" cy="38" r="2" /></g>,
  'soil-silky': <g {...s}><path d="M12 30c8-6 14 6 20 0s14 6 20 0" /><path d="M12 22c8-6 14 6 20 0s14 6 20 0" opacity=".5" /></g>,
  'soil-sticky': <g {...s}><path d="M16 18c10 10 22 10 32 0" /><path d="M24 24v14M32 26v18M40 24v12" /></g>,
  'roll-crumble': <g {...s}><path d="M10 26h12M26 26h6M36 26h4M44 26h8" strokeWidth="5" /></g>,
  'roll-break': <g {...s}><path d="M10 30c6-6 12-6 18-2M32 26c6-4 14-4 22 2" strokeWidth="5" /></g>,
  'roll-bend': <g {...s}><path d="M12 34c4-16 36-16 40 0" strokeWidth="4" /></g>,
};

export function Figure({ id }: { id: string }) {
  const f = FIGS[id];
  if (!f) return null;
  return <svg width="64" height="48" viewBox="0 0 64 48" aria-hidden="true">{f}</svg>;
}
