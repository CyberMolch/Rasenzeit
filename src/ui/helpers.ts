import type { IconName } from './icons';
import type { JournalType, LawnArea, Task, TaskCategory } from '../domain/types';
import { SOIL_SOURCE_LABEL, SOIL_TYPE_LABEL } from '../domain/labels';
import { isOverdue, openDependencies } from '../planning/engine';
import { fmtSchedule, scheduleStart, today, diffDays, fmtDate } from '../lib/dates';

export const CATEGORY_ICON: Record<TaskCategory, IconName> = {
  kontrolle: 'search', maehen: 'mower', duengen: 'sack', nachsaat: 'seed', vertikutieren: 'grass',
  bewaesserung: 'droplet', boden: 'layers', laub: 'leaf', unkraut: 'sprout', sonstiges: 'check',
};

export const JOURNAL_ICON: Record<JournalType, IconName> = {
  pflege: 'check', beobachtung: 'eye', messung: 'flask', produkt: 'package', notiz: 'file',
};

export function areaSummary(a: LawnArea): string {
  const parts = [a.sizeM2 != null ? `${a.sizeM2.toLocaleString('de-DE')} m²` : 'Größe unbekannt'];
  if (a.light !== 'unbekannt') parts.push({ sonnig: 'Sonnig', halbschattig: 'Halbschattig', schattig: 'Schattig', gemischt: 'Sonne & Schatten' }[a.light]);
  return parts.join(' · ');
}

/** „Boden: sandig · eigene Einschätzung“ oder null, wenn unbekannt */
export function soilSummary(a: LawnArea): string | null {
  const t = a.soil.type;
  if (t.value === 'unbekannt') return null;
  const label = t.value === 'misch' ? 'Mischboden' : SOIL_TYPE_LABEL[t.value].toLowerCase();
  return `Boden: ${label}${t.source ? ` · ${SOIL_SOURCE_LABEL[t.source]}` : ''}`;
}

export type TaskBadge = { text: string; kind: 'neutral' | 'warn' | 'done' | 'sage' };

export function taskBadges(t: Task, all: Task[], missing: string[]): TaskBadge[] {
  const out: TaskBadge[] = [];
  if (t.status === 'erledigt') return [{ text: `Erledigt ${fmtDate(t.completedAt)}`, kind: 'done' }];
  const ref = today();
  const start = scheduleStart(t.schedule);
  if (isOverdue(t, ref)) out.push({ text: 'Überfällig', kind: 'warn' });
  else if (start <= ref) out.push({ text: t.schedule.kind === 'zeitfenster' ? 'Zeitfenster läuft' : 'Heute fällig', kind: 'sage' });
  else if (diffDays(start, ref) <= 7) out.push({ text: 'Diese Woche', kind: 'sage' });
  if (t.status === 'verschoben') out.push({ text: 'Verschoben', kind: 'neutral' });
  if (openDependencies(all, t).length) out.push({ text: 'Anschließend', kind: 'neutral' });
  if (missing.length) out.push({ text: 'Angaben fehlen', kind: 'warn' });
  return out;
}

export function scheduleLabel(t: Task): string {
  return t.schedule.kind === 'datum' ? `Termin: ${fmtSchedule(t.schedule)}` : `Zeitfenster: ${fmtSchedule(t.schedule)}`;
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || 'RZ';
}
