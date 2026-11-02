// Zentraler Zustand: lädt alle strukturierten Daten aus IndexedDB in den Speicher
// und schreibt jede Änderung sofort zurück.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  AppData, AttachmentMeta, Device, ISODate, JournalEntry, LawnArea, PlantObservation, Product,
  SoilMeasurement, StoreName, Task, User,
} from '../domain/types';
import { DATA_VERSION } from '../domain/types';
import * as db from './db';
import { StorageError } from './db';
import { uid } from './ids';
import { downscaleImage, validateUpload } from './files';
import { nowStamp, today } from './dates';
import { generateTasks, ruleStillApplies, taskExplanation } from '../planning/engine';
import type { RuleContext } from '../content/rules';
import { CATEGORY_LABEL } from '../domain/labels';

export interface Toast { id: string; text: string; kind: 'ok' | 'error' | 'info' }

const EMPTY: AppData = {
  user: null, areas: [], measurements: [], products: [], devices: [], tasks: [], journal: [], observations: [], attachments: [],
 favorites: [],
};

type Collection = Exclude<keyof AppData, 'user' | 'attachments' | 'favorites'>;
const STORE_OF: Record<Collection, StoreName> = {
  areas: 'areas', measurements: 'measurements', products: 'products', devices: 'devices',
  tasks: 'tasks', journal: 'journal', observations: 'observations',
};

export interface StoreApi {
  ready: boolean;
  fatal: string | null;
  data: AppData;
  activeArea: LawnArea | null;
  toasts: Toast[];
  toast: (text: string, kind?: Toast['kind']) => void;
  dismissToast: (id: string) => void;
  run: <T>(fn: () => Promise<T>, success?: string) => Promise<T | undefined>;

  saveUser: (patch: Partial<User>) => Promise<void>;
  createUser: (name: string, isDemo: boolean) => Promise<User>;
  saveArea: (a: LawnArea) => Promise<void>;
  deleteArea: (id: string) => Promise<void>;
  setActiveArea: (id: string) => Promise<void>;
  save: <K extends Collection>(col: K, item: AppData[K][number]) => Promise<void>;
  del: (col: Collection, id: string) => Promise<void>;
  addAttachment: (file: File, kind: 'foto' | 'dokument') => Promise<AttachmentMeta>;
  addAttachmentBlob: (blob: Blob, name: string, kind: 'foto' | 'dokument', extra?: Partial<AttachmentMeta>) => Promise<AttachmentMeta>;
  deleteAttachments: (ids: string[]) => Promise<void>;

  completeTask: (taskId: string, date: ISODate, note: string) => Promise<JournalEntry>;
  reopenTask: (taskId: string, removeEntry: boolean) => Promise<void>;
  postponeTask: (taskId: string, newDate: ISODate, moveDependents: { id: string; date: ISODate }[]) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  deleteJournalEntry: (id: string) => Promise<void>;
  deleteObservation: (id: string) => Promise<void>;
  deleteMeasurement: (id: string) => Promise<void>;
  ensurePlan: (areaId: string, year: number) => Promise<number>;
  ruleContext: (areaId: string, year?: number) => RuleContext | null;

  replaceAll: (data: AppData, blobs: Map<string, Blob>) => Promise<void>;
  mergeIn: (data: AppData, blobs: Map<string, Blob>) => Promise<{ added: number; skipped: number }>;
  resetAll: () => Promise<void>;
  toggleFavorite: (plantId: string) => Promise<boolean>;
  reload: () => Promise<void>;
}

const Ctx = createContext<StoreApi | null>(null);

export function useStore(): StoreApi {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider fehlt');
  return s;
}

function attachmentIdsOf(data: Partial<AppData>): Set<string> {
  const ids = new Set<string>();
  data.areas?.forEach((a) => { if (a.photoId) ids.add(a.photoId); if (a.soil.water.photoId) ids.add(a.soil.water.photoId); });
  data.measurements?.forEach((m) => m.attachmentIds.forEach((i) => ids.add(i)));
  data.journal?.forEach((j) => j.photoIds.forEach((i) => ids.add(i)));
  data.observations?.forEach((o) => o.updates.forEach((u) => u.photoIds.forEach((i) => ids.add(i))));
  return ids;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY);
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const ref = useRef<AppData>(EMPTY);

  const commit = useCallback((updater: (d: AppData) => AppData) => {
    // synchron auf ref.current anwenden, damit Folgeoperationen den neuen Stand sehen
    const next = updater(ref.current);
    ref.current = next;
    setData(next);
  }, []);

  const toast = useCallback((text: string, kind: Toast['kind'] = 'ok') => {
    const id = uid('t');
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 8000 : 3500);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const run = useCallback(async <T,>(fn: () => Promise<T>, success?: string) => {
    try {
      const r = await fn();
      if (success) toast(success, 'ok');
      // Erfolg wird nie als undefined gemeldet, damit Aufrufer Erfolg und Fehler unterscheiden können
      return (r === undefined ? true : r) as T;
    } catch (e) {
      const msg = e instanceof StorageError || e instanceof Error ? e.message : 'Unbekannter Fehler.';
      toast(msg, 'error');
      console.error(e);
      return undefined;
    }
  }, [toast]);

  const load = useCallback(async () => {
    try {
      const [user, areas, measurements, products, devices, tasks, journal, observations, attachments, favRec] = await Promise.all([
        db.getUser(),
        db.getAll<LawnArea>('areas'), db.getAll<SoilMeasurement>('measurements'), db.getAll<Product>('products'),
        db.getAll<Device>('devices'), db.getAll<Task>('tasks'), db.getAll<JournalEntry>('journal'),
        db.getAll<PlantObservation>('observations'), db.getAttachmentMetas(), db.getMeta<{ id: string; plantIds: string[] }>('favorites'),
      ]);
      const next: AppData = { user: user ? { ...user, dismissedRules: user.dismissedRules ?? [] } : null, areas, measurements, products, devices, tasks, journal, observations, attachments, favorites: favRec?.plantIds ?? [] };
      ref.current = next;
      setData(next);
      setReady(true);
      setFatal(null);
      // Verwaiste Anhänge (z. B. aus abgebrochenen Formularen) nach einer Stunde entfernen
      const used = attachmentIdsOf(next);
      const cutoff = Date.now() - 60 * 60 * 1000;
      const orphans = attachments.filter((a) => !used.has(a.id) && Date.parse(a.createdAt) < cutoff).map((a) => a.id);
      if (orphans.length) {
        void db.removeMany(orphans.map((id) => ({ store: 'attachments' as const, id }))).then(() => {
          commit((d) => ({ ...d, attachments: d.attachments.filter((x) => !orphans.includes(x.id)) }));
        }).catch(() => undefined);
      }
    } catch (e) {
      setFatal(e instanceof Error ? e.message : 'Der lokale Speicher ist nicht verfügbar.');
      setReady(true);
    }
  }, [commit]);

  useEffect(() => { void load(); }, [load]);

  // ---------- Grundoperationen ----------

  const saveUser = useCallback(async (patch: Partial<User>) => {
    const cur = ref.current.user;
    if (!cur) throw new Error('Kein Nutzerprofil vorhanden.');
    const next = { ...cur, ...patch };
    await db.put('meta', next);
    commit((d) => ({ ...d, user: next }));
  }, [commit]);

  const createUser = useCallback(async (name: string, isDemo: boolean) => {
    const u: User = {
      id: 'user', name, plan: 'basis', activeAreaId: null, remindersEnabled: true, region: null, isDemo,
      dismissedRules: [], createdAt: nowStamp(), dataVersion: DATA_VERSION,
    };
    await db.put('meta', u);
    commit((d) => ({ ...d, user: u }));
    return u;
  }, [commit]);

  const save = useCallback(async <K extends Collection>(col: K, item: AppData[K][number]) => {
    await db.put(STORE_OF[col], item as { id: string });
    commit((d) => {
      const list = d[col] as { id: string }[];
      const exists = list.some((x) => x.id === (item as { id: string }).id);
      const next = exists ? list.map((x) => (x.id === (item as { id: string }).id ? item : x)) : [...list, item];
      return { ...d, [col]: next } as AppData;
    });
  }, [commit]);

  const deleteAttachments = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    await db.removeMany(ids.map((id) => ({ store: 'attachments' as const, id })));
    commit((d) => ({ ...d, attachments: d.attachments.filter((a) => !ids.includes(a.id)) }));
  }, [commit]);

  /** Entfernt Anhänge, die nach einer Änderung nirgends mehr referenziert sind. */
  const pruneAttachments = useCallback(async (candidates: string[]) => {
    if (!candidates.length) return;
    const used = attachmentIdsOf(ref.current);
    const orphan = candidates.filter((id) => !used.has(id));
    await deleteAttachments(orphan);
  }, [deleteAttachments]);

  const del = useCallback(async (col: Collection, id: string) => {
    const before = (ref.current[col] as { id: string }[]).find((x) => x.id === id);
    await db.remove(STORE_OF[col], id);
    commit((d) => ({ ...d, [col]: (d[col] as { id: string }[]).filter((x) => x.id !== id) } as AppData));
    if (before) await pruneAttachments(Array.from(attachmentIdsOf({ [col]: [before] } as Partial<AppData>)));
  }, [commit, pruneAttachments]);

  const addAttachmentBlob = useCallback(async (blob: Blob, name: string, kind: 'foto' | 'dokument', extra: Partial<AttachmentMeta> = {}) => {
    const meta: AttachmentMeta = { id: uid('att'), name, mime: blob.type || 'application/octet-stream', size: blob.size, kind, createdAt: nowStamp(), ...extra };
    await db.putAttachment({ ...meta, blob });
    commit((d) => ({ ...d, attachments: [...d.attachments, meta] }));
    return meta;
  }, [commit]);

  const addAttachment = useCallback(async (file: File, kind: 'foto' | 'dokument') => {
    const err = validateUpload(file, kind);
    if (err) throw new Error(err);
    const blob = file.type.startsWith('image/') ? await downscaleImage(file) : file;
    return addAttachmentBlob(blob, file.name, kind);
  }, [addAttachmentBlob]);

  // ---------- Flächen ----------

  const saveArea = useCallback(async (a: LawnArea) => {
    const prev = ref.current.areas.find((x) => x.id === a.id);
    await save('areas', { ...a, updatedAt: nowStamp() });
    if (!ref.current.user?.activeAreaId) await saveUser({ activeAreaId: a.id });
    if (prev) {
      const stale = [prev.photoId, prev.soil.water.photoId].filter((x): x is string => !!x && x !== a.photoId && x !== a.soil.water.photoId);
      await pruneAttachments(stale);
    }
  }, [save, saveUser, pruneAttachments]);

  const deleteArea = useCallback(async (id: string) => {
    const d = ref.current;
    const area = d.areas.find((a) => a.id === id);
    if (!area) return;
    const related = {
      areas: [area],
      tasks: d.tasks.filter((t) => t.areaId === id),
      journal: d.journal.filter((j) => j.areaId === id),
      observations: d.observations.filter((o) => o.areaId === id),
      measurements: d.measurements.filter((m) => m.areaId === id),
    };
    const atts = Array.from(attachmentIdsOf(related));
    await db.removeMany([
      { store: 'areas', id },
      ...related.tasks.map((x) => ({ store: 'tasks' as const, id: x.id })),
      ...related.journal.map((x) => ({ store: 'journal' as const, id: x.id })),
      ...related.observations.map((x) => ({ store: 'observations' as const, id: x.id })),
      ...related.measurements.map((x) => ({ store: 'measurements' as const, id: x.id })),
      ...atts.map((x) => ({ store: 'attachments' as const, id: x })),
    ]);
    commit((s) => ({
      ...s,
      areas: s.areas.filter((a) => a.id !== id),
      tasks: s.tasks.filter((t) => t.areaId !== id),
      journal: s.journal.filter((j) => j.areaId !== id),
      observations: s.observations.filter((o) => o.areaId !== id),
      measurements: s.measurements.filter((m) => m.areaId !== id),
      attachments: s.attachments.filter((a) => !atts.includes(a.id)),
    }));
    const u = ref.current.user;
    if (u && u.activeAreaId === id) await saveUser({ activeAreaId: ref.current.areas[0]?.id ?? null });
  }, [commit, saveUser]);

  const setActiveArea = useCallback(async (id: string) => { await saveUser({ activeAreaId: id }); }, [saveUser]);

  // ---------- Planung ----------

  const ruleContext = useCallback((areaId: string, year = Number(today().slice(0, 4))): RuleContext | null => {
    const d = ref.current;
    const area = d.areas.find((a) => a.id === areaId);
    if (!area) return null;
    return {
      area,
      measurements: d.measurements.filter((m) => m.areaId === areaId),
      products: d.products,
      devices: d.devices,
      journal: d.journal.filter((j) => j.areaId === areaId),
      year,
    };
  }, []);

  // Planerzeugung strikt nacheinander ausführen, damit parallele Aufrufe keine Duplikate erzeugen.
  const planQueue = useRef<Promise<unknown>>(Promise.resolve());
  const ensurePlan = useCallback((areaId: string, year: number) => {
    const job = planQueue.current.catch(() => 0).then(async () => {
      const ctx = ruleContext(areaId, year);
      if (!ctx || !ref.current.user) return 0;
      // Unberührte, offene Regelvorschläge entfernen, deren Voraussetzung nicht mehr erfüllt ist.
      // Erledigte, verschobene oder bearbeitete Aufgaben bleiben unangetastet.
      const stale = ref.current.tasks.filter((t) => t.areaId === areaId && t.origin.type === 'regel' && t.origin.season === String(year)
        && t.status === 'geplant' && t.createdAt === t.updatedAt && !t.reminderAt && !ruleStillApplies(t, ctx));
      if (stale.length) {
        const ids = stale.map((t) => t.id);
        const cleaned = ref.current.tasks.filter((t) => !ids.includes(t.id) && t.dependsOn.some((x) => ids.includes(x)))
          .map((t) => ({ ...t, dependsOn: t.dependsOn.filter((x) => !ids.includes(x)) }));
        await db.removeMany(ids.map((id) => ({ store: 'tasks' as const, id })));
        if (cleaned.length) await db.putMany(cleaned.map((value) => ({ store: 'tasks' as const, value })));
        commit((d) => ({ ...d, tasks: d.tasks.filter((t) => !ids.includes(t.id)).map((t) => cleaned.find((c) => c.id === t.id) ?? t) }));
      }
      const created = generateTasks(ctx, ref.current.tasks, ref.current.user.dismissedRules ?? []);
      if (!created.length) return 0;
      commit((d) => ({ ...d, tasks: [...d.tasks, ...created] }));
      try {
        await db.putMany(created.map((t) => ({ store: 'tasks' as const, value: t })));
      } catch (e) {
        commit((d) => ({ ...d, tasks: d.tasks.filter((t) => !created.includes(t)) }));
        throw e;
      }
      return created.length;
    });
    planQueue.current = job;
    return job;
  }, [commit, ruleContext]);

  // Plan für aktives und nächstes Jahr bei relevanten Änderungen ergänzen.
  const planKey = useMemo(() => JSON.stringify({
    a: data.areas.map((a) => [a.id, a.condition, a.soil, a.light, a.usage]),
    m: data.measurements.length, p: data.products.length, dv: data.devices.length,
    dis: data.user?.dismissedRules.length,
  }), [data.areas, data.measurements.length, data.products.length, data.devices.length, data.user?.dismissedRules.length]);

  useEffect(() => {
    if (!ready || !data.user) return;
    const y = Number(today().slice(0, 4));
    void (async () => {
      for (const a of ref.current.areas) {
        await ensurePlan(a.id, y).catch(() => 0);
        await ensurePlan(a.id, y + 1).catch(() => 0);
      }
    })();
  }, [planKey, ready, ensurePlan, data.user]);

  // ---------- Aufgaben ----------

  const completeTask = useCallback(async (taskId: string, date: ISODate, note: string) => {
    const d = ref.current;
    const task = d.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Aufgabe nicht gefunden.');
    const ctx = ruleContext(task.areaId, Number(date.slice(0, 4)));
    const snapshot = task.origin.type === 'regel' ? taskExplanation({ ...task, status: 'geplant' }, ctx) : [];
    const updated: Task = { ...task, status: 'erledigt', completedAt: date, contextSnapshot: snapshot, updatedAt: nowStamp() };
    // Genau ein verknüpfter Tagebucheintrag – vorhandenen wiederverwenden
    const existing = d.journal.find((j) => j.linkedTaskId === taskId);
    const product = task.productId ? d.products.find((p) => p.id === task.productId) : null;
    const entry: JournalEntry = existing
      ? { ...existing, date, note: note || existing.note, updatedAt: nowStamp() }
      : {
          id: uid('jrn'), areaId: task.areaId, date, type: 'pflege', title: `${task.title} – erledigt`,
          note: note || `Aufgabe aus dem Pflegeplan (${CATEGORY_LABEL[task.category]}).`,
          productId: product?.id ?? null, amount: null, amountUnit: '', photoIds: [], spot: '',
          linkedTaskId: taskId, linkedObservationId: task.origin.type === 'beobachtung' ? task.origin.observationId : null,
          linkedMeasurementId: null, createdAt: nowStamp(), updatedAt: nowStamp(),
        };
    await db.putMany([{ store: 'tasks', value: updated }, { store: 'journal', value: entry }]);
    commit((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === taskId ? updated : t)),
      journal: existing ? s.journal.map((j) => (j.id === entry.id ? entry : j)) : [...s.journal, entry],
    }));
    // letzte Pflegearbeiten der Fläche fortschreiben (nur vorwärts)
    const area = ref.current.areas.find((a) => a.id === task.areaId);
    const key = ({ maehen: 'mowing', duengen: 'fertilizing', vertikutieren: 'scarifying', nachsaat: 'overseeding' } as const)[task.category as 'maehen'];
    if (area && key && (!area.lastCare[key] || area.lastCare[key]! < date)) {
      await save('areas', { ...area, lastCare: { ...area.lastCare, [key]: date }, updatedAt: nowStamp() });
    }
    return entry;
  }, [commit, ruleContext, save]);

  const reopenTask = useCallback(async (taskId: string, removeEntry: boolean) => {
    const task = ref.current.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const updated: Task = { ...task, status: 'geplant', completedAt: null, contextSnapshot: null, updatedAt: nowStamp() };
    await save('tasks', updated);
    if (removeEntry) {
      const e = ref.current.journal.find((j) => j.linkedTaskId === taskId);
      if (e) await del('journal', e.id);
    }
  }, [save, del]);

  const postponeTask = useCallback(async (taskId: string, newDate: ISODate, moveDependents: { id: string; date: ISODate }[]) => {
    const d = ref.current;
    const task = d.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const from = task.schedule.kind === 'datum' ? task.schedule.date : task.schedule.start;
    const changes: Task[] = [{ ...task, status: 'verschoben', postponedFrom: task.postponedFrom ?? from, schedule: { kind: 'datum', date: newDate }, updatedAt: nowStamp() }];
    for (const m of moveDependents) {
      const t = d.tasks.find((x) => x.id === m.id);
      if (!t) continue;
      const f = t.schedule.kind === 'datum' ? t.schedule.date : t.schedule.start;
      changes.push({ ...t, status: 'verschoben', postponedFrom: t.postponedFrom ?? f, schedule: { kind: 'datum', date: m.date }, updatedAt: nowStamp() });
    }
    await db.putMany(changes.map((value) => ({ store: 'tasks' as const, value })));
    commit((s) => ({ ...s, tasks: s.tasks.map((t) => changes.find((c) => c.id === t.id) ?? t) }));
  }, [commit]);

  const deleteTask = useCallback(async (taskId: string) => {
    const task = ref.current.tasks.find((t) => t.id === taskId);
    if (!task) return;
    await del('tasks', taskId);
    // Abhängigkeiten anderer Aufgaben bereinigen
    const affected = ref.current.tasks.filter((t) => t.dependsOn.includes(taskId)).map((t) => ({ ...t, dependsOn: t.dependsOn.filter((x) => x !== taskId) }));
    if (affected.length) {
      await db.putMany(affected.map((value) => ({ store: 'tasks' as const, value })));
      commit((s) => ({ ...s, tasks: s.tasks.map((t) => affected.find((a) => a.id === t.id) ?? t) }));
    }
    // Verknüpfung im Tagebuch lösen (Eintrag bleibt als Dokumentation erhalten)
    const linked = ref.current.journal.filter((j) => j.linkedTaskId === taskId).map((j) => ({ ...j, linkedTaskId: null }));
    for (const j of linked) await save('journal', j);
    if (task.origin.type === 'regel' && ref.current.user) {
      await saveUser({ dismissedRules: [...ref.current.user.dismissedRules, `${task.areaId}|${task.origin.ruleId}|${task.origin.season}`] });
    }
  }, [del, commit, save, saveUser]);

  const deleteJournalEntry = useCallback(async (id: string) => { await del('journal', id); }, [del]);

  const deleteObservation = useCallback(async (id: string) => {
    await del('observations', id);
    const linked = ref.current.journal.filter((j) => j.linkedObservationId === id).map((j) => ({ ...j, linkedObservationId: null }));
    for (const j of linked) await save('journal', j);
  }, [del, save]);

  const deleteMeasurement = useCallback(async (id: string) => {
    await del('measurements', id);
    const linked = ref.current.journal.filter((j) => j.linkedMeasurementId === id).map((j) => ({ ...j, linkedMeasurementId: null }));
    for (const j of linked) await save('journal', j);
  }, [del, save]);

  // ---------- Import / Zurücksetzen ----------

  const writeAll = useCallback(async (dataIn: AppData, blobs: Map<string, Blob>) => {
    const puts: { store: StoreName | 'meta'; value: { id: string } }[] = [];
    if (dataIn.user) puts.push({ store: 'meta', value: dataIn.user });
    if (dataIn.favorites?.length) puts.push({ store: 'meta', value: { id: 'favorites', plantIds: dataIn.favorites } as { id: string } });
    (Object.keys(STORE_OF) as Collection[]).forEach((c) => (dataIn[c] as { id: string }[]).forEach((v) => puts.push({ store: STORE_OF[c], value: v })));
    await db.putMany(puts);
    for (const meta of dataIn.attachments) {
      const blob = blobs.get(meta.id);
      if (blob) await db.putAttachment({ ...meta, blob });
    }
  }, []);

  const replaceAll = useCallback(async (dataIn: AppData, blobs: Map<string, Blob>) => {
    await db.clearAll();
    await writeAll({ ...dataIn, attachments: dataIn.attachments.filter((a) => blobs.has(a.id)) }, blobs);
    await load();
  }, [writeAll, load]);

  const mergeIn = useCallback(async (dataIn: AppData, blobs: Map<string, Blob>) => {
    const cur = ref.current;
    let added = 0;
    let skipped = 0;
    const pick = <T extends { id: string }>(incoming: T[], existing: T[]) => {
      const ids = new Set(existing.map((e) => e.id));
      return incoming.filter((x) => { if (ids.has(x.id)) { skipped++; return false; } added++; return true; });
    };
    const part: AppData = {
      user: cur.user ? null : dataIn.user,
      areas: pick(dataIn.areas, cur.areas), measurements: pick(dataIn.measurements, cur.measurements),
      products: pick(dataIn.products, cur.products), devices: pick(dataIn.devices, cur.devices),
      tasks: pick(dataIn.tasks, cur.tasks), journal: pick(dataIn.journal, cur.journal),
      observations: pick(dataIn.observations, cur.observations),
      attachments: dataIn.attachments.filter((a) => blobs.has(a.id) && !cur.attachments.some((c) => c.id === a.id)),
      favorites: Array.from(new Set([...cur.favorites, ...(dataIn.favorites ?? [])])),
    };
    await writeAll(part, blobs);
    await load();
    return { added, skipped };
  }, [writeAll, load]);

  const resetAll = useCallback(async () => {
    await db.clearAll();
    ref.current = EMPTY;
    setData(EMPTY);
  }, []);

  const activeArea = useMemo(() => {
    if (!data.user) return null;
    return data.areas.find((a) => a.id === data.user!.activeAreaId) ?? data.areas[0] ?? null;
  }, [data.areas, data.user]);

  const toggleFavorite = useCallback(async (plantId: string) => {
    const cur = ref.current.favorites;
    const on = !cur.includes(plantId);
    const next = on ? [...cur, plantId] : cur.filter((x) => x !== plantId);
    await db.put('meta', { id: 'favorites', plantIds: next });
    commit((d) => ({ ...d, favorites: next }));
    return on;
  }, [commit]);

  const api: StoreApi = {
    ready, fatal, data, activeArea, toasts, toast, dismissToast, run, toggleFavorite,
    saveUser, createUser, saveArea, deleteArea, setActiveArea, save, del,
    addAttachment, addAttachmentBlob, deleteAttachments,
    completeTask, reopenTask, postponeTask, deleteTask, deleteJournalEntry, deleteObservation, deleteMeasurement,
    ensurePlan, ruleContext, replaceAll, mergeIn, resetAll, reload: load,
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
