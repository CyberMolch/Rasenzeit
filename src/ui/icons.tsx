// Einheitlicher Satz Outline-Icons im Stil von Lucide (24er Raster, 2px Strich, runde Enden).
// Eigene SVG-Pfade, damit die App ohne Fremdpaket offline baubar ist.

import type { ReactNode } from 'react';

const P: Record<string, ReactNode> = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></>,
  calendar: <><rect x="3" y="4.5" width="18" height="16.5" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></>,
  sprout: <><path d="M12 21v-9" /><path d="M12 12c0-4 2.5-6.5 7-6.5 0 4.5-2.5 6.5-7 6.5Z" /><path d="M12 14.5c0-3.5-2.2-5.5-6.5-5.5 0 3.8 2.2 5.5 6.5 5.5Z" /></>,
  book: <><path d="M12 6.5C10 4.8 7 4.3 3 4.5v14c4-.2 7 .3 9 2 2-1.7 5-2.2 9-2v-14c-4-.2-7 .3-9 2Z" /><path d="M12 6.5v14" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6" /></>,
  bell: <><path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  chevronDown: <path d="m5 9 7 7 7-7" />,
  arrowLeft: <><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></>,
  arrowRight: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  x: <><path d="M6 6l12 12M18 6 6 18" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12.5 3 3 5-6" /></>,
  circle: <circle cx="12" cy="12" r="9" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.6v.1" /></>,
  alert: <><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4.5M12 17.2v.1" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3" /></>,
  pencil: <><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /><path d="m14.5 5.5 3 3" /></>,
  camera: <><path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.5" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2.5" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></>,
  file: <><path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8Z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
  download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" /></>,
  upload: <><path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" /></>,
  share: <><path d="M12 15V3" /><path d="m7.5 7.5 4.5-4.5 4.5 4.5" /><path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v7A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H16" /></>,
  mapPin: <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  shield: <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6Z" />,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.3-2.5 3.8M12 17.2v.1" /></>,
  droplet: <path d="M12 3s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10 12 3 12 3Z" />,
  layers: <><path d="m12 3 9 5-9 5-9-5Z" /><path d="m3 13 9 5 9-5" /></>,
  mower: <><path d="M3 15h14l2-5h-9" /><path d="M10 10 7 4H4" /><circle cx="7" cy="18" r="2.2" /><circle cx="16.5" cy="18" r="2.2" /><path d="M9.2 18h5" /></>,
  package: <><path d="M7 4h10l1 4v11.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19.5V8Z" /><path d="M6 8h12" /><path d="M10 14.5c0-2 1.5-3.5 4-3.5 0 2.5-1.5 4-4 3.5Zm0 0-1.5 2" /></>,
  wrench: <path d="M14.5 6.5a4 4 0 0 0 5 5l-9 9a2.1 2.1 0 0 1-3-3l9-9a4 4 0 0 1 5-5l-2.5 2.5.5 2 2 .5Z" />,
  flask: <><path d="M9 3h6M10 3v6L4.5 18.5A1.6 1.6 0 0 0 5.9 21h12.2a1.6 1.6 0 0 0 1.4-2.5L14 9V3" /><path d="M7 15h10" /></>,
  eye: <><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="3" /></>,
  link: <><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></>,
  cloudOff: <><path d="M3 3l18 18" /><path d="M8 7.5A6 6 0 0 1 17.6 10H18a4 4 0 0 1 2.5 7.1M16 18H7a5 5 0 0 1-2-9.6" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3.5 2" /></>,
  calendarClock: <><path d="M21 10V6.5A2 2 0 0 0 19 4.5H5a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h6" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /><circle cx="17.5" cy="17.5" r="4" /><path d="M17.5 15.8v1.9l1.2.8" /></>,
  moveRight: <><path d="M3 12h13" /><path d="m12 7 5 5-5 5" /><path d="M21 5v14" /></>,
  leaf: <><path d="M5 19c-.5-8 4.5-14 15-15 .5 10-5 15.5-15 15Z" /><path d="M5 19c3-4.5 6-7.5 10-10" /></>,
  ruler: <><rect x="2.5" y="7" width="19" height="10" rx="1.5" /><path d="M6.5 7v3M10.5 7v4M14.5 7v3M18.5 7v4" /></>,
  calculator: <><rect x="5" y="2.5" width="14" height="19" rx="2" /><path d="M8.5 6.5h7M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h3.5" /></>,
  grass: <><path d="M4 20c1-5 2.5-8 4-10M8 20c0-5.5-1-9-3-12M12 20c0-6 1-11 2-14M16 20c0-4 1.5-7 4-9M12 20c-.5-3.5-2-6.5-4-8" /><path d="M2.5 20h19" /></>,
  seed: <><path d="M12 4c3 3 4 6 3 9-1 2-3 2-4.5 1S8 10.5 12 4Z" /><path d="M12 14v6M8 20h8" /></>,
  sack: <><path d="M8 4h8l-1.5 3.5c3 1.5 4.5 4.5 4.5 8 0 3-1.5 5-4.5 5h-5C6.5 20.5 5 18.5 5 15.5c0-3.5 1.5-6.5 4.5-8Z" /><path d="M12 16c0-2 1-3.5 3-3.5 0 2-1 3.5-3 3.5Zm0 0-1 1.5" /></>,
  database: <><ellipse cx="12" cy="5.5" rx="8" ry="3" /><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.3-4.7L4 8" /><path d="M4 3v5h5M4 13a8 8 0 0 0 14.3 4.7L20 16" /><path d="M20 21v-5h-5" /></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  play: <path d="M7 4.5v15l12-7.5Z" />,
  mushroom: <><path d="M3.5 12a8.5 8.5 0 0 1 17 0Z" /><path d="M9.5 12v6.5a2.5 2.5 0 0 0 5 0V12" /></>,
  star: <path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z" />,
  starFilled: <path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z" fill="currentColor" />,
  zoomIn: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M11 8v6M8 11h6" /></>,
  zoomOut: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M8 11h6" /></>,
  filter: <path d="M3 5h18l-7 8.5V19l-4 2v-7.5Z" />,
  external: <><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>,
  columns: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M12 4v16" /></>,
  swap: <><path d="M7 4 3 8l4 4" /><path d="M3 8h13" /><path d="m17 12 4 4-4 4" /><path d="M21 16H8" /></>,
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 20, className, label, strokeWidth = 1.8 }: { name: IconName; size?: number; className?: string; label?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ? `icon ${className}` : 'icon'}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
    >
      {P[name]}
    </svg>
  );
}

/** Blattlogo von Rasenzeit (gefülltes Doppelblatt wie in den Referenzen). */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M15 27C9 26 4.5 20 5.5 10c7 0 11.5 4.5 11.5 11 0 2.3-.6 4.3-2 6Z" fill="var(--c-primary-soft)" />
      <path d="M16 28c-1.5-9 3-19 12-23 2 10-2.5 20-12 23Z" fill="var(--c-primary)" />
      <path d="M16.5 27c2.5-6 5.5-11 9.5-15" stroke="var(--c-bg)" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
