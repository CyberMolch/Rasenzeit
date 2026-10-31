// Regelbasierte Planung: wandelt zutreffende Regeln in Aufgaben um.
// Erzeugt nur fehlende Aufgaben, verändert nie bestehende oder erledigte Aufgaben.

import type { Task, Schedule } from '../domain/types';
import { RULES, getRule, type RuleContext } from '../content/rules';
import { toISO, today, scheduleEnd, scheduleStart } from '../lib/dates';
import { uid } from '../lib/ids';

export function ruleWindow(ruleId: string, year: number): Schedule | null {
  const r = getRule(ruleId);
  if (!r) return null;
  const s = toISO(new Date(year, r.window.start[0] - 1, r.window.start[1]));
  const e = toISO(new Date(year, r.window.end[0] - 1, r.window.end[1]));
  return { kind: 'zeitfenster', start: s, end: e };
}

/**
 * Liefert neue Aufgaben für ein Jahr. Bereits erzeugte (auch gelöschte, siehe dismissed) werden übersprungen.
 * Für das laufende Jahr werden nur Zeitfenster erzeugt, die noch nicht vorbei sind.
 */
export function generateTasks(ctx: RuleContext, existing: Task[], dismissed: string[], ref = today()): Task[] {
  const season = String(ctx.year);
  const currentYear = Number(ref.slice(0, 4));
  if (ctx.year < currentYear) return [];
  const already = new Map<string, Task>();
  for (const t of existing) {
    if (t.origin.type === 'regel' && t.origin.season === season && t.areaId === ctx.area.id) already.set(t.origin.ruleId, t);
  }
  const created: Task[] = [];
  const stamp = new Date().toISOString();
  for (const rule of RULES) {
    if (already.has(rule.id)) continue;
    if (dismissed.includes(`${ctx.area.id}|${rule.id}|${season}`)) continue;
    if (!rule.applies(ctx)) continue;
    const schedule = ruleWindow(rule.id, ctx.year)!;
    if (scheduleEnd(schedule) < ref) continue;
    const task: Task = {
      id: uid('task'),
      areaId: ctx.area.id,
      title: rule.title,
      description: rule.description,
      category: rule.category,
      schedule,
      status: 'geplant',
      origin: { type: 'regel', ruleId: rule.id, season },
      dependsOn: [],
      reminderAt: null,
      productId: null,
      postponedFrom: null,
      completedAt: null,
      contextSnapshot: null,
      note: '',
      createdAt: stamp,
      updatedAt: stamp,
    };
    created.push(task);
    already.set(rule.id, task);
  }
  // Abhängigkeiten innerhalb derselben Saison verknüpfen
  for (const t of created) {
    if (t.origin.type !== 'regel') continue;
    const rule = getRule(t.origin.ruleId)!;
    t.dependsOn = rule.dependsOn.map((rid) => already.get(rid)?.id).filter((x): x is string => !!x);
  }
  return created;
}

/** Aufgaben, die von `taskId` abhängen und durch einen neuen Starttermin in Konflikt geraten. */
export function conflictingDependents(tasks: Task[], taskId: string, newDate: string): Task[] {
  return tasks.filter(
    (t) => t.status !== 'erledigt' && t.dependsOn.includes(taskId) && scheduleStart(t.schedule) < newDate,
  );
}

export function openDependencies(tasks: Task[], task: Task): Task[] {
  return task.dependsOn.map((id) => tasks.find((t) => t.id === id)).filter((t): t is Task => !!t && t.status !== 'erledigt');
}

export function missingInputs(task: Task, ctx: RuleContext | null): string[] {
  if (!ctx || task.origin.type !== 'regel' || task.status === 'erledigt') return [];
  return getRule(task.origin.ruleId)?.missing(ctx) ?? [];
}

export function ruleStillApplies(task: Task, ctx: RuleContext | null): boolean {
  if (!ctx || task.origin.type !== 'regel') return true;
  return getRule(task.origin.ruleId)?.applies(ctx) ?? true;
}

export function taskExplanation(task: Task, ctx: RuleContext | null): string[] {
  if (task.status === 'erledigt' && task.contextSnapshot) return task.contextSnapshot;
  if (!ctx || task.origin.type !== 'regel') return [];
  return getRule(task.origin.ruleId)?.explain(ctx) ?? [];
}

/** Sortierung: zuerst überfällige/laufende, dann nach Start. */
export function sortTasks(a: Task, b: Task): number {
  return scheduleStart(a.schedule).localeCompare(scheduleStart(b.schedule)) || a.title.localeCompare(b.title, 'de');
}

/** Nächster offener Schritt: frühester offener Termin, dessen Voraussetzungen erfüllt sind. */
export function nextSteps(tasks: Task[], ref = today()): Task[] {
  const open = tasks.filter((t) => t.status !== 'erledigt');
  const optional = (t: Task) => (t.origin.type === 'regel' && getRule(t.origin.ruleId)?.optional ? 1 : 0);
  const blocked = (t: Task) => (openDependencies(tasks, t).length ? 1 : 0);
  // laufende Aufgaben nach Ende des Zeitfensters, künftige nach Beginn
  const active = (t: Task) => (scheduleStart(t.schedule) <= ref ? 1 : 0);
  const key = (t: Task) => (scheduleStart(t.schedule) <= ref ? scheduleEnd(t.schedule) : scheduleStart(t.schedule));
  return open.sort((a, b) =>
    blocked(a) - blocked(b) || optional(a) - optional(b) || active(b) - active(a) || key(a).localeCompare(key(b)) || a.title.localeCompare(b.title, 'de'));
}

export function isOverdue(t: Task, ref = today()): boolean {
  return t.status !== 'erledigt' && scheduleEnd(t.schedule) < ref;
}

export function isDue(t: Task, ref = today()): boolean {
  if (t.status === 'erledigt') return false;
  return scheduleStart(t.schedule) <= ref;
}
