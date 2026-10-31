// Bestimmungshilfen ohne KI: Unkraut eingrenzen und Bodenart grob einschätzen.
// Prüfstatus: Entwurf. Keine Prozent- oder Sicherheitswerte.

import type { SoilType } from '../domain/types';
import type { FeatureKey } from './plants';
import { PLANTS, type Plant } from './plants';

export const UNKNOWN = 'unbekannt';

export interface GuideOption {
  value: string;
  label: string;
  hint?: string;
  figure?: string; // Kennung einer Abbildung (siehe ui/Figures.tsx)
}

export interface GuideQuestion {
  id: string;
  title: string;
  help: string;
  options: GuideOption[];
  /** Frage nur stellen, wenn diese Bedingung erfüllt ist */
  when?: (answers: Record<string, string>) => boolean;
}

// ---------- Unkraut eingrenzen ----------

export const WEED_QUESTIONS: GuideQuestion[] = [
  {
    id: 'wuchsform',
    title: 'Wie sieht die Pflanze grundsätzlich aus?',
    help: 'Schau dir die Blätter an: schmal und lang wie Gras – oder breiter, mit erkennbarer Blattfläche?',
    options: [
      { value: 'grasartig', label: 'Grasartig – schmale, lange Blätter', figure: 'leaf-grass' },
      { value: 'krautig', label: 'Krautig – breitere Blätter', figure: 'leaf-broad' },
    ],
  },
  {
    id: 'blatt',
    title: 'Welche Blattform passt am ehesten?',
    help: 'Nimm ein typisches, ausgewachsenes Blatt.',
    when: (a) => a.wuchsform !== 'grasartig',
    options: [
      { value: 'rund_gekerbt', label: 'Rundlich bis nierenförmig, Rand gekerbt', figure: 'leaf-round' },
      { value: 'dreizaehlig', label: 'Drei Teilblättchen an einem Stiel', figure: 'leaf-three' },
      { value: 'gezaehnt_rosette', label: 'Länglich und tief gezähnt', figure: 'leaf-toothed' },
      { value: 'andere', label: 'Keine dieser Formen' },
    ],
  },
  {
    id: 'bluete',
    title: 'Welche Blüten sind zu sehen?',
    help: 'Ohne Blüte ist eine Eingrenzung schwieriger – „weiß ich nicht“ ist dann eine gute Antwort.',
    when: (a) => a.wuchsform !== 'grasartig',
    options: [
      { value: 'blau_violett', label: 'Kleine blauviolette Blüten' },
      { value: 'weiss_kugelig', label: 'Weiße, kugelige Köpfchen' },
      { value: 'gelb_einzeln', label: 'Eine große gelbe Blüte je Stängel' },
      { value: 'keine', label: 'Gerade keine Blüten' },
      { value: 'andere', label: 'Andere Blüten' },
    ],
  },
  {
    id: 'aehren',
    title: 'Gehen vom Stängelende mehrere schmale Ähren fingerartig aus?',
    help: 'Nur bei blühenden Gräsern erkennbar, meist ab Hochsommer.',
    when: (a) => a.wuchsform === 'grasartig',
    options: [
      { value: 'ja', label: 'Ja, mehrere Ähren von einem Punkt', figure: 'spikes-finger' },
      { value: 'nein', label: 'Nein, anderer Blütenstand' },
    ],
  },
  {
    id: 'wuchs',
    title: 'Wie wächst die Pflanze?',
    help: 'Hebe die Pflanze vorsichtig an und verfolge die Triebe.',
    options: [
      { value: 'kriechend', label: 'Kriechend, mit Ausläufern über den Boden', figure: 'growth-creeping' },
      { value: 'rosette', label: 'Flache Rosette am Boden', figure: 'growth-rosette' },
      { value: 'bueschel', label: 'Büschel, aufrecht oder ausgebreitet' },
    ],
  },
  {
    id: 'geruch',
    title: 'Riecht ein zerriebenes Blatt würzig?',
    help: 'Ein Blatt zwischen den Fingern zerreiben.',
    when: (a) => a.wuchsform !== 'grasartig',
    options: [
      { value: 'aromatisch', label: 'Ja, deutlich würzig' },
      { value: 'unauffaellig', label: 'Nein, kaum Geruch' },
    ],
  },
  {
    id: 'milchsaft',
    title: 'Tritt beim Abbrechen eines Blattes weißer Milchsaft aus?',
    help: 'Blatt oder Stängel abbrechen und auf die Bruchstelle schauen.',
    when: (a) => a.wuchsform !== 'grasartig',
    options: [
      { value: 'ja', label: 'Ja, weißer Saft' },
      { value: 'nein', label: 'Nein' },
    ],
  },
];

export interface WeedCandidate {
  plant: Plant;
  matches: string[]; // Frage-IDs mit Übereinstimmung
  conflicts: string[];
}

export interface WeedResult {
  answered: number;
  candidates: WeedCandidate[]; // ohne Widerspruch, sortiert nach Übereinstimmungen
  excluded: WeedCandidate[];
  verdict: 'zu_wenig' | 'eine_moeglichkeit' | 'mehrere' | 'keine';
}

export function evaluateWeed(answers: Record<string, string>): WeedResult {
  const active = WEED_QUESTIONS.filter((q) => !q.when || q.when(answers));
  const known = active.filter((q) => answers[q.id] && answers[q.id] !== UNKNOWN);
  const all: WeedCandidate[] = PLANTS.map((plant) => {
    const matches: string[] = [];
    const conflicts: string[] = [];
    for (const q of known) {
      const expected = plant.traits[q.id as FeatureKey];
      if (!expected || expected.length === 0) continue;
      if (expected.includes(answers[q.id])) matches.push(q.id);
      else conflicts.push(q.id);
    }
    return { plant, matches, conflicts };
  });
  const candidates = all.filter((c) => c.conflicts.length === 0).sort((a, b) => b.matches.length - a.matches.length);
  const excluded = all.filter((c) => c.conflicts.length > 0);
  let verdict: WeedResult['verdict'];
  if (known.length < 2) verdict = 'zu_wenig';
  else if (candidates.length === 0) verdict = 'keine';
  else if (candidates.length === 1 && candidates[0].matches.length >= 3) verdict = 'eine_moeglichkeit';
  else verdict = 'mehrere';
  return { answered: known.length, candidates, excluded, verdict };
}

// ---------- Bodenart grob einschätzen (Fingerprobe, vereinfacht) ----------

export const SOIL_GUIDE_INTRO = [
  'Nimm mit einem Spaten eine Probe aus etwa 10 bis 20 cm Tiefe, unterhalb der Grasnarbe.',
  'Entferne Steine, Wurzeln und Pflanzenreste.',
  'Feuchte eine walnussgroße Menge an, bis sie formbar ist, aber nicht tropft.',
  'Beantworte dann die Fragen. Bei Unsicherheit wähle „weiß ich nicht“.',
];

export const SOIL_QUESTIONS: GuideQuestion[] = [
  {
    id: 'koernig',
    title: 'Wie fühlt sich die Probe zwischen Daumen und Zeigefinger an?',
    help: 'Reibe die feuchte Probe dicht am Ohr – körnige Böden knirschen hörbar.',
    options: [
      { value: 'sandig', label: 'Deutlich körnig und rau, knirscht', figure: 'soil-grainy' },
      { value: 'mehlig', label: 'Samtig-mehlig, kaum Körner spürbar', figure: 'soil-silky' },
      { value: 'klebrig', label: 'Glatt und klebrig, keine Körner', figure: 'soil-sticky' },
      { value: 'gemischt', label: 'Etwas körnig und zugleich etwas klebrig' },
    ],
  },
  {
    id: 'rollen',
    title: 'Lässt sich die Probe zu einer bleistiftdicken Rolle formen?',
    help: 'Rolle die Probe auf der Handfläche aus.',
    options: [
      { value: 'zerfaellt', label: 'Nein, sie zerfällt sofort', figure: 'roll-crumble' },
      { value: 'bricht', label: 'Ja, aber sie reißt oder bricht beim Biegen', figure: 'roll-break' },
      { value: 'biegsam', label: 'Ja, sogar dünner – und sie lässt sich biegen', figure: 'roll-bend' },
    ],
  },
  {
    id: 'kleben',
    title: 'Bleibt Material an den Fingern haften?',
    help: 'Nach dem Reiben die Finger ansehen.',
    options: [
      { value: 'kaum', label: 'Kaum, die Finger sind schnell sauber' },
      { value: 'staubig', label: 'Feiner Belag in den Fingerrillen, wenig klebrig' },
      { value: 'stark', label: 'Stark klebrig' },
    ],
  },
  {
    id: 'glanz',
    title: 'Wie sieht die Reibfläche aus, wenn du mit dem Fingernagel darüberstreichst?',
    help: 'Die Probe vorher etwas glatt drücken.',
    options: [
      { value: 'stumpf', label: 'Stumpf' },
      { value: 'leicht', label: 'Leicht glänzend' },
      { value: 'stark', label: 'Deutlich glänzend' },
    ],
  },
];

/** Welche Bodenarten eine Antwort stützt. */
const SOIL_SUPPORT: Record<string, Record<string, SoilType[]>> = {
  koernig: { sandig: ['sandig'], mehlig: ['schluffig'], klebrig: ['tonig'], gemischt: ['lehmig'] },
  rollen: { zerfaellt: ['sandig'], bricht: ['lehmig', 'schluffig'], biegsam: ['tonig'] },
  kleben: { kaum: ['sandig'], staubig: ['schluffig', 'lehmig'], stark: ['tonig'] },
  glanz: { stumpf: ['sandig', 'schluffig'], leicht: ['lehmig'], stark: ['tonig'] },
};

export interface SoilGuideResult {
  answered: number;
  verdict: 'zu_wenig' | 'eindeutig' | 'widerspruechlich';
  suggestion: SoilType | null; // nur bei "eindeutig"
  supported: SoilType[]; // alle gestützten Bodenarten, geordnet nach Anzahl
  supportCount: Partial<Record<SoilType, number>>;
}

export function evaluateSoil(answers: Record<string, string>): SoilGuideResult {
  const count: Partial<Record<SoilType, number>> = {};
  let answered = 0;
  for (const q of SOIL_QUESTIONS) {
    const a = answers[q.id];
    if (!a || a === UNKNOWN) continue;
    answered++;
    for (const t of SOIL_SUPPORT[q.id]?.[a] ?? []) count[t] = (count[t] ?? 0) + 1;
  }
  const supported = (Object.keys(count) as SoilType[]).sort((a, b) => (count[b]! - count[a]!));
  if (answered < 3) return { answered, verdict: 'zu_wenig', suggestion: null, supported, supportCount: count };
  const top = supported[0];
  const topN = count[top] ?? 0;
  const second = supported[1] ? count[supported[1]]! : 0;
  // Eindeutig nur, wenn eine Bodenart von allen beantworteten Fragen gestützt wird und klar vorn liegt
  if (topN === answered && topN > second) return { answered, verdict: 'eindeutig', suggestion: top, supported, supportCount: count };
  return { answered, verdict: 'widerspruechlich', suggestion: null, supported, supportCount: count };
}
