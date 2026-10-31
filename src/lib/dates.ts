import type { ISODate, Schedule } from '../domain/types';

export const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
export const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function today(): ISODate {
  return toISO(new Date());
}

export function isValidISO(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseISO(s);
  return toISO(d) === s;
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function diffDays(a: ISODate, b: ISODate): number {
  // a - b in Tagen
  const ms = parseISO(a).getTime() - parseISO(b).getTime();
  return Math.round(ms / 86400000);
}

/** 31.10.2026 */
export function fmtDate(s: ISODate | null | undefined): string {
  if (!s) return '–';
  const d = parseISO(s);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** 31. Oktober 2026 */
export function fmtDateLong(s: ISODate): string {
  const d = parseISO(s);
  return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** 31. Oktober */
export function fmtDayMonth(s: ISODate): string {
  const d = parseISO(s);
  return `${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

export function fmtDateTime(local: string): string {
  // "YYYY-MM-DDTHH:mm"
  const [date, time] = local.split('T');
  return `${fmtDate(date)}, ${time ?? ''} Uhr`;
}

export function relativeDays(s: ISODate, ref: ISODate = today()): string {
  const n = diffDays(ref, s);
  if (n === 0) return 'Heute';
  if (n === 1) return 'Gestern';
  if (n === -1) return 'Morgen';
  if (n > 1) return `Vor ${n} Tagen`;
  return `In ${-n} Tagen`;
}

export function scheduleStart(s: Schedule): ISODate {
  return s.kind === 'datum' ? s.date : s.start;
}
export function scheduleEnd(s: Schedule): ISODate {
  return s.kind === 'datum' ? s.date : s.end;
}

export function fmtSchedule(s: Schedule): string {
  if (s.kind === 'datum') return fmtDate(s.date);
  return `${fmtDate(s.start)} – ${fmtDate(s.end)}`;
}

export function monthRange(year: number, month0: number): { start: ISODate; end: ISODate } {
  const start = new Date(year, month0, 1);
  const end = new Date(year, month0 + 1, 0);
  return { start: toISO(start), end: toISO(end) };
}

export function overlaps(aStart: ISODate, aEnd: ISODate, bStart: ISODate, bEnd: ISODate): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

/** Woche (So–Sa) um ein Datum herum, wie in der Referenz. */
export function weekAround(s: ISODate): ISODate[] {
  const d = parseISO(s);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    return toISO(x);
  });
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 11) return 'Guten Morgen';
  if (h < 18) return 'Guten Tag';
  return 'Guten Abend';
}

export function nowStamp(): string {
  return new Date().toISOString();
}
