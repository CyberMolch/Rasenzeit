// Datenexport und -import (JSON, CSV, ICS) mit Validierung.

import type { AppData, AttachmentMeta, Task } from '../domain/types';
import { DATA_VERSION } from '../domain/types';
import * as db from './db';
import { blobToDataUrl, dataUrlToBlob } from './files';
import { JOURNAL_TYPE_LABEL } from '../domain/labels';
import { fmtDate, scheduleEnd, scheduleStart, addDays } from './dates';

export const FORMAT_ID = 'rasenzeit-daten';

export interface ExportFile {
  format: typeof FORMAT_ID;
  version: number;
  exportedAt: string;
  includesAttachments: boolean;
  note: string;
  data: AppData;
  attachmentData?: Record<string, string>; // id -> data-URL
}

export async function buildExport(data: AppData, withAttachments: boolean): Promise<ExportFile> {
  const file: ExportFile = {
    format: FORMAT_ID,
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    includesAttachments: withAttachments,
    note: withAttachments
      ? 'Vollständige Sicherung inklusive Fotos und Dokumente.'
      : 'Strukturierte Daten ohne Fotos und Dokumente. Anhänge sind nur als Verweis (Name, Größe) enthalten.',
    data,
  };
  if (withAttachments) {
    file.attachmentData = {};
    for (const meta of data.attachments) {
      const rec = await db.getAttachment(meta.id);
      if (rec) file.attachmentData[meta.id] = await blobToDataUrl(rec.blob);
    }
  }
  return file;
}

// ---------- Validierung ----------

export interface ParsedImport {
  file: ExportFile;
  blobs: Map<string, Blob>;
  counts: Record<string, number>;
  warnings: string[];
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isStr = (x: unknown) => typeof x === 'string';
const isDate = (x: unknown) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);

function checkList(name: string, list: unknown, required: Record<string, (v: unknown) => boolean>, errors: string[]) {
  if (!Array.isArray(list)) { errors.push(`„${name}“ fehlt oder ist keine Liste.`); return; }
  list.forEach((item, i) => {
    if (!isObj(item)) { errors.push(`${name}[${i}] ist kein Datensatz.`); return; }
    for (const [k, test] of Object.entries(required)) {
      if (!test(item[k])) errors.push(`${name}[${i}]: Feld „${k}“ fehlt oder ist ungültig.`);
    }
  });
}

/** Wandelt ältere Formatversionen in die aktuelle um (Erweiterungspunkt). */
function migrate(file: ExportFile): ExportFile {
  // Version 1 ist aktuell – hier später Migrationsschritte ergänzen.
  return file;
}

export async function parseImport(text: string): Promise<ParsedImport> {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('Die Datei ist kein gültiges JSON.'); }
  if (!isObj(raw) || raw.format !== FORMAT_ID) throw new Error('Die Datei ist keine Rasenzeit-Datensicherung.');
  if (typeof raw.version !== 'number' || raw.version > DATA_VERSION)
    throw new Error(`Die Datei stammt aus einer neueren Version von Rasenzeit (Format ${String(raw.version)}). Bitte aktualisiere die App.`);
  const d = raw.data;
  if (!isObj(d)) throw new Error('Die Datei enthält keine Daten.');
  const errors: string[] = [];
  checkList('areas', d.areas, { id: isStr, name: isStr, soil: isObj }, errors);
  checkList('measurements', d.measurements, { id: isStr, areaId: isStr, date: isDate }, errors);
  checkList('products', d.products, { id: isStr, name: isStr }, errors);
  checkList('devices', d.devices, { id: isStr, name: isStr }, errors);
  checkList('tasks', d.tasks, { id: isStr, areaId: isStr, title: isStr, schedule: isObj, status: isStr }, errors);
  checkList('journal', d.journal, { id: isStr, areaId: isStr, date: isDate, title: isStr }, errors);
  checkList('observations', d.observations, { id: isStr, areaId: isStr, updates: Array.isArray }, errors);
  checkList('attachments', d.attachments, { id: isStr, name: isStr, mime: isStr }, errors);
  if (d.user != null && (!isObj(d.user) || d.user.id !== 'user')) errors.push('Nutzerprofil ist ungültig.');
  if (errors.length) throw new Error(`Die Datei ist unvollständig oder beschädigt:\n${errors.slice(0, 6).join('\n')}${errors.length > 6 ? `\n… und ${errors.length - 6} weitere` : ''}`);

  const file = migrate(raw as unknown as ExportFile);
  const blobs = new Map<string, Blob>();
  const warnings: string[] = [];
  if (file.includesAttachments && file.attachmentData) {
    for (const [id, url] of Object.entries(file.attachmentData)) {
      try { blobs.set(id, await dataUrlToBlob(url)); } catch { warnings.push(`Ein Anhang konnte nicht gelesen werden (${id}).`); }
    }
  }
  const missingAtt = file.data.attachments.filter((a: AttachmentMeta) => !blobs.has(a.id)).length;
  if (missingAtt) warnings.push(`${missingAtt} Foto(s)/Dokument(e) sind in dieser Datei nicht enthalten und werden nicht importiert.`);
  file.data.user = file.data.user ? { ...file.data.user, dismissedRules: file.data.user.dismissedRules ?? [] } : null;
  const counts = {
    Rasenflächen: file.data.areas.length,
    Aufgaben: file.data.tasks.length,
    Tagebucheinträge: file.data.journal.length,
    Pflanzenbeobachtungen: file.data.observations.length,
    Bodenmessungen: file.data.measurements.length,
    Produkte: file.data.products.length,
    Geräte: file.data.devices.length,
    'Anhänge (mit Datei)': blobs.size,
  };
  return { file, blobs, counts, warnings };
}

// ---------- CSV ----------

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function journalCsv(data: AppData): string {
  const header = ['Datum', 'Rasenfläche', 'Art', 'Tätigkeit', 'Notiz', 'Produkt', 'Menge', 'Einheit', 'Stelle', 'Anzahl Fotos', 'Verknüpfte Aufgabe'];
  const rows = [...data.journal]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((j) => [
      fmtDate(j.date),
      data.areas.find((a) => a.id === j.areaId)?.name ?? '',
      JOURNAL_TYPE_LABEL[j.type],
      j.title,
      j.note,
      data.products.find((p) => p.id === j.productId)?.name ?? '',
      j.amount != null ? j.amount.toLocaleString('de-DE') : '',
      j.amountUnit,
      j.spot,
      j.photoIds.length,
      data.tasks.find((t) => t.id === j.linkedTaskId)?.title ?? '',
    ]);
  // Semikolon + BOM für deutsches Excel
  return '\uFEFF' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
}

// ---------- ICS ----------

const icsEsc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const icsDate = (iso: string) => iso.replace(/-/g, '');

export function tasksIcs(tasks: Task[], areaName: (id: string) => string): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Rasenzeit//DE', 'CALSCALE:GREGORIAN'];
  for (const t of tasks) {
    const start = scheduleStart(t.schedule);
    const end = addDays(scheduleEnd(t.schedule), 1);
    const kind = t.schedule.kind === 'datum' ? 'Termin' : 'Zeitfenster';
    lines.push(
      'BEGIN:VEVENT',
      `UID:${t.id}@rasenzeit`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(start)}`,
      `DTEND;VALUE=DATE:${icsDate(end)}`,
      `SUMMARY:${icsEsc(`${t.title} (${areaName(t.areaId)})`)}`,
      `DESCRIPTION:${icsEsc(`${kind}. ${t.description}`)}`,
    );
    if (t.reminderAt) {
      const [d, time] = t.reminderAt.split('T');
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(t.title)}`, `TRIGGER;VALUE=DATE-TIME:${icsDate(d)}T${(time ?? '09:00').replace(':', '')}00`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
