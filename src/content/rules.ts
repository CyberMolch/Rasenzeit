// Planungsregeln – getrennt von Oberfläche und Speicherung.
//
// WICHTIG: Keine dieser Regeln wurde bisher von einer Fachperson geprüft.
// Alle tragen daher den Prüfstatus „entwurf“ und werden in der App
// ausschließlich als unverbindliche Vorschläge formuliert.
// Sobald eine Regel fachlich geprüft ist: reviewStatus = 'geprueft',
// lastReviewed und sources setzen.

import type {
  ContentMeta, LawnArea, Product, SoilMeasurement, TaskCategory, JournalEntry, Device,
} from '../domain/types';
import { LIGHT_LABEL, SOIL_SOURCE_LABEL, SOIL_TYPE_LABEL, USAGE_LABEL, WATER_LABEL, COMPACTION_LABEL } from '../domain/labels';
import { fmtDate } from '../lib/dates';

export type InputKey =
  | 'jahreszeit'
  | 'zustand'
  | 'licht'
  | 'nutzung'
  | 'bodenart'
  | 'wasserverhalten'
  | 'verdichtung'
  | 'ph'
  | 'letzte_duengung'
  | 'duenger_mit_dosierung'
  | 'saatgut'
  | 'geraete';

export const INPUT_LABEL: Record<InputKey, string> = {
  jahreszeit: 'Jahreszeit',
  zustand: 'Rasenzustand',
  licht: 'Lichtverhältnisse',
  nutzung: 'Nutzung',
  bodenart: 'Bodenart',
  wasserverhalten: 'Beobachtetes Wasserverhalten',
  verdichtung: 'Verdichtung',
  ph: 'pH-Messung',
  letzte_duengung: 'Datum der letzten Düngung',
  duenger_mit_dosierung: 'Dünger mit hinterlegter Dosierung',
  saatgut: 'Hinterlegtes Saatgut',
  geraete: 'Geräte',
};

export interface RuleContext {
  area: LawnArea;
  measurements: SoilMeasurement[]; // nur dieser Fläche
  products: Product[];
  devices: Device[];
  journal: JournalEntry[]; // nur dieser Fläche
  year: number;
}

export interface PlanningRule extends ContentMeta {
  id: string;
  title: string;
  category: TaskCategory;
  /** Zeitfenster als [Monat(1-12), Tag] */
  window: { start: [number, number]; end: [number, number] };
  requiredInputs: InputKey[];
  considers: InputKey[];
  conditionText: string; // Voraussetzungen in Klartext
  applies: (ctx: RuleContext) => boolean;
  description: string;
  rationale: string; // allgemeine, verständliche Begründung
  explain: (ctx: RuleContext) => string[]; // flächenbezogene Begründung
  missing: (ctx: RuleContext) => string[]; // fehlende Angaben
  dependsOn: string[]; // Regel-IDs derselben Saison
  limits?: string;
  optional?: boolean; // optionaler Vorschlag, wird nachrangig angezeigt
}

const DRAFT: ContentMeta = {
  reviewStatus: 'entwurf',
  lastReviewed: null,
  sources: ['Allgemeine Rasenpflegepraxis, zusammengestellt für Rasenzeit – fachliche Prüfung ausstehend'],
};

// ---------- Hilfsfunktionen für Begründungen ----------

export function soilLine(area: LawnArea): string {
  const t = area.soil.type;
  if (t.value === 'unbekannt') return 'Bodenart: noch nicht angegeben.';
  const src = t.source ? SOIL_SOURCE_LABEL[t.source] : 'Herkunft unbekannt';
  const estimated = t.source !== 'analyse';
  return `Bodenart: ${SOIL_TYPE_LABEL[t.value].toLowerCase()} (${src}${estimated ? ', also geschätzt' : ', gemessen bzw. bestätigt'}).`;
}

function latestPh(ctx: RuleContext): SoilMeasurement | null {
  const withPh = ctx.measurements.filter((m) => m.ph != null).sort((a, b) => b.date.localeCompare(a.date));
  return withPh[0] ?? null;
}

function hasFertilizerWithDosage(ctx: RuleContext) {
  return ctx.products.some((p) => p.category === 'duenger' && p.dosage);
}

function has(ctx: RuleContext, flag: LawnArea['condition'][number]) {
  return ctx.area.condition.includes(flag);
}

function conditionLine(ctx: RuleContext): string {
  const a = ctx.area;
  if (!a.condition.length) return 'Rasenzustand: noch nicht eingeschätzt.';
  return `Rasenzustand${a.conditionAssessedAt ? ` (eingeschätzt am ${fmtDate(a.conditionAssessedAt)})` : ''} wurde berücksichtigt.`;
}

// ---------- Regeln ----------

export const RULES: PlanningRule[] = [
  {
    ...DRAFT,
    id: 'R-KONTROLLE-FJ',
    title: 'Rasenzustand prüfen',
    category: 'kontrolle',
    window: { start: [3, 1], end: [4, 15] },
    requiredInputs: ['jahreszeit'],
    considers: ['zustand', 'nutzung'],
    conditionText: 'Gilt für jede Fläche zu Beginn der Saison.',
    applies: () => true,
    description: 'Fläche ansehen und Veränderungen festhalten: Lücken, Moos, Verfärbungen, Fremdpflanzen.',
    rationale:
      'Eine kurze Durchsicht zu Saisonbeginn zeigt, welche weiteren Arbeiten überhaupt nötig sind. Folgeaufgaben wie Nachsaat oder Vertikutieren hängen davon ab.',
    explain: (ctx) => [
      conditionLine(ctx),
      ctx.area.usage !== 'unbekannt' ? `Nutzung: ${USAGE_LABEL[ctx.area.usage]}.` : 'Nutzung: nicht angegeben.',
      'Tipp: Ein Foto derselben Stelle wie im Vorjahr erleichtert den Vergleich.',
    ],
    missing: () => [],
    dependsOn: [],
  },
  {
    ...DRAFT,
    id: 'R-MAEHEN-START',
    title: 'Ersten Schnitt der Saison planen',
    category: 'maehen',
    window: { start: [3, 20], end: [4, 30] },
    requiredInputs: ['jahreszeit'],
    considers: ['licht', 'geraete'],
    conditionText: 'Sobald der Rasen sichtbar wächst und der Boden betretbar ist.',
    applies: (ctx) => !has(ctx, 'frisch_angelegt'),
    description: 'Ersten Schnitt nicht zu tief ansetzen und Mäher vorher prüfen.',
    rationale:
      'Nach dem Winter ist der Rasen oft geschwächt. Ein eher hoher erster Schnitt schont die Gräser. Der richtige Zeitpunkt hängt vom tatsächlichen Wachstum ab, nicht vom Kalender.',
    explain: (ctx) => {
      const out = [`Licht: ${LIGHT_LABEL[ctx.area.light]}.`];
      if (ctx.area.light === 'schattig' || ctx.area.light === 'halbschattig')
        out.push('In schattigen Bereichen wird häufig empfohlen, etwas höher zu mähen – genaue Höhen hängen von Gräsermischung und Gerät ab.');
      const mower = ctx.devices.find((d) => d.type === 'rasenmaeher' || d.type === 'maehroboter');
      out.push(mower ? `Hinterlegtes Gerät: ${mower.name}.` : 'Kein Mäher hinterlegt.');
      return out;
    },
    missing: () => [],
    dependsOn: ['R-KONTROLLE-FJ'],
  },
  {
    ...DRAFT,
    id: 'R-DUENGEN-FJ',
    title: 'Düngung planen',
    category: 'duengen',
    window: { start: [3, 25], end: [5, 15] },
    requiredInputs: ['letzte_duengung', 'duenger_mit_dosierung'],
    considers: ['zustand', 'bodenart', 'ph'],
    conditionText: 'Nach der Zustandsprüfung, wenn der Rasen wächst. Menge nur nach Herstellerangabe.',
    applies: (ctx) => !has(ctx, 'frisch_angelegt'),
    description: 'Letzte Anwendung und Produkt eintragen, Menge nach Packungsangabe berechnen.',
    rationale:
      'Ob und wie viel gedüngt wird, hängt vom Produkt, dem Zustand und dem bisherigen Verlauf ab. Rasenzeit nennt keine Mengen ohne hinterlegte Herstellerdosierung.',
    explain: (ctx) => {
      const out = [conditionLine(ctx), soilLine(ctx.area)];
      if (ctx.area.soil.type.value !== 'unbekannt')
        out.push('Die Bodenart allein erlaubt keine Aussage über den Nährstoffbedarf. Dafür wäre eine Bodenanalyse nötig.');
      const ph = latestPh(ctx);
      if (ph) out.push(`Letzte pH-Messung: ${ph.ph!.toLocaleString('de-DE')} am ${fmtDate(ph.date)}.`);
      if (ctx.area.lastCare.fertilizing) out.push(`Letzte Düngung laut deinen Angaben: ${fmtDate(ctx.area.lastCare.fertilizing)}.`);
      return out;
    },
    missing: (ctx) => {
      const m: string[] = [];
      if (!ctx.area.lastCare.fertilizing) m.push('Datum der letzten Düngung');
      if (!hasFertilizerWithDosage(ctx)) m.push('Dünger mit Dosierung von der Verpackung');
      return m;
    },
    dependsOn: ['R-KONTROLLE-FJ'],
    limits: 'Keine Mengenempfehlung ohne Herstellerdosierung. Kalkgaben nur nach Messung, nicht nach Bodenart.',
  },
  {
    ...DRAFT,
    id: 'R-VERTIKUTIEREN',
    title: 'Moos entfernen / vertikutieren',
    category: 'vertikutieren',
    window: { start: [4, 10], end: [5, 31] },
    requiredInputs: ['zustand'],
    considers: ['licht', 'wasserverhalten', 'verdichtung', 'ph'],
    conditionText: 'Nur wenn Moos angegeben ist und die Fläche nicht frisch angelegt wurde.',
    applies: (ctx) => has(ctx, 'moos') && !has(ctx, 'frisch_angelegt'),
    description: 'Moos und Rasenfilz bei wüchsigem Wetter mechanisch entfernen.',
    rationale:
      'Vertikutieren entfernt Moos und Filz, behebt aber nicht die Ursache. Moos kann mehrere Gründe haben, etwa Schatten, dauerhafte Feuchtigkeit, Verdichtung oder einen niedrigen pH-Wert.',
    explain: (ctx) => {
      const out = ['Du hast Moos als aktuellen Zustand angegeben.', `Licht: ${LIGHT_LABEL[ctx.area.light]}.`];
      const w = ctx.area.soil.water.value;
      if (w !== 'unbekannt') out.push(`Wasserverhalten (Beobachtung): ${WATER_LABEL[w]}.`);
      const c = ctx.area.soil.compaction.value;
      if (c !== 'unbekannt') out.push(`Verdichtung: ${COMPACTION_LABEL[c]}.`);
      if (!latestPh(ctx)) out.push('Ein pH-Wert ist nicht hinterlegt – die Ursache bleibt daher offen.');
      return out;
    },
    missing: () => [],
    dependsOn: ['R-KONTROLLE-FJ'],
    limits: 'Nicht direkt nach einer Neuansaat. Zu tiefes Vertikutieren kann die Grasnarbe schädigen.',
  },
  {
    ...DRAFT,
    id: 'R-NACHSAAT-FJ',
    title: 'Nachsaat vorbereiten',
    category: 'nachsaat',
    window: { start: [4, 20], end: [5, 31] },
    requiredInputs: ['zustand'],
    considers: ['licht', 'saatgut', 'nutzung'],
    conditionText: 'Wenn Lücken oder kahle Stellen angegeben sind. Abhängig von Zustand und Bedingungen.',
    applies: (ctx) => has(ctx, 'lueckig') || has(ctx, 'kahle_stellen'),
    description: 'Stellen auflockern, passendes Saatgut bereitlegen, Keimphase feucht halten.',
    rationale:
      'Lücken werden sonst oft von Moos oder Fremdpflanzen besiedelt. Saatgut keimt erst bei ausreichender Bodentemperatur und Feuchtigkeit.',
    explain: (ctx) => {
      const out = ['Du hast Lücken oder kahle Stellen angegeben.', `Licht: ${LIGHT_LABEL[ctx.area.light]}.`];
      if (ctx.area.light === 'schattig' || ctx.area.light === 'halbschattig')
        out.push('Für schattige Flächen gibt es eigens ausgewiesene Saatmischungen.');
      if (ctx.area.usage === 'spiel' || ctx.area.usage === 'strapazier')
        out.push('Bei starker Nutzung ist eine Mischung für Strapazierrasen üblich.');
      return out;
    },
    missing: (ctx) => (ctx.products.some((p) => p.category === 'saatgut') ? [] : ['Saatgut in deiner Produktliste']),
    dependsOn: ['R-KONTROLLE-FJ', 'R-VERTIKUTIEREN'],
  },
  {
    ...DRAFT,
    id: 'R-PH-MESSEN',
    optional: true,
    title: 'pH-Wert messen (optional)',
    category: 'boden',
    window: { start: [3, 1], end: [10, 31] },
    requiredInputs: [],
    considers: ['zustand', 'ph'],
    conditionText: 'Wenn Moos angegeben ist und keine pH-Messung der letzten drei Jahre vorliegt.',
    applies: (ctx) => {
      if (!has(ctx, 'moos')) return false;
      const ph = latestPh(ctx);
      return !ph || Number(ph.date.slice(0, 4)) < ctx.year - 3;
    },
    description: 'Mit einem Test oder einer Laboranalyse den pH-Wert bestimmen und in „Mein Boden“ eintragen.',
    rationale:
      'Ein niedriger pH-Wert ist eine von mehreren möglichen Ursachen für Moos. Ohne Messung lässt sich das nicht beurteilen. Kalk sollte nicht ohne Messwert ausgebracht werden.',
    explain: (ctx) => ['Du hast Moos angegeben.', latestPh(ctx) ? `Letzte Messung ist älter als drei Jahre.` : 'Bisher ist keine pH-Messung hinterlegt.'],
    missing: () => [],
    dependsOn: [],
  },
  {
    ...DRAFT,
    id: 'R-VERDICHTUNG',
    title: 'Verdichtung prüfen (Spatenprobe)',
    category: 'boden',
    window: { start: [4, 1], end: [10, 31] },
    requiredInputs: [],
    considers: ['wasserverhalten', 'verdichtung'],
    conditionText: 'Wenn Wasser stehen bleibt, die Fläche lange feucht bleibt oder Verdichtung vermutet wird – und noch nicht bestätigt ist.',
    applies: (ctx) => {
      const w = ctx.area.soil.water.value;
      const c = ctx.area.soil.compaction.value;
      if (c === 'bestaetigt' || c === 'keine') return false;
      return w === 'staunaesse' || w === 'lange_feucht' || c === 'vermutet';
    },
    description: 'Einen Spaten tief einstechen und prüfen, ob eine feste Schicht oder schlechte Durchwurzelung erkennbar ist. Ergebnis im Bodenprofil eintragen.',
    rationale:
      'Stehendes Wasser kann auf Verdichtung hindeuten, aber auch andere Ursachen haben. Erst eine Untersuchung zeigt, ob tatsächlich eine Verdichtung vorliegt.',
    explain: (ctx) => {
      const out: string[] = [];
      const w = ctx.area.soil.water;
      if (w.value !== 'unbekannt') out.push(`Deine Beobachtung: ${WATER_LABEL[w.value]}${w.period ? ` (${w.period})` : ''}. Das ist ein Hinweis, keine bestätigte Ursache.`);
      if (ctx.area.soil.compaction.value === 'vermutet') out.push('Du vermutest eine Verdichtung.');
      out.push(soilLine(ctx.area));
      return out;
    },
    missing: () => [],
    dependsOn: [],
  },
  {
    ...DRAFT,
    id: 'R-AERIFIZIEREN',
    title: 'Aerifizieren erwägen',
    category: 'boden',
    window: { start: [9, 1], end: [10, 15] },
    requiredInputs: ['verdichtung'],
    considers: ['verdichtung'],
    conditionText: 'Nur wenn eine Verdichtung durch Untersuchung bestätigt wurde.',
    applies: (ctx) => ctx.area.soil.compaction.value === 'bestaetigt',
    description: 'Boden mit Hohlspoons oder Spikes lockern, um Luft und Wasser in den Wurzelraum zu bringen.',
    rationale: 'Bei bestätigter Verdichtung kann Aerifizieren die Durchlüftung verbessern. Ohne Bestätigung wird diese Arbeit nicht vorgeschlagen.',
    explain: (ctx) => {
      const c = ctx.area.soil.compaction;
      return [`Verdichtung bestätigt${c.date ? ` am ${fmtDate(c.date)}` : ''}${c.method ? ` (${c.method})` : ''}.`];
    },
    missing: () => [],
    dependsOn: [],
  },
  {
    ...DRAFT,
    id: 'R-BEWAESSERUNG',
    title: 'Bewässerung beobachten',
    category: 'bewaesserung',
    window: { start: [6, 1], end: [8, 31] },
    requiredInputs: [],
    considers: ['bodenart', 'wasserverhalten'],
    conditionText: 'Wenn der Boden als sandig angegeben ist oder du beobachtest, dass er schnell austrocknet.',
    applies: (ctx) => ctx.area.soil.type.value === 'sandig' || ctx.area.soil.water.value === 'trocknet_schnell',
    description: 'In Trockenphasen auf Anzeichen von Trockenstress achten (Fußspuren bleiben sichtbar, Halme rollen sich ein) und eher selten, dafür durchdringend wässern.',
    rationale:
      'Sandige Böden speichern Wasser in der Regel schlechter. Eine feste Wassermenge lässt sich daraus nicht ableiten – sie hängt von Wetter, Gräsern und Wurzeltiefe ab.',
    explain: (ctx) => {
      const out = [soilLine(ctx.area)];
      const w = ctx.area.soil.water.value;
      if (w !== 'unbekannt') out.push(`Deine Beobachtung: ${WATER_LABEL[w]}.`);
      out.push('Es sind keine Wetterdaten angebunden. Rasenzeit kennt die aktuelle Niederschlagsmenge daher nicht.');
      return out;
    },
    missing: () => [],
    dependsOn: [],
    limits: 'Keine Literangaben ohne Wetterdaten und Messung.',
  },
  {
    ...DRAFT,
    id: 'R-KONTROLLE-HB',
    title: 'Rasenzustand prüfen',
    category: 'kontrolle',
    window: { start: [8, 20], end: [9, 20] },
    requiredInputs: ['jahreszeit'],
    considers: ['zustand'],
    conditionText: 'Gilt für jede Fläche nach dem Sommer.',
    applies: () => true,
    description: 'Fläche ansehen und Veränderungen festhalten.',
    rationale: 'Nach dem Sommer zeigt sich, wo Trockenheit oder Nutzung Spuren hinterlassen haben. Davon hängt ab, ob eine Herbstnachsaat sinnvoll ist.',
    explain: (ctx) => [conditionLine(ctx)],
    missing: () => [],
    dependsOn: [],
  },
  {
    ...DRAFT,
    id: 'R-DUENGEN-SP',
    title: 'Düngebedarf prüfen',
    category: 'duengen',
    window: { start: [8, 25], end: [9, 30] },
    requiredInputs: ['letzte_duengung', 'duenger_mit_dosierung'],
    considers: ['zustand', 'bodenart'],
    conditionText: 'Nach der Zustandsprüfung im Spätsommer.',
    applies: (ctx) => !has(ctx, 'frisch_angelegt'),
    description: 'Prüfen, ob eine weitere Düngung sinnvoll ist. Produkt und letzte Anwendung berücksichtigen.',
    rationale: 'Ob eine Spätsommer- oder Herbstdüngung sinnvoll ist, hängt vom Produkt (Herstellerangabe) und vom bisherigen Verlauf ab.',
    explain: (ctx) => {
      const out = [conditionLine(ctx), soilLine(ctx.area)];
      if (ctx.area.lastCare.fertilizing) out.push(`Letzte Düngung laut deinen Angaben: ${fmtDate(ctx.area.lastCare.fertilizing)}.`);
      return out;
    },
    missing: (ctx) => {
      const m: string[] = [];
      if (!ctx.area.lastCare.fertilizing) m.push('Datum der letzten Düngung');
      if (!hasFertilizerWithDosage(ctx)) m.push('Dünger mit Dosierung von der Verpackung');
      return m;
    },
    dependsOn: ['R-KONTROLLE-HB'],
  },
  {
    ...DRAFT,
    id: 'R-NACHSAAT-HB',
    title: 'Nachsaat vorbereiten',
    category: 'nachsaat',
    window: { start: [9, 1], end: [10, 10] },
    requiredInputs: ['zustand'],
    considers: ['licht', 'saatgut'],
    conditionText: 'Wenn Lücken oder kahle Stellen angegeben sind. Abhängig von Zustand und Bedingungen.',
    applies: (ctx) => has(ctx, 'lueckig') || has(ctx, 'kahle_stellen'),
    description: 'Stellen auflockern, passendes Saatgut bereitlegen, Keimphase feucht halten.',
    rationale: 'Der Spätsommer gilt häufig als günstiger Zeitraum für eine Nachsaat, weil der Boden noch warm ist. Entscheidend sind die tatsächlichen Bedingungen.',
    explain: (ctx) => ['Du hast Lücken oder kahle Stellen angegeben.', `Licht: ${LIGHT_LABEL[ctx.area.light]}.`],
    missing: (ctx) => (ctx.products.some((p) => p.category === 'saatgut') ? [] : ['Saatgut in deiner Produktliste']),
    dependsOn: ['R-KONTROLLE-HB'],
  },
  {
    ...DRAFT,
    id: 'R-LAUB',
    title: 'Laub entfernen',
    category: 'laub',
    window: { start: [10, 1], end: [11, 30] },
    requiredInputs: [],
    considers: ['licht'],
    conditionText: 'Wenn Laub auf die Fläche fällt.',
    applies: () => true,
    description: 'Laub regelmäßig abrechen oder aufnehmen, damit der Rasen Licht bekommt.',
    rationale: 'Liegt Laub länger auf dem Rasen, fehlt den Gräsern Licht und die Fläche bleibt feucht.',
    explain: () => ['Falls keine Bäume in der Nähe stehen, kannst du diese Aufgabe einfach löschen.'],
    missing: () => [],
    dependsOn: [],
  },
  {
    ...DRAFT,
    id: 'R-MAEHEN-ENDE',
    title: 'Letzten Schnitt vor dem Winter',
    category: 'maehen',
    window: { start: [10, 15], end: [11, 30] },
    requiredInputs: [],
    considers: ['geraete'],
    conditionText: 'Wenn das Wachstum spürbar nachlässt.',
    applies: () => true,
    description: 'Ein letztes Mal mähen, wenn der Rasen kaum noch wächst. Danach Mäher reinigen.',
    rationale: 'Sehr langes Gras über den Winter kann Pilzbefall begünstigen; sehr kurzes schwächt die Gräser. Den Zeitpunkt bestimmt das tatsächliche Wachstum.',
    explain: (ctx) => {
      const mower = ctx.devices.find((d) => d.type === 'rasenmaeher' || d.type === 'maehroboter');
      return [mower ? `Hinterlegtes Gerät: ${mower.name}.` : 'Kein Mäher hinterlegt.'];
    },
    missing: () => [],
    dependsOn: [],
  },
];

export function getRule(id: string): PlanningRule | undefined {
  return RULES.find((r) => r.id === id);
}

export const REVIEW_LABEL: Record<ContentMeta['reviewStatus'], string> = {
  geprueft: 'Fachlich geprüft',
  entwurf: 'Entwurf – fachlich noch nicht geprüft',
  demonstration: 'Demonstrationsregel',
};
