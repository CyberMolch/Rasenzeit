// Zentrale Datenmodelle von Rasenzeit.
// Alle Datumsangaben werden als ISO-Datum "YYYY-MM-DD" gespeichert (ohne Zeitzone),
// Zeitstempel als ISO-String.

export const DATA_VERSION = 1;

export type ISODate = string; // YYYY-MM-DD
export type Timestamp = string; // ISO 8601

export type Plan = 'basis' | 'plus';

export interface User {
  id: 'user';
  name: string;
  plan: Plan; // vorbereitet für spätere Unterscheidung; aktuell sind alle Funktionen frei
  activeAreaId: string | null;
  remindersEnabled: boolean;
  region: Region | null;
  isDemo: boolean;
  dismissedRules: string[]; // "areaId|ruleId|season" – gelöschte Regelvorschläge nicht erneut erzeugen
  createdAt: Timestamp;
  dataVersion: number;
}

export interface Region {
  label: string; // z. B. "Raum Berlin"
  postalCode?: string;
  country: 'DE' | 'AT' | 'CH' | 'andere';
}

// ---------- Rasenfläche ----------

export type Light = 'sonnig' | 'halbschattig' | 'schattig' | 'gemischt' | 'unbekannt';
export type Usage = 'zier' | 'freizeit' | 'spiel' | 'strapazier' | 'unbekannt';
export type ConditionFlag =
  | 'dicht'
  | 'lueckig'
  | 'kahle_stellen'
  | 'moos'
  | 'unkraut'
  | 'verfaerbt'
  | 'frisch_angelegt';

export interface LastCare {
  mowing?: ISODate;
  fertilizing?: ISODate;
  fertilizingProductId?: string;
  scarifying?: ISODate;
  overseeding?: ISODate;
}

export interface LawnArea {
  id: string;
  name: string;
  sizeM2: number | null; // null = unbekannt
  light: Light;
  usage: Usage;
  condition: ConditionFlag[];
  conditionNote: string;
  conditionAssessedAt: ISODate | null;
  lastCare: LastCare;
  soil: SoilProfile;
  photoId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---------- Bodenprofil ----------

export type SoilType = 'sandig' | 'lehmig' | 'tonig' | 'schluffig' | 'misch' | 'unbekannt';
export type SoilSource = 'eigene' | 'bestimmungshilfe' | 'analyse';
export type WaterBehaviour =
  | 'trocknet_schnell'
  | 'lange_feucht'
  | 'staunaesse'
  | 'unauffaellig'
  | 'unbekannt';
export type Compaction = 'vermutet' | 'bestaetigt' | 'keine' | 'unbekannt';

export interface SoilTypeInfo {
  value: SoilType;
  source: SoilSource | null; // null bei "unbekannt"
  note: string; // z. B. bei Mischboden
  guideAnswers?: Record<string, string>; // Antworten der Bestimmungshilfe (Nachvollziehbarkeit)
  updatedAt: Timestamp | null;
}

export interface WaterInfo {
  value: WaterBehaviour;
  period: string; // Zeitpunkt oder Zeitraum der Beobachtung, frei formuliert
  subArea: string;
  note: string;
  photoId: string | null;
  updatedAt: Timestamp | null;
}

export interface CompactionInfo {
  value: Compaction;
  method: string; // z. B. Spatenprobe, Bodensonde
  date: ISODate | null;
  note: string;
  updatedAt: Timestamp | null;
}

export interface SoilProfile {
  type: SoilTypeInfo;
  water: WaterInfo;
  compaction: CompactionInfo;
}

export type MeasureMethod = 'teststreifen' | 'messgeraet' | 'labor' | 'sonstige';

export interface MeasuredValue {
  id: string;
  name: string;
  value: string; // originalgetreu als Text
  unit: string;
}

export interface SoilMeasurement {
  id: string;
  areaId: string;
  date: ISODate;
  method: MeasureMethod;
  methodNote: string; // z. B. Laborname, Extraktionsverfahren
  ph: number | null;
  values: MeasuredValue[];
  attachmentIds: string[];
  note: string;
  createdAt: Timestamp;
}

// ---------- Produkte & Geräte ----------

export type ProductCategory = 'duenger' | 'saatgut' | 'bodenhilfsstoff' | 'kalk' | 'sonstiges';
export type DosageUnit = 'g/m²' | 'kg/100 m²' | 'ml/m²' | 'l/100 m²';
export type DosageSource = 'nutzer' | 'hersteller_verifiziert';

export interface Dosage {
  amount: number;
  unit: DosageUnit;
  source: DosageSource;
  sourceNote: string; // z. B. "laut Packungsrückseite, Stand 03/2026"
}

export interface Product {
  id: string;
  name: string;
  manufacturer: string;
  category: ProductCategory;
  dosage: Dosage | null;
  packageSize: string;
  note: string;
  createdAt: Timestamp;
}

export type DeviceType =
  | 'rasenmaeher'
  | 'maehroboter'
  | 'vertikutierer'
  | 'streuwagen'
  | 'trimmer'
  | 'regner'
  | 'handwerkzeug'
  | 'sonstiges';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  note: string;
  createdAt: Timestamp;
}

// ---------- Aufgaben ----------

export type TaskStatus = 'geplant' | 'erledigt' | 'verschoben';
export type TaskCategory =
  | 'kontrolle'
  | 'maehen'
  | 'duengen'
  | 'nachsaat'
  | 'vertikutieren'
  | 'bewaesserung'
  | 'boden'
  | 'laub'
  | 'unkraut'
  | 'sonstiges';

export type Schedule =
  | { kind: 'datum'; date: ISODate } // vom Nutzer festgelegt
  | { kind: 'zeitfenster'; start: ISODate; end: ISODate }; // fachlich begründetes Zeitfenster

export interface Task {
  id: string;
  areaId: string;
  title: string;
  description: string;
  category: TaskCategory;
  schedule: Schedule;
  status: TaskStatus;
  origin: { type: 'nutzer' } | { type: 'regel'; ruleId: string; season: string } | { type: 'beobachtung'; observationId: string };
  dependsOn: string[]; // IDs anderer Aufgaben
  reminderAt: string | null; // "YYYY-MM-DDTHH:mm" lokale Zeit
  productId: string | null;
  postponedFrom: ISODate | null;
  completedAt: ISODate | null;
  contextSnapshot: string[] | null; // Begründung zum Zeitpunkt der Erledigung (unveränderlich)
  note: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---------- Tagebuch ----------

export type JournalType = 'pflege' | 'beobachtung' | 'messung' | 'produkt' | 'notiz';

export interface JournalEntry {
  id: string;
  areaId: string;
  date: ISODate;
  type: JournalType;
  title: string;
  note: string;
  productId: string | null;
  amount: number | null;
  amountUnit: string;
  photoIds: string[];
  spot: string; // Bezeichnung der Stelle für Fotovergleiche
  linkedTaskId: string | null;
  linkedObservationId: string | null;
  linkedMeasurementId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---------- Pflanzenbeobachtung ----------

export type Extent = 'einzeln' | 'kleine_stelle' | 'mehrere_stellen' | 'grossflaechig' | 'unbekannt';
export type IdentificationState = 'vermutet' | 'eigene_bestimmung' | 'unbestimmt';

export interface ObservationUpdate {
  id: string;
  date: ISODate;
  kind: 'befund' | 'massnahme';
  extent: Extent | null;
  note: string;
  photoIds: string[];
}

export interface PlantObservation {
  id: string;
  areaId: string;
  plantId: string | null; // null = unbestimmte Pflanze
  identification: IdentificationState;
  location: string;
  updates: ObservationUpdate[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---------- Anhänge ----------

export interface AttachmentMeta {
  id: string;
  name: string;
  mime: string;
  size: number;
  kind: 'foto' | 'dokument';
  createdAt: Timestamp;
  isDemoPlaceholder?: boolean;
}

export interface AttachmentRecord extends AttachmentMeta {
  blob: Blob;
}

// ---------- Fachinhalte & Regeln ----------

export type ReviewStatus = 'geprueft' | 'entwurf' | 'demonstration';

export interface ContentMeta {
  reviewStatus: ReviewStatus;
  lastReviewed: ISODate | null;
  sources: string[];
}

export interface AppData {
  user: User | null;
  areas: LawnArea[];
  measurements: SoilMeasurement[];
  products: Product[];
  devices: Device[];
  tasks: Task[];
  journal: JournalEntry[];
  observations: PlantObservation[];
  attachments: AttachmentMeta[];
  favorites: string[]; // IDs aus dem Pflanzenlexikon (getrennt gespeichert, meta/favorites)
}

export const STORE_NAMES = [
  'areas',
  'measurements',
  'products',
  'devices',
  'tasks',
  'journal',
  'observations',
] as const;
export type StoreName = (typeof STORE_NAMES)[number];

export function emptySoilProfile(): SoilProfile {
  return {
    type: { value: 'unbekannt', source: null, note: '', updatedAt: null },
    water: { value: 'unbekannt', period: '', subArea: '', note: '', photoId: null, updatedAt: null },
    compaction: { value: 'unbekannt', method: '', date: null, note: '', updatedAt: null },
  };
}
