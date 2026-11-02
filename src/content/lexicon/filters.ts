// Such- und Filtermerkmale des Lexikons. Alle Filterwerte werden aus den Einträgen abgeleitet.

import { ENTRIES, type BloomColor, type Category, type Growth, type LeafMargin, type LeafShape, type LexiconEntry } from './plants';

export const BLOOM_LABEL: Record<BloomColor, string> = {
  weiss: 'Weiß', gelb: 'Gelb', 'blau-violett': 'Blau bis violett', 'rosa-rot': 'Rosa bis rot', unscheinbar: 'Grünlich, bräunlich oder unscheinbar',
};
export const SHAPE_LABEL: Record<LeafShape, string> = {
  rundlich: 'Rundlich bis nierenförmig', dreizaehlig: 'Dreizählig (wie Klee)', gefingert: 'Gefingert (5 Teilblättchen)',
  gefiedert: 'Gefiedert (viele Teilblättchen)', 'handfoermig-geteilt': 'Handförmig geteilt', eifoermig: 'Eiförmig bis oval',
  lanzettlich: 'Lanzettlich, schmal-spitz', spatelfoermig: 'Spatelförmig', laenglich: 'Länglich, tief eingeschnitten',
  spiessfoermig: 'Spießförmig (mit zwei Spießecken)', grasartig: 'Grasartig, lang und schmal',
};
export const MARGIN_LABEL: Record<LeafMargin, string> = {
  ganzrandig: 'Glatt (ganzrandig)', gekerbt: 'Gekerbt (rundliche Zähne)', gezaehnt: 'Gezähnt oder gesägt', 'tief-eingeschnitten': 'Tief eingeschnitten',
};
export const GROWTH_LABEL: Record<Growth, string> = {
  kriechend: 'Kriechend mit Ausläufern', rosette: 'Rosette am Boden', aufrecht: 'Aufrecht', niederliegend: 'Niederliegend, polsterartig', horstig: 'In Büscheln (Horste)',
};
export const CATEGORY_LABEL: Record<Category, string> = { kraut: 'Kräuter', gras: 'Gräser' };

export interface FilterState {
  q: string;
  kategorie: Category[];
  bluete: BloomColor[];
  keineBluete: boolean; // "Keine Blüte sichtbar" – schließt nichts aus
  blattform: LeafShape[];
  blattrand: LeafMargin[];
  wuchs: Growth[];
  nurFavoriten: boolean;
}

export const EMPTY_FILTER: FilterState = { q: '', kategorie: [], bluete: [], keineBluete: false, blattform: [], blattrand: [], wuchs: [], nurFavoriten: false };

function uniq<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

/** Nur Werte anbieten, die in den Einträgen tatsächlich vorkommen – in der Reihenfolge der Bezeichnungen. */
function present<T extends string>(labels: Record<T, string>, values: T[]): T[] {
  return (Object.keys(labels) as T[]).filter((k) => values.includes(k));
}

export const FILTER_OPTIONS = {
  kategorie: present(CATEGORY_LABEL, uniq(ENTRIES.map((e) => e.category))),
  bluete: present(BLOOM_LABEL, uniq(ENTRIES.flatMap((e) => e.filters.bluete))),
  blattform: present(SHAPE_LABEL, uniq(ENTRIES.flatMap((e) => e.filters.blattform))),
  blattrand: present(MARGIN_LABEL, uniq(ENTRIES.flatMap((e) => e.filters.blattrand))),
  wuchs: present(GROWTH_LABEL, uniq(ENTRIES.flatMap((e) => e.filters.wuchs))),
};

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

export function searchText(e: LexiconEntry): string {
  return norm([e.taxon.nameDe, e.taxon.scientific, ...e.synonyms].join(' '));
}

/** Liefert, welcher Name zum Suchbegriff passt (für die Anzeige „gefunden über Synonym …“). */
export function matchedName(e: LexiconEntry, q: string): string | null {
  const t = norm(q);
  if (!t) return null;
  if (norm(e.taxon.nameDe).includes(t) || norm(e.taxon.scientific).includes(t)) return null;
  return e.synonyms.find((s) => norm(s).includes(t)) ?? null;
}

const any = <T,>(selected: T[], values: T[]) => selected.length === 0 || selected.some((s) => values.includes(s));

export function applyFilters(entries: LexiconEntry[], f: FilterState, favorites: string[]): LexiconEntry[] {
  const t = norm(f.q);
  return entries.filter((e) =>
    (!t || searchText(e).includes(t))
    && (!f.nurFavoriten || favorites.includes(e.id))
    && any(f.kategorie, [e.category])
    && any(f.bluete, e.filters.bluete)
    && any(f.blattform, e.filters.blattform)
    && any(f.blattrand, e.filters.blattrand)
    && any(f.wuchs, e.filters.wuchs));
}

/** Anzahl gesetzter Merkmalsfilter (ohne Suche/Favoriten). */
export function criteriaCount(f: FilterState): number {
  return [f.kategorie, f.bluete, f.blattform, f.blattrand, f.wuchs].filter((x) => x.length > 0).length;
}

export function isEmptyFilter(f: FilterState): boolean {
  return !f.q && criteriaCount(f) === 0 && !f.keineBluete && !f.nurFavoriten;
}
