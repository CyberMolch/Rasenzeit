// Bilddaten, Lizenznachweise und Taxonomie-Abgleich – erzeugt von scripts/lexikon-bilder.mjs
// aus der Wikimedia-Commons-API und GBIF. Nicht von Hand bearbeiten.

import imagesFile from './images.json';
import type { ImageSlot } from './plants';

export interface LexiconImage {
  src: string;
  slot: ImageSlot;
  caption: string;
  alt: string;
  width: number;
  height: number;
  bytes: number;
  commonsTitle: string;
  sourcePage: string;
  author: string;
  license: string;
  licenseUrl: string;
  restrictions: string | null;
  changes: string;
}

export interface TaxonomyCheck {
  id: string;
  queried: string;
  gbif: {
    usageKey: number | null; scientificName: string | null; canonicalName: string | null; rank: string | null;
    status: string | null; matchType: string | null; family: string | null; acceptedUsageKey: number | null;
    acceptedName: string | null; url: string | null;
  } | null;
  wikipedia: { title: string; url: string } | null;
  checkedAt: string;
}

interface ImagesFile {
  version: number;
  generatedAt: string | null;
  images: Record<string, LexiconImage[]>;
  rejected: { plant: string; file: string; reason: string }[];
  taxonomy: Record<string, TaxonomyCheck>;
}

const data = imagesFile as unknown as ImagesFile;

export const SLOT_ORDER: ImageSlot[] = ['gesamt', 'blatt', 'bluete', 'wuchs'];
export const SLOT_LABEL: Record<ImageSlot, string> = {
  gesamt: 'Pflanze im Rasen',
  blatt: 'Blattdetail',
  bluete: 'Blüte oder Samenstand',
  wuchs: 'Wuchsform oder Ausläufer',
};

export function imagesFor(id: string): LexiconImage[] {
  const list = data.images[id] ?? [];
  return [...list].sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
}

export function coverFor(id: string): LexiconImage | null {
  const list = imagesFor(id);
  return list.find((i) => i.slot === 'gesamt') ?? list[0] ?? null;
}

export function missingSlots(id: string): ImageSlot[] {
  const have = new Set(imagesFor(id).map((i) => i.slot));
  return SLOT_ORDER.filter((s) => !have.has(s));
}

export function taxonomyFor(id: string): TaxonomyCheck | null {
  return data.taxonomy[id] ?? null;
}

export const MEDIA_GENERATED_AT = data.generatedAt;
export const TOTAL_IMAGE_BYTES = Object.values(data.images).flat().reduce((s, i) => s + (i.bytes ?? 0), 0);
export const TOTAL_IMAGES = Object.values(data.images).flat().length;

/** Kurze Bildnachweis-Zeile, z. B. „Foto: Max Muster · CC BY-SA 4.0“ */
export function creditLine(img: LexiconImage): string {
  return `Foto: ${img.author} · ${img.license}`;
}
