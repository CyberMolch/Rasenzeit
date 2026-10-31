// Weitere Rasenprobleme. Prüfstatus: Entwurf. Ursachen werden als Möglichkeiten,
// nicht als Diagnose dargestellt.

import type { ContentMeta } from '../domain/types';

export interface Problem extends ContentMeta {
  id: string;
  title: string;
  keywords: string[];
  icon: 'moss' | 'dry' | 'water' | 'mushroom';
  summary: string;
  possibleCauses: { title: string; text: string; checkSoil?: boolean }[];
  checks: string[];
  measures: { title: string; text: string }[];
  limits: string[];
  soilRelevant: boolean;
}

const DRAFT: ContentMeta = {
  reviewStatus: 'entwurf',
  lastReviewed: null,
  sources: ['Allgemeine Rasenpflegepraxis, zusammengestellt für Rasenzeit – fachliche Prüfung ausstehend'],
};

export const PROBLEMS: Problem[] = [
  {
    ...DRAFT,
    id: 'moos-kahle-stellen',
    title: 'Moos und kahle Stellen',
    keywords: ['moos', 'kahl', 'lücken', 'lückig', 'dünn'],
    icon: 'moss',
    summary: 'Moos und Lücken treten oft gemeinsam auf. Meist wirken mehrere Ursachen zusammen.',
    possibleCauses: [
      { title: 'Wenig Licht', text: 'Gräser wachsen im Schatten schwächer, Moos kommt damit besser zurecht.' },
      { title: 'Dauerhafte Feuchtigkeit', text: 'Bereiche, die lange nass bleiben, begünstigen Moos.', checkSoil: true },
      { title: 'Verdichteter Boden', text: 'Wurzeln und Wasser dringen schlechter ein.', checkSoil: true },
      { title: 'Niedriger pH-Wert', text: 'Nur durch eine Messung feststellbar – nicht am Moos selbst.', checkSoil: true },
      { title: 'Zu tiefer Schnitt', text: 'Sehr kurzer Rasen lässt Licht auf den Boden und schwächt die Gräser.' },
    ],
    checks: ['Wie viele Stunden Sonne bekommt die Stelle?', 'Bleibt Wasser nach Regen stehen?', 'Spatenprobe: Gibt es eine feste Schicht?', 'Gibt es eine aktuelle pH-Messung?'],
    measures: [
      { title: 'Moos mechanisch entfernen', text: 'Vertikutieren oder kräftig ausrechen bei wüchsigem Wetter.' },
      { title: 'Lücken nachsäen', text: 'Passende Saatmischung für Licht und Nutzung wählen.' },
      { title: 'Ursache klären', text: 'Licht, Feuchtigkeit, Verdichtung und pH-Wert prüfen, bevor weitere Mittel eingesetzt werden.' },
    ],
    limits: ['Kalk nur nach pH-Messung – nicht allein wegen Moos.', 'In tiefem Schatten bleibt Rasen oft dauerhaft schwach.'],
    soilRelevant: true,
  },
  {
    ...DRAFT,
    id: 'braune-gelbe-flaechen',
    title: 'Braune oder gelbe Flächen',
    keywords: ['braun', 'gelb', 'vertrocknet', 'verfärbt', 'flecken'],
    icon: 'dry',
    summary: 'Verfärbungen haben viele mögliche Ursachen. Form, Zeitpunkt und Verlauf helfen bei der Eingrenzung.',
    possibleCauses: [
      { title: 'Trockenheit', text: 'Großflächige, gleichmäßige Verfärbung in Trockenphasen. Rasen erholt sich oft nach Regen.', checkSoil: true },
      { title: 'Überdüngung oder verschütteter Dünger', text: 'Scharf begrenzte Flecken oder Streifen, oft nach dem Düngen.' },
      { title: 'Hundeurin', text: 'Runde Flecken, häufig mit sattgrünem Rand.' },
      { title: 'Zu tiefer Schnitt oder stumpfes Messer', text: 'Ausgefranste, hell verfärbte Halmspitzen.' },
      { title: 'Pilzkrankheiten oder Schädlinge', text: 'Sind ohne genaue Untersuchung schwer zu erkennen. Bei Ausbreitung fachlichen Rat einholen.' },
    ],
    checks: ['Seit wann besteht die Verfärbung?', 'Ist sie fleckig oder großflächig?', 'Wurde kürzlich gedüngt oder gemäht?', 'Lassen sich Halme leicht herausziehen?'],
    measures: [
      { title: 'Beobachten und dokumentieren', text: 'Fotos derselben Stelle im Abstand einiger Tage festhalten.' },
      { title: 'Bewässerung prüfen', text: 'In Trockenphasen eher selten und durchdringend wässern.' },
      { title: 'Mähen prüfen', text: 'Schnitthöhe und Messerschärfe kontrollieren.' },
    ],
    limits: ['Rasenzeit stellt keine Diagnose. Bei sich schnell ausbreitenden Schäden hilft eine Fachberatung.'],
    soilRelevant: true,
  },
  {
    ...DRAFT,
    id: 'staunaesse',
    title: 'Pfützen und Staunässe',
    keywords: ['pfütze', 'nass', 'staunässe', 'wasser', 'matschig'],
    icon: 'water',
    summary: 'Wasser, das nach Regen lange stehen bleibt, kann auf Verdichtung oder schwer durchlässigen Boden hinweisen.',
    possibleCauses: [
      { title: 'Verdichtung', text: 'Durch Befahren, Betreten oder Bauarbeiten.', checkSoil: true },
      { title: 'Bindiger Boden', text: 'Tonige Böden leiten Wasser langsamer ab.', checkSoil: true },
      { title: 'Senke im Gelände', text: 'Wasser sammelt sich an der tiefsten Stelle.' },
    ],
    checks: ['Wie lange bleibt das Wasser stehen?', 'Betrifft es die ganze Fläche oder eine Stelle?', 'Spatenprobe durchführen.'],
    measures: [
      { title: 'Beobachtung festhalten', text: 'Wasserverhalten im Bodenprofil eintragen, mit Datum und Teilbereich.' },
      { title: 'Verdichtung prüfen', text: 'Erst bei bestätigter Verdichtung lockernde Maßnahmen planen.' },
    ],
    limits: ['Größere Entwässerungsprobleme erfordern fachliche Planung.'],
    soilRelevant: true,
  },
  {
    ...DRAFT,
    id: 'pilze',
    title: 'Pilze im Rasen',
    keywords: ['pilz', 'pilze', 'hexenring', 'fruchtkörper'],
    icon: 'mushroom',
    summary: 'Hutpilze im Rasen sind meist die sichtbaren Fruchtkörper von Pilzen, die organisches Material im Boden zersetzen.',
    possibleCauses: [
      { title: 'Organisches Material im Boden', text: 'Alte Wurzeln, Holzreste oder Rasenfilz.' },
      { title: 'Feuchte Witterung', text: 'Fruchtkörper erscheinen oft nach Regenphasen, vor allem im Spätsommer und Herbst.' },
    ],
    checks: ['Wachsen die Pilze im Kreis (Hexenring)?', 'Ist der Rasen darunter geschädigt?'],
    measures: [
      { title: 'Fruchtkörper entfernen', text: 'Mit Handschuhen abnehmen, wenn Kinder oder Haustiere die Fläche nutzen. Pilze nicht verzehren.' },
      { title: 'Rasenfilz reduzieren', text: 'Bei starkem Filz vertikutieren.' },
    ],
    limits: ['Rasenzeit bestimmt keine Pilzarten.'],
    soilRelevant: false,
  },
];

export function getProblem(id: string) {
  return PROBLEMS.find((p) => p.id === id);
}
