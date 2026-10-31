import type {
  Compaction, ConditionFlag, DeviceType, Extent, IdentificationState, JournalType, Light,
  MeasureMethod, ProductCategory, SoilSource, SoilType, TaskCategory, TaskStatus, Usage, WaterBehaviour,
} from './types';

export const LIGHT_LABEL: Record<Light, string> = {
  sonnig: 'Sonnig',
  halbschattig: 'Halbschattig',
  schattig: 'Schattig',
  gemischt: 'Teils sonnig, teils schattig',
  unbekannt: 'Licht unbekannt',
};

export const USAGE_LABEL: Record<Usage, string> = {
  zier: 'Zierrasen, kaum betreten',
  freizeit: 'Freizeit und Familie',
  spiel: 'Spielrasen, stark genutzt',
  strapazier: 'Sehr stark beansprucht (Sport, Hund)',
  unbekannt: 'Nicht angegeben',
};

export const CONDITION_LABEL: Record<ConditionFlag, string> = {
  dicht: 'Überwiegend dicht und gleichmäßig',
  lueckig: 'Lückig / dünn',
  kahle_stellen: 'Kahle Stellen',
  moos: 'Moos sichtbar',
  unkraut: 'Unkraut / Fremdpflanzen sichtbar',
  verfaerbt: 'Braune oder gelbe Bereiche',
  frisch_angelegt: 'Frisch angelegt oder neu eingesät',
};

export const SOIL_TYPE_LABEL: Record<SoilType, string> = {
  sandig: 'Sandig',
  lehmig: 'Lehmig',
  tonig: 'Tonig',
  schluffig: 'Schluffig',
  misch: 'Mischboden / nicht eindeutig',
  unbekannt: 'Weiß ich nicht',
};

export const SOIL_TYPE_HINT: Record<SoilType, string> = {
  sandig: 'Fühlt sich körnig an, rieselt, hält kaum zusammen.',
  lehmig: 'Etwas körnig und etwas bindig, lässt sich formen, bricht aber.',
  tonig: 'Klebrig, formbar, glänzt beim Reiben, wird trocken hart.',
  schluffig: 'Mehlig-samtig, kaum körnig, wenig klebrig.',
  misch: 'Mehrere Eigenschaften oder nicht klar zuzuordnen.',
  unbekannt: 'Kein Problem – du kannst das später ergänzen.',
};

export const SOIL_SOURCE_LABEL: Record<SoilSource, string> = {
  eigene: 'eigene Einschätzung',
  bestimmungshilfe: 'grobe Einschätzung mit Bestimmungshilfe',
  analyse: 'Bodenanalyse / fachlich bestätigt',
};

export const WATER_LABEL: Record<WaterBehaviour, string> = {
  trocknet_schnell: 'Trocknet nach meiner Beobachtung schnell aus',
  lange_feucht: 'Bleibt häufig lange feucht',
  staunaesse: 'Wasser bleibt nach Regen stehen',
  unauffaellig: 'Keine Auffälligkeiten beobachtet',
  unbekannt: 'Nicht bekannt',
};

export const COMPACTION_LABEL: Record<Compaction, string> = {
  vermutet: 'Vermutet',
  bestaetigt: 'Durch Untersuchung bestätigt',
  keine: 'Keine Verdichtung festgestellt',
  unbekannt: 'Nicht bekannt',
};

export const METHOD_LABEL: Record<MeasureMethod, string> = {
  teststreifen: 'Teststreifen / Schnelltest',
  messgeraet: 'Elektronisches Messgerät',
  labor: 'Laboranalyse',
  sonstige: 'Sonstige Methode',
};

export const CATEGORY_LABEL: Record<TaskCategory, string> = {
  kontrolle: 'Kontrolle',
  maehen: 'Mähen',
  duengen: 'Düngen',
  nachsaat: 'Nachsaat',
  vertikutieren: 'Vertikutieren',
  bewaesserung: 'Bewässerung',
  boden: 'Boden',
  laub: 'Laub',
  unkraut: 'Unkraut',
  sonstiges: 'Sonstiges',
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  geplant: 'Geplant',
  erledigt: 'Erledigt',
  verschoben: 'Verschoben',
};

export const JOURNAL_TYPE_LABEL: Record<JournalType, string> = {
  pflege: 'Pflege',
  beobachtung: 'Beobachtung',
  messung: 'Messung',
  produkt: 'Produkt',
  notiz: 'Notiz',
};

export const PRODUCT_CATEGORY_LABEL: Record<ProductCategory, string> = {
  duenger: 'Dünger',
  saatgut: 'Saatgut',
  bodenhilfsstoff: 'Bodenhilfsstoff',
  kalk: 'Kalk',
  sonstiges: 'Sonstiges',
};

export const DEVICE_TYPE_LABEL: Record<DeviceType, string> = {
  rasenmaeher: 'Rasenmäher',
  maehroboter: 'Mähroboter',
  vertikutierer: 'Vertikutierer / Lüfter',
  streuwagen: 'Streuwagen',
  trimmer: 'Trimmer / Kantenschneider',
  regner: 'Regner / Bewässerung',
  handwerkzeug: 'Handwerkzeug',
  sonstiges: 'Sonstiges',
};

export const EXTENT_LABEL: Record<Extent, string> = {
  einzeln: 'Einzelne Pflanzen',
  kleine_stelle: 'Eine kleine Stelle',
  mehrere_stellen: 'Mehrere Stellen',
  grossflaechig: 'Großflächig',
  unbekannt: 'Nicht eingeschätzt',
};

export const IDENT_LABEL: Record<IdentificationState, string> = {
  vermutet: 'Vermutet',
  eigene_bestimmung: 'Eigene Bestimmung',
  unbestimmt: 'Noch unbestimmt',
};

export function options<T extends string>(map: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(map) as T[]).map((value) => ({ value, label: map[value] }));
}
