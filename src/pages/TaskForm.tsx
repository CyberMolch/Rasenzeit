import { useState } from 'react';
import { useStore } from '../lib/store';
import { Dialog, Field } from '../ui/components';
import type { Task, TaskCategory } from '../domain/types';
import { CATEGORY_LABEL, options } from '../domain/labels';
import { uid } from '../lib/ids';
import { addDays, isValidISO, nowStamp, today, fmtSchedule } from '../lib/dates';

export function TaskForm({ open, onClose, task, areaId, onSaved }: { open: boolean; onClose: () => void; task?: Task; areaId: string; onSaved?: (t: Task) => void }) {
  const store = useStore();
  const isRule = task?.origin.type === 'regel';
  const [f, setF] = useState(() => ({
    title: task?.title ?? '',
    description: task?.description ?? '',
    category: (task?.category ?? 'sonstiges') as TaskCategory,
    kind: task?.schedule.kind ?? 'datum',
    date: task?.schedule.kind === 'datum' ? task.schedule.date : task?.schedule.start ?? addDays(today(), 1),
    start: task?.schedule.kind === 'zeitfenster' ? task.schedule.start : today(),
    end: task?.schedule.kind === 'zeitfenster' ? task.schedule.end : addDays(today(), 14),
    reminder: task?.reminderAt ?? '',
    dependsOn: task?.dependsOn ?? [],
    productId: task?.productId ?? '',
    note: task?.note ?? '',
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const candidates = store.data.tasks.filter((t) => t.areaId === areaId && t.id !== task?.id && t.status !== 'erledigt' && !t.dependsOn.includes(task?.id ?? '__'));

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!f.title.trim()) e.title = 'Bitte gib einen Titel ein.';
    if (f.kind === 'datum' && !isValidISO(f.date)) e.date = 'Bitte ein gültiges Datum wählen.';
    if (f.kind === 'zeitfenster') {
      if (!isValidISO(f.start)) e.start = 'Bitte ein gültiges Startdatum wählen.';
      if (!isValidISO(f.end)) e.end = 'Bitte ein gültiges Enddatum wählen.';
      else if (f.end < f.start) e.end = 'Das Ende darf nicht vor dem Beginn liegen.';
    }
    if (f.reminder && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(f.reminder)) e.reminder = 'Bitte Datum und Uhrzeit vollständig angeben.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const stamp = nowStamp();
    const t: Task = {
      id: task?.id ?? uid('task'),
      areaId,
      title: f.title.trim(),
      description: f.description.trim(),
      category: f.category,
      schedule: f.kind === 'datum' ? { kind: 'datum', date: f.date } : { kind: 'zeitfenster', start: f.start, end: f.end },
      status: task?.status ?? 'geplant',
      origin: task?.origin ?? { type: 'nutzer' },
      dependsOn: f.dependsOn,
      reminderAt: f.reminder || null,
      productId: f.productId || null,
      postponedFrom: task?.postponedFrom ?? null,
      completedAt: task?.completedAt ?? null,
      contextSnapshot: task?.contextSnapshot ?? null,
      note: f.note.trim(),
      createdAt: task?.createdAt ?? stamp,
      updatedAt: stamp,
    };
    const ok = await store.run(() => store.save('tasks', t), task ? 'Aufgabe gespeichert.' : 'Aufgabe angelegt.');
    if (ok !== undefined) { onSaved?.(t); onClose(); }
  };

  return (
    <Dialog open={open} onClose={onClose} title={task ? 'Aufgabe bearbeiten' : 'Eigene Aufgabe'}
      footer={<><button className="btn btn-outline" onClick={onClose}>Abbrechen</button><button className="btn btn-primary" onClick={() => void submit()}>Speichern</button></>}>
      <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        {isRule && <p className="small muted">Diese Aufgabe stammt aus einem Regelvorschlag. Änderungen gelten nur für diese Aufgabe.</p>}
        <Field label="Titel" error={errors.title}>
          {(id, db) => <input id={id} className="input" value={f.title} onChange={(e) => set('title', e.target.value)} aria-invalid={!!errors.title} aria-describedby={db} maxLength={80} />}
        </Field>
        <Field label="Kategorie">
          {(id) => <select id={id} className="select" value={f.category} onChange={(e) => set('category', e.target.value as TaskCategory)}>
            {options(CATEGORY_LABEL).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>}
        </Field>
        <fieldset>
          <legend>Zeitpunkt</legend>
          <div className="options two">
            <label className="option"><input type="radio" name="kind" checked={f.kind === 'datum'} onChange={() => set('kind', 'datum')} /><span><span className="o-label">Fester Termin</span><span className="o-hint" style={{ display: 'block' }}>Von dir festgelegt</span></span></label>
            <label className="option"><input type="radio" name="kind" checked={f.kind === 'zeitfenster'} onChange={() => set('kind', 'zeitfenster')} /><span><span className="o-label">Zeitfenster</span><span className="o-hint" style={{ display: 'block' }}>Irgendwann in diesem Zeitraum</span></span></label>
          </div>
        </fieldset>
        {f.kind === 'datum' ? (
          <Field label="Datum" error={errors.date}>
            {(id, db) => <input id={id} type="date" className="input" value={f.date} onChange={(e) => set('date', e.target.value)} aria-invalid={!!errors.date} aria-describedby={db} />}
          </Field>
        ) : (
          <div className="grid-2">
            <Field label="Von" error={errors.start}>{(id, db) => <input id={id} type="date" className="input" value={f.start} onChange={(e) => set('start', e.target.value)} aria-invalid={!!errors.start} aria-describedby={db} />}</Field>
            <Field label="Bis" error={errors.end}>{(id, db) => <input id={id} type="date" className="input" value={f.end} onChange={(e) => set('end', e.target.value)} aria-invalid={!!errors.end} aria-describedby={db} />}</Field>
          </div>
        )}
        <Field label="Beschreibung (optional)">
          {(id) => <textarea id={id} className="textarea" value={f.description} onChange={(e) => set('description', e.target.value)} />}
        </Field>
        {candidates.length > 0 && (
          <fieldset>
            <legend>Voraussetzungen (optional)</legend>
            <p className="hint small muted" style={{ marginBottom: 8 }}>Diese Aufgabe beginnt erst, wenn die gewählten Aufgaben erledigt sind.</p>
            <div className="options">
              {candidates.map((c) => (
                <label key={c.id} className="option">
                  <input type="checkbox" checked={f.dependsOn.includes(c.id)} onChange={(e) => set('dependsOn', e.target.checked ? [...f.dependsOn, c.id] : f.dependsOn.filter((x) => x !== c.id))} />
                  <span><span className="o-label">{c.title}</span><span className="o-hint" style={{ display: 'block' }}>{fmtSchedule(c.schedule)}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {store.data.products.length > 0 && (
          <Field label="Produkt (optional)">
            {(id) => <select id={id} className="select" value={f.productId} onChange={(e) => set('productId', e.target.value)}>
              <option value="">Kein Produkt</option>
              {store.data.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>}
          </Field>
        )}
        <Field label="Erinnerung (optional)" hint="Wird in der App angezeigt, sobald die Zeit erreicht ist, und in den ICS-Export übernommen." error={errors.reminder}>
          {(id, db) => <input id={id} type="datetime-local" className="input" value={f.reminder} onChange={(e) => set('reminder', e.target.value)} aria-describedby={db} aria-invalid={!!errors.reminder} />}
        </Field>
        <Field label="Notiz (optional)">
          {(id) => <textarea id={id} className="textarea" value={f.note} onChange={(e) => set('note', e.target.value)} />}
        </Field>
      </form>
    </Dialog>
  );
}
