import { useState } from 'react';
import { useStore } from '../lib/store';
import { Icon } from '../ui/icons';
import { AttachmentImage, ConfirmDialog, Dialog, Empty, Field, IconBubble, PhotoEditor, RadioGroup, SubHead } from '../ui/components';
import type { Extent, IdentificationState, ObservationUpdate, PlantObservation, Task } from '../domain/types';
import { EXTENT_LABEL, IDENT_LABEL, options } from '../domain/labels';
import { PLANTS, getPlant } from '../content/plants';
import { uid } from '../lib/ids';
import { addDays, fmtDate, isValidISO, nowStamp, today } from '../lib/dates';
import { navigate } from '../lib/router';

export function plantLabel(o: PlantObservation): string {
  const p = getPlant(o.plantId);
  if (!p) return 'Unbestimmte Pflanze';
  return `${p.name}${o.identification === 'vermutet' ? ' (vermutet)' : ''}`;
}

export function ObservationForm({ open, onClose, plantId = null, identification, existing }: {
  open: boolean; onClose: () => void; plantId?: string | null; identification?: IdentificationState; existing?: PlantObservation;
}) {
  const store = useStore();
  const area = store.activeArea!;
  const [f, setF] = useState({
    plantId: existing?.plantId ?? plantId ?? '',
    identification: existing?.identification ?? identification ?? (plantId ? 'vermutet' : 'unbestimmt') as IdentificationState,
    location: existing?.location ?? '',
    date: today(),
    extent: 'unbekannt' as Extent,
    note: '',
    photos: [] as string[],
    journal: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!f.location.trim()) e.location = 'Beschreibe kurz, wo die Pflanze wächst.';
    if (!existing && (!isValidISO(f.date) || f.date > today())) e.date = 'Bitte ein gültiges Datum, nicht in der Zukunft.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const stamp = nowStamp();
    const ident: IdentificationState = f.plantId ? (f.identification === 'unbestimmt' ? 'vermutet' : f.identification) : 'unbestimmt';
    if (existing) {
      const ok = await store.run(() => store.save('observations', { ...existing, plantId: f.plantId || null, identification: ident, location: f.location.trim(), updatedAt: stamp }), 'Beobachtung gespeichert.');
      if (ok !== undefined) onClose();
      return;
    }
    const obs: PlantObservation = {
      id: uid('obs'), areaId: area.id, plantId: f.plantId || null, identification: ident, location: f.location.trim(),
      updates: [{ id: uid('upd'), date: f.date, kind: 'befund', extent: f.extent, note: f.note.trim(), photoIds: f.photos }],
      createdAt: stamp, updatedAt: stamp,
    };
    const ok = await store.run(async () => {
      await store.save('observations', obs);
      if (f.journal) {
        await store.save('journal', {
          id: uid('jrn'), areaId: area.id, date: f.date, type: 'beobachtung', title: `Fund: ${plantLabel(obs)}`,
          note: [f.location.trim(), f.note.trim()].filter(Boolean).join(' – '), productId: null, amount: null, amountUnit: '',
          photoIds: f.photos, spot: f.location.trim(), linkedTaskId: null, linkedObservationId: obs.id, linkedMeasurementId: null,
          createdAt: stamp, updatedAt: stamp,
        });
      }
    }, 'Beobachtung gespeichert.');
    if (ok !== undefined) { onClose(); navigate(`/hilfe/beobachtung/${obs.id}`); }
  };

  return (
    <Dialog open={open} onClose={onClose} title={existing ? 'Beobachtung bearbeiten' : 'Fund dokumentieren'}
      footer={<><button className="btn btn-outline" onClick={onClose}>Abbrechen</button><button className="btn btn-primary" onClick={() => void submit()}>Speichern</button></>}>
      <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <p className="small muted">Fläche: <strong>{area.name}</strong></p>
        <Field label="Pflanze">
          {(id) => (
            <select id={id} className="select" value={f.plantId} onChange={(e) => set('plantId', e.target.value)}>
              <option value="">Unbestimmte Pflanze</option>
              {PLANTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </Field>
        {f.plantId && (
          <RadioGroup legend="Wie sicher ist die Zuordnung?" name="ident" value={f.identification === 'unbestimmt' ? 'vermutet' : f.identification}
            onChange={(v) => set('identification', v)} options={[
              { value: 'vermutet', label: IDENT_LABEL.vermutet, hint: 'Mit Bestimmungshilfe oder Vergleich eingegrenzt' },
              { value: 'eigene_bestimmung', label: IDENT_LABEL.eigene_bestimmung, hint: 'Du bist dir sicher, z. B. nach Bestimmungsbuch' },
            ]} />
        )}
        <Field label="Standort" hint="z. B. „unter der Hecke, linke Seite“" error={errors.location}>
          {(id, db) => <input id={id} className="input" value={f.location} onChange={(e) => set('location', e.target.value)} aria-describedby={db} aria-invalid={!!errors.location} />}
        </Field>
        {!existing && (
          <>
            <Field label="Datum" error={errors.date}>{(id, db) => <input id={id} type="date" className="input" value={f.date} max={today()} onChange={(e) => set('date', e.target.value)} aria-describedby={db} />}</Field>
            <Field label="Ausbreitung">
              {(id) => <select id={id} className="select" value={f.extent} onChange={(e) => set('extent', e.target.value as Extent)}>{options(EXTENT_LABEL).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>}
            </Field>
            <Field label="Notiz (optional)">{(id) => <textarea id={id} className="textarea" value={f.note} onChange={(e) => set('note', e.target.value)} />}</Field>
            <PhotoEditor ids={f.photos} onChange={(v) => set('photos', v)} />
            <label className="checkbox-row"><input type="checkbox" checked={f.journal} onChange={(e) => set('journal', e.target.checked)} /> Auch im Tagebuch eintragen (verknüpft)</label>
          </>
        )}
      </form>
    </Dialog>
  );
}

export function ObservationList({ list, emptyText }: { list: PlantObservation[]; emptyText: string }) {
  if (!list.length) return <Empty icon="eye" title="Keine Beobachtungen">{emptyText}</Empty>;
  return (
    <div className="card list-card">
      {[...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((o) => {
        const last = [...o.updates].sort((a, b) => b.date.localeCompare(a.date))[0];
        const photo = o.updates.flatMap((u) => u.photoIds).at(-1);
        return (
          <a key={o.id} className="list-row" href={`#/hilfe/beobachtung/${o.id}`}>
            {photo ? <div style={{ width: 56, flexShrink: 0 }}><AttachmentImage id={photo} alt="" /></div> : <IconBubble name="eye" />}
            <span className="grow">
              <span className="title" style={{ display: 'block' }}>{plantLabel(o)}</span>
              <span className="sub">{o.location} · zuletzt {last ? fmtDate(last.date) : '–'}</span>
            </span>
            <Icon name="chevronRight" className="chev" />
          </a>
        );
      })}
    </div>
  );
}

export function ObservationsPage() {
  const store = useStore();
  const area = store.activeArea!;
  const [open, setOpen] = useState(false);
  const list = store.data.observations.filter((o) => o.areaId === area.id);
  return (
    <>
      <SubHead title="Meine Beobachtungen" subtitle={`Funde und Veränderungen auf „${area.name}“`} backTo="/hilfe" backLabel="Rasenhilfe">
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="plus" size={18} /> Fund dokumentieren</button>
      </SubHead>
      <ObservationList list={list} emptyText="Dokumentiere Pflanzen oder Auffälligkeiten mit Foto und Standort, um ihre Entwicklung zu verfolgen." />
      {open && <ObservationForm open onClose={() => setOpen(false)} />}
    </>
  );
}

export function ObservationDetail({ id }: { id: string }) {
  const store = useStore();
  const o = store.data.observations.find((x) => x.id === id);
  const [dlg, setDlg] = useState<null | 'update' | 'edit' | 'delete' | 'followup'>(null);
  const [u, setU] = useState({ kind: 'befund' as 'befund' | 'massnahme', date: today(), extent: 'unbekannt' as Extent, note: '', photos: [] as string[], journal: true });
  const [follow, setFollow] = useState(addDays(today(), 21));
  const [err, setErr] = useState<string | null>(null);
  if (!o) return <><SubHead title="Beobachtung" backTo="/hilfe/beobachtungen" /><Empty icon="eye" title="Beobachtung nicht gefunden" /></>;
  const plant = getPlant(o.plantId);
  const updates = [...o.updates].sort((a, b) => a.date.localeCompare(b.date));
  const photos = updates.flatMap((x) => x.photoIds.map((pid) => ({ pid, date: x.date })));
  const followTasks = store.data.tasks.filter((t) => t.origin.type === 'beobachtung' && t.origin.observationId === o.id);

  const addUpdate = async () => {
    if (!isValidISO(u.date) || u.date > today()) { setErr('Bitte ein gültiges Datum, nicht in der Zukunft.'); return; }
    if (!u.note.trim() && !u.photos.length && u.kind === 'massnahme') { setErr('Beschreibe kurz die Maßnahme.'); return; }
    const upd: ObservationUpdate = { id: uid('upd'), date: u.date, kind: u.kind, extent: u.kind === 'befund' ? u.extent : null, note: u.note.trim(), photoIds: u.photos };
    const stamp = nowStamp();
    const ok = await store.run(async () => {
      await store.save('observations', { ...o, updates: [...o.updates, upd], updatedAt: stamp });
      if (u.journal) {
        await store.save('journal', {
          id: uid('jrn'), areaId: o.areaId, date: u.date, type: u.kind === 'massnahme' ? 'pflege' : 'beobachtung',
          title: u.kind === 'massnahme' ? `Maßnahme: ${plantLabel(o)}` : `Nachkontrolle: ${plantLabel(o)}`, note: u.note.trim(),
          productId: null, amount: null, amountUnit: '', photoIds: u.photos, spot: o.location, linkedTaskId: null, linkedObservationId: o.id,
          linkedMeasurementId: null, createdAt: stamp, updatedAt: stamp,
        });
      }
    }, u.kind === 'massnahme' ? 'Maßnahme protokolliert.' : 'Befund ergänzt.');
    if (ok !== undefined) setDlg(null);
  };

  const planFollowUp = async () => {
    if (!isValidISO(follow)) { setErr('Bitte ein gültiges Datum wählen.'); return; }
    const stamp = nowStamp();
    const t: Task = {
      id: uid('task'), areaId: o.areaId, title: `Nachkontrolle: ${plantLabel(o)}`, description: `Stelle „${o.location}“ ansehen und Veränderungen festhalten.`,
      category: 'unkraut', schedule: { kind: 'datum', date: follow }, status: 'geplant', origin: { type: 'beobachtung', observationId: o.id },
      dependsOn: [], reminderAt: null, productId: null, postponedFrom: null, completedAt: null, contextSnapshot: null, note: '', createdAt: stamp, updatedAt: stamp,
    };
    const ok = await store.run(() => store.save('tasks', t), `Nachkontrolle am ${fmtDate(follow)} geplant.`);
    if (ok !== undefined) setDlg(null);
  };

  return (
    <>
      <SubHead title={plantLabel(o)} subtitle={o.location} backTo="/hilfe/beobachtungen" backLabel="Beobachtungen" />
      <div className="cols">
        <div className="stack">
          {photos.length >= 2 && (
            <section className="card stack-sm">
              <h2 className="section-title" style={{ marginBottom: 0 }}>Fotovergleich</h2>
              <div className="photo-pair">
                <AttachmentImage id={photos[0].pid} alt={`Foto vom ${fmtDate(photos[0].date)}`} caption={fmtDate(photos[0].date)} />
                <AttachmentImage id={photos.at(-1)!.pid} alt={`Foto vom ${fmtDate(photos.at(-1)!.date)}`} caption={fmtDate(photos.at(-1)!.date)} />
              </div>
              <p className="tiny muted">Ältestes und neuestes Foto. Rasenzeit bewertet keine Veränderung – der Vergleich ist deine eigene Einschätzung.</p>
            </section>
          )}
          <section className="card stack" aria-labelledby="verlauf">
            <div className="spread" style={{ flexWrap: 'wrap' }}>
              <h2 id="verlauf" className="section-title" style={{ marginBottom: 0 }}>Verlauf</h2>
              <button className="btn btn-primary btn-sm" onClick={() => { setU({ kind: 'befund', date: today(), extent: 'unbekannt', note: '', photos: [], journal: true }); setErr(null); setDlg('update'); }}><Icon name="plus" size={16} /> Eintrag</button>
            </div>
            {[...updates].reverse().map((x) => (
              <article key={x.id} className="stack-sm" style={{ borderTop: '1px solid var(--c-border)', paddingTop: 12 }}>
                <div className="row-wrap">
                  <strong>{fmtDate(x.date)}</strong>
                  <span className={`badge ${x.kind === 'massnahme' ? '' : 'neutral'}`}>{x.kind === 'massnahme' ? 'Maßnahme' : 'Befund'}</span>
                  {x.extent && x.extent !== 'unbekannt' && <span className="badge outline">{EXTENT_LABEL[x.extent]}</span>}
                </div>
                {x.note && <p>{x.note}</p>}
                {x.photoIds.length > 0 && <div className="photo-grid">{x.photoIds.map((pid) => <AttachmentImage key={pid} id={pid} alt={`Foto vom ${fmtDate(x.date)}`} caption={fmtDate(x.date)} />)}</div>}
              </article>
            ))}
          </section>
        </div>
        <div className="stack col-side">
          <section className="card stack-sm">
            <dl className="kv">
              <dt>Pflanze</dt><dd>{plant ? <a href={`#/hilfe/pflanze/${plant.id}`}>{plant.name}</a> : 'Unbestimmt'}</dd>
              <dt>Zuordnung</dt><dd>{IDENT_LABEL[o.identification]}</dd>
              <dt>Fläche</dt><dd>{store.data.areas.find((a) => a.id === o.areaId)?.name}</dd>
              <dt>Erster Fund</dt><dd>{fmtDate(updates[0]?.date)}</dd>
            </dl>
            <p className="tiny muted">Das Vorkommen einer Pflanze erlaubt allein keine sichere Aussage über Bodenart, pH-Wert oder Nährstoffe.</p>
            <div className="row-wrap">
              <button className="btn btn-ghost btn-sm" onClick={() => setDlg('edit')}><Icon name="pencil" size={16} /> Bearbeiten</button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--c-danger)' }} onClick={() => setDlg('delete')}><Icon name="trash" size={16} /> Löschen</button>
            </div>
          </section>
          <section className="card stack-sm">
            <h3>Nachkontrolle</h3>
            {followTasks.map((t) => <a key={t.id} className="text-link" href={`#/plan/aufgabe/${t.id}`}><Icon name={t.status === 'erledigt' ? 'checkCircle' : 'calendar'} size={16} /> {t.schedule.kind === 'datum' ? fmtDate(t.schedule.date) : ''} {t.status === 'erledigt' ? '(erledigt)' : ''}</a>)}
            <button className="btn btn-outline" onClick={() => { setErr(null); setDlg('followup'); }}><Icon name="calendarClock" size={18} /> Nachkontrolle planen</button>
          </section>
        </div>
      </div>

      <Dialog open={dlg === 'update'} onClose={() => setDlg(null)} title="Verlauf ergänzen"
        footer={<><button className="btn btn-outline" onClick={() => setDlg(null)}>Abbrechen</button><button className="btn btn-primary" onClick={() => void addUpdate()}>Speichern</button></>}>
        <div className="form">
          <RadioGroup legend="Art" name="ukind" value={u.kind} onChange={(v) => setU({ ...u, kind: v })} columns options={[{ value: 'befund', label: 'Befund / Ausbreitung' }, { value: 'massnahme', label: 'Eigene Maßnahme' }]} />
          <Field label="Datum" error={err}>{(fid, db) => <input id={fid} type="date" className="input" value={u.date} max={today()} onChange={(e) => setU({ ...u, date: e.target.value })} aria-describedby={db} />}</Field>
          {u.kind === 'befund' && (
            <Field label="Ausbreitung">{(fid) => <select id={fid} className="select" value={u.extent} onChange={(e) => setU({ ...u, extent: e.target.value as Extent })}>{options(EXTENT_LABEL).map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select>}</Field>
          )}
          <Field label={u.kind === 'massnahme' ? 'Was hast du gemacht?' : 'Notiz (optional)'}>{(fid) => <textarea id={fid} className="textarea" value={u.note} onChange={(e) => setU({ ...u, note: e.target.value })} />}</Field>
          <PhotoEditor ids={u.photos} onChange={(v) => setU({ ...u, photos: v })} />
          <label className="checkbox-row"><input type="checkbox" checked={u.journal} onChange={(e) => setU({ ...u, journal: e.target.checked })} /> Auch im Tagebuch eintragen</label>
        </div>
      </Dialog>

      <Dialog open={dlg === 'followup'} onClose={() => setDlg(null)} title="Nachkontrolle planen"
        footer={<><button className="btn btn-outline" onClick={() => setDlg(null)}>Abbrechen</button><button className="btn btn-primary" onClick={() => void planFollowUp()}>Im Pflegeplan eintragen</button></>}>
        <Field label="Datum der Nachkontrolle" error={err}>{(fid, db) => <input id={fid} type="date" className="input" value={follow} min={today()} onChange={(e) => setFollow(e.target.value)} aria-describedby={db} />}</Field>
      </Dialog>

      {dlg === 'edit' && <ObservationForm open onClose={() => setDlg(null)} existing={o} />}
      <ConfirmDialog open={dlg === 'delete'} title="Beobachtung löschen?" confirmLabel="Löschen" danger onClose={() => setDlg(null)}
        onConfirm={async () => { const ok = await store.run(() => store.deleteObservation(o.id), 'Beobachtung gelöscht.'); if (ok !== undefined) navigate('/hilfe/beobachtungen', { replace: true }); }}>
        <p>Die Beobachtung mit {o.updates.length} Verlaufseintrag/-einträgen und den zugehörigen Fotos wird gelöscht.</p>
        <p className="small muted">Verknüpfte Tagebucheinträge bleiben erhalten. Geplante Nachkontrollen im Pflegeplan bleiben ebenfalls bestehen.</p>
      </ConfirmDialog>
    </>
  );
}
