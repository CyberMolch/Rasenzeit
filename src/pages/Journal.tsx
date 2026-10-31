import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { Icon } from '../ui/icons';
import { AttachmentImage, ConfirmDialog, Dialog, Empty, Field, IconBubble, PageHead, PhotoEditor, SubHead, fmtNum, parseNum } from '../ui/components';
import { JOURNAL_ICON } from '../ui/helpers';
import type { JournalEntry, JournalType } from '../domain/types';
import { JOURNAL_TYPE_LABEL, options } from '../domain/labels';
import { MONTHS, fmtDate, fmtDayMonth, isValidISO, nowStamp, parseISO, today } from '../lib/dates';
import { uid } from '../lib/ids';
import { navigate, query, usePath } from '../lib/router';
import { saveFile } from '../lib/files';
import { buildExport, journalCsv } from '../lib/transfer';
import { plantLabel } from './Observations';

type Filter = 'alle' | 'pflege' | 'fotos' | 'beobachtungen';
const FILTERS: [Filter, string][] = [['alle', 'Alle'], ['pflege', 'Pflege'], ['fotos', 'Fotos'], ['beobachtungen', 'Beobachtungen']];

function matches(e: JournalEntry, f: Filter) {
  if (f === 'alle') return true;
  if (f === 'pflege') return e.type === 'pflege';
  if (f === 'fotos') return e.photoIds.length > 0;
  return e.type === 'beobachtung' || e.type === 'messung';
}

const SUGGESTIONS = ['Rasen gemäht', 'Gedüngt', 'Vertikutiert', 'Nachgesät', 'Bewässert', 'Laub entfernt', 'Unkraut entfernt', 'Kanten geschnitten', 'Boden gelockert'];

export function JournalForm({ open, onClose, entry, initialType = 'pflege' }: { open: boolean; onClose: () => void; entry?: JournalEntry; initialType?: JournalType }) {
  const store = useStore();
  const area = store.activeArea!;
  const areaId = entry?.areaId ?? area.id;
  const [f, setF] = useState({
    areaId,
    date: entry?.date ?? today(),
    type: entry?.type ?? initialType,
    title: entry?.title ?? '',
    note: entry?.note ?? '',
    productId: entry?.productId ?? '',
    amount: entry?.amount != null ? String(entry.amount).replace('.', ',') : '',
    amountUnit: entry?.amountUnit || 'g',
    spot: entry?.spot ?? '',
    photos: entry?.photoIds ?? [],
    linkedTaskId: entry?.linkedTaskId ?? '',
    linkedObservationId: entry?.linkedObservationId ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const spots = Array.from(new Set(store.data.journal.filter((j) => j.areaId === f.areaId && j.spot).map((j) => j.spot)));
  // Aufgaben, die noch keinen verknüpften Eintrag haben (verhindert Duplikate)
  const linkableTasks = store.data.tasks.filter((t) => t.areaId === f.areaId && (t.id === entry?.linkedTaskId || !store.data.journal.some((j) => j.linkedTaskId === t.id)));
  const observations = store.data.observations.filter((o) => o.areaId === f.areaId);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!isValidISO(f.date)) e.date = 'Bitte ein gültiges Datum wählen.';
    if (!f.title.trim()) e.title = 'Bitte beschreibe die Tätigkeit oder Beobachtung.';
    const amt = parseNum(f.amount);
    if (f.amount && (amt === null || Number.isNaN(amt) || amt <= 0)) e.amount = 'Die Menge muss eine Zahl größer als 0 sein.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const stamp = nowStamp();
    const j: JournalEntry = {
      id: entry?.id ?? uid('jrn'), areaId: f.areaId, date: f.date, type: f.type, title: f.title.trim(), note: f.note.trim(),
      productId: f.productId || null, amount: f.amount ? (amt as number) : null, amountUnit: f.amount ? f.amountUnit : '',
      photoIds: f.photos, spot: f.spot.trim(), linkedTaskId: f.linkedTaskId || null, linkedObservationId: f.linkedObservationId || null,
      linkedMeasurementId: entry?.linkedMeasurementId ?? null, createdAt: entry?.createdAt ?? stamp, updatedAt: stamp,
    };
    const ok = await store.run(async () => {
      await store.save('journal', j);
      if (entry) await store.deleteAttachments(entry.photoIds.filter((p) => !f.photos.includes(p) && !store.data.observations.some((o) => o.updates.some((u) => u.photoIds.includes(p)))));
    }, entry ? 'Eintrag gespeichert.' : 'Eintrag hinzugefügt.');
    if (ok !== undefined) onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={entry ? 'Eintrag bearbeiten' : 'Eintrag hinzufügen'}
      footer={<><button className="btn btn-outline" onClick={onClose}>Abbrechen</button><button className="btn btn-primary" onClick={() => void submit()}>Speichern</button></>}>
      <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <div className="grid-2">
          <Field label="Rasenfläche">
            {(id) => <select id={id} className="select" value={f.areaId} onChange={(e) => set('areaId', e.target.value)}>{store.data.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>}
          </Field>
          <Field label="Datum" error={errors.date}>{(id, db) => <input id={id} type="date" className="input" value={f.date} onChange={(e) => set('date', e.target.value)} aria-describedby={db} />}</Field>
        </div>
        <Field label="Art">
          {(id) => <select id={id} className="select" value={f.type} onChange={(e) => set('type', e.target.value as JournalType)}>{options(JOURNAL_TYPE_LABEL).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>}
        </Field>
        {f.type === 'messung' && <p className="small muted">pH-Werte und Laborberichte trägst du am besten unter <a href={`#/profil/flaeche/${f.areaId}/boden`}>Mein Boden</a> ein – dort entsteht automatisch ein verknüpfter Tagebucheintrag.</p>}
        <Field label={f.type === 'beobachtung' ? 'Was hast du beobachtet?' : 'Tätigkeit'} error={errors.title}>
          {(id, db) => <><input id={id} className="input" list="jr-suggest" value={f.title} onChange={(e) => set('title', e.target.value)} aria-describedby={db} aria-invalid={!!errors.title} maxLength={100} />
            <datalist id="jr-suggest">{SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist></>}
        </Field>
        <Field label="Notiz (optional)">{(id) => <textarea id={id} className="textarea" value={f.note} onChange={(e) => set('note', e.target.value)} />}</Field>
        <div className="grid-2">
          <Field label="Produkt (optional)">
            {(id) => <select id={id} className="select" value={f.productId} onChange={(e) => set('productId', e.target.value)}>
              <option value="">Kein Produkt</option>{store.data.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>}
          </Field>
          <Field label="Menge (optional)" error={errors.amount}>
            {(id, db) => (
              <div className="input-unit">
                <input id={id} className="input" inputMode="decimal" value={f.amount} onChange={(e) => set('amount', e.target.value)} aria-describedby={db} aria-invalid={!!errors.amount} />
                <select aria-label="Einheit" className="unit" style={{ border: '1.5px solid var(--c-border-strong)', borderLeft: 0 }} value={f.amountUnit} onChange={(e) => set('amountUnit', e.target.value)}>
                  {['g', 'kg', 'ml', 'l', 'm²', 'Stück'].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            )}
          </Field>
        </div>
        <Field label="Stelle (für Fotovergleiche, optional)" hint="Gleiche Bezeichnung = gleiche Stelle, z. B. „Stelle am Gartenzaun“.">
          {(id, db) => <><input id={id} className="input" list="jr-spots" value={f.spot} onChange={(e) => set('spot', e.target.value)} aria-describedby={db} />
            <datalist id="jr-spots">{spots.map((s) => <option key={s} value={s} />)}</datalist></>}
        </Field>
        <PhotoEditor ids={f.photos} onChange={(v) => set('photos', v)} />
        {(linkableTasks.length > 0 || observations.length > 0) && (
          <div className="grid-2">
            {linkableTasks.length > 0 && (
              <Field label="Mit Aufgabe verknüpfen" hint="Status der Aufgabe bleibt unverändert.">
                {(id, db) => <select id={id} className="select" value={f.linkedTaskId} onChange={(e) => set('linkedTaskId', e.target.value)} aria-describedby={db}>
                  <option value="">Keine</option>{linkableTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>}
              </Field>
            )}
            {observations.length > 0 && (
              <Field label="Mit Beobachtung verknüpfen">
                {(id) => <select id={id} className="select" value={f.linkedObservationId} onChange={(e) => set('linkedObservationId', e.target.value)}>
                  <option value="">Keine</option>{observations.map((o) => <option key={o.id} value={o.id}>{plantLabel(o)} – {o.location}</option>)}
                </select>}
              </Field>
            )}
          </div>
        )}
      </form>
    </Dialog>
  );
}

function SpotCompare({ entry, all }: { entry: JournalEntry; all: JournalEntry[] }) {
  if (!entry.spot || !entry.photoIds.length) return null;
  const earlier = all.filter((j) => j.spot === entry.spot && j.photoIds.length && j.date < entry.date).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!earlier) return null;
  return (
    <>
      <div className="photo-pair">
        <AttachmentImage id={earlier.photoIds[0]} alt={`${entry.spot} am ${fmtDate(earlier.date)}`} caption={`Vorher · ${fmtDate(earlier.date)}`} />
        <AttachmentImage id={entry.photoIds[0]} alt={`${entry.spot} am ${fmtDate(entry.date)}`} caption={`Aktuell · ${fmtDate(entry.date)}`} />
      </div>
      <a className="text-link" href={`#/tagebuch/verlauf?stelle=${encodeURIComponent(entry.spot)}`}>Fotoverlauf ansehen <Icon name="chevronRight" size={16} /></a>
    </>
  );
}

export function JournalPage() {
  const store = useStore();
  const path = usePath();
  const area = store.activeArea!;
  const [filter, setFilter] = useState<Filter>('alle');
  const neu = query(path).get('neu');
  const [formOpen, setFormOpen] = useState(!!neu);
  const [exportOpen, setExportOpen] = useState(false);
  const all = useMemo(() => store.data.journal.filter((j) => j.areaId === area.id), [store.data.journal, area.id]);
  const list = useMemo(() => all.filter((e) => matches(e, filter)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [all, filter]);
  const groups = useMemo(() => {
    const m = new Map<string, JournalEntry[]>();
    for (const e of list) { const k = e.date.slice(0, 7); m.set(k, [...(m.get(k) ?? []), e]); }
    return Array.from(m.entries());
  }, [list]);
  const curYear = today().slice(0, 4);

  return (
    <>
      <PageHead title="Tagebuch" subtitle={<>Deine Pflege. Dein Fortschritt. · <strong>{area.name}</strong></>} />
      <div className="cols">
        <div className="stack">
          <button className="btn btn-primary btn-block" onClick={() => setFormOpen(true)}><Icon name="plus" /> Eintrag hinzufügen</button>
          <div className="chips" role="group" aria-label="Einträge filtern">
            {FILTERS.map(([k, l]) => <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>)}
          </div>
          {groups.length === 0 ? (
            <Empty icon="book" title={filter === 'alle' ? 'Noch keine Einträge' : 'Keine passenden Einträge'}>
              {filter === 'alle' ? 'Erledigte Aufgaben landen automatisch hier. Du kannst auch eigene Einträge mit Fotos anlegen.' : 'Wähle einen anderen Filter.'}
            </Empty>
          ) : groups.map(([month, entries]) => {
            const d = parseISO(`${month}-01`);
            return (
              <section key={month} aria-label={`${MONTHS[d.getMonth()]} ${d.getFullYear()}`}>
                <h2 className="month-label">{MONTHS[d.getMonth()]}{String(d.getFullYear()) !== curYear ? ` ${d.getFullYear()}` : ''}</h2>
                <div className="jr-list">
                  {entries.map((e, i) => (
                    <div key={e.id} className="jr">
                      <span className={`jr-dot${i === 0 && month === groups[0][0] ? ' filled' : ''}`} aria-hidden="true" />
                      <div>
                        <p className="jr-date">{fmtDayMonth(e.date)}</p>
                        <article className="card stack-sm">
                          <a href={`#/tagebuch/eintrag/${e.id}`} className="row" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <IconBubble name={JOURNAL_ICON[e.type]} />
                            <span className="grow">
                              <span style={{ display: 'block', fontWeight: 700, fontSize: '1.08rem' }}>{e.title}</span>
                              {e.type !== 'pflege' && <span className="badge" style={{ marginTop: 4 }}>{JOURNAL_TYPE_LABEL[e.type]}</span>}
                              <span className="small muted" style={{ display: 'block', marginTop: 4 }}>
                                {[e.amount != null ? `${fmtNum(e.amount)} ${e.amountUnit}` : '', e.productId ? store.data.products.find((p) => p.id === e.productId)?.name : '', e.note].filter(Boolean).join(' · ')}
                              </span>
                              {e.linkedTaskId && <span className="tiny muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="link" size={12} /> Aus dem Pflegeplan</span>}
                            </span>
                            <Icon name="chevronRight" className="chev" />
                          </a>
                          <SpotCompare entry={e} all={all} />
                          {e.photoIds.length > 0 && !(e.spot && all.some((j) => j.spot === e.spot && j.photoIds.length && j.date < e.date)) && (
                            <div className="photo-grid">{e.photoIds.slice(0, 4).map((p) => <AttachmentImage key={p} id={p} alt={`Foto vom ${fmtDate(e.date)}`} />)}</div>
                          )}
                        </article>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
        <div className="stack col-side">
          <button className="btn btn-soft btn-block" onClick={() => setExportOpen(true)}><Icon name="share" size={18} /> Tagebuch exportieren</button>
          <a className="btn btn-ghost btn-block" href="#/tagebuch/verlauf"><Icon name="image" size={18} /> Fotovergleiche</a>
          <p className="tiny muted">Einträge zeigen, was du dokumentiert hast. Rasenzeit bewertet keine Behandlungserfolge.</p>
        </div>
      </div>
      {formOpen && <JournalForm open onClose={() => { setFormOpen(false); if (neu) navigate('/tagebuch', { replace: true }); }} initialType={neu === 'beobachtung' ? 'beobachtung' : 'pflege'} />}
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </>
  );
}

export function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const [busy, setBusy] = useState(false);
  const stamp = today();
  const go = async (kind: 'csv' | 'json') => {
    setBusy(true);
    await store.run(async () => {
      if (kind === 'csv') await saveFile(`rasenzeit-tagebuch-${stamp}.csv`, new Blob([journalCsv(store.data)], { type: 'text/csv;charset=utf-8' }));
      else await saveFile(`rasenzeit-daten-${stamp}.json`, new Blob([JSON.stringify(await buildExport(store.data, false), null, 2)], { type: 'application/json' }));
    }, kind === 'csv' ? `${store.data.journal.length} Einträge als CSV exportiert.` : 'Daten als JSON exportiert (ohne Fotos).');
    setBusy(false);
  };
  return (
    <Dialog open={open} onClose={onClose} title="Tagebuch exportieren">
      <div className="stack">
        <button className="btn btn-outline btn-block btn-wrap" disabled={busy} onClick={() => void go('csv')}><Icon name="file" size={18} /> Einträge als Tabelle (CSV)</button>
        <p className="small muted" style={{ marginTop: -8 }}>Alle Tagebucheinträge aller Flächen, Semikolon-getrennt, für Excel oder LibreOffice. Fotos sind nicht enthalten, nur ihre Anzahl.</p>
        <button className="btn btn-outline btn-block btn-wrap" disabled={busy} onClick={() => void go('json')}><Icon name="database" size={18} /> Alle Daten als JSON (ohne Anhänge)</button>
        <p className="small muted" style={{ marginTop: -8 }}>Strukturierte Daten zum Wiederherstellen. Für eine Sicherung inklusive Fotos und Dokumente nutze <a href="#/profil/daten" onClick={onClose}>Datenschutz & Datenexport</a>.</p>
      </div>
    </Dialog>
  );
}

export function JournalEntryPage({ id }: { id: string }) {
  const store = useStore();
  const e = store.data.journal.find((x) => x.id === id);
  const [dlg, setDlg] = useState<null | 'edit' | 'delete'>(null);
  if (!e) return <><SubHead title="Eintrag" backTo="/tagebuch" backLabel="Tagebuch" /><Empty icon="book" title="Eintrag nicht gefunden" /></>;
  const task = store.data.tasks.find((t) => t.id === e.linkedTaskId);
  const obs = store.data.observations.find((o) => o.id === e.linkedObservationId);
  const meas = store.data.measurements.find((m) => m.id === e.linkedMeasurementId);
  const product = store.data.products.find((p) => p.id === e.productId);
  return (
    <>
      <SubHead title={e.title} subtitle={`${fmtDate(e.date)} · ${JOURNAL_TYPE_LABEL[e.type]}`} backTo="/tagebuch" backLabel="Tagebuch" />
      <div className="cols">
        <div className="stack">
          <section className="card stack">
            <dl className="kv">
              <dt>Rasenfläche</dt><dd>{store.data.areas.find((a) => a.id === e.areaId)?.name}</dd>
              <dt>Datum</dt><dd>{fmtDate(e.date)}</dd>
              {e.note && <><dt>Notiz</dt><dd style={{ whiteSpace: 'pre-line' }}>{e.note}</dd></>}
              {product && <><dt>Produkt</dt><dd>{product.name}</dd></>}
              {e.amount != null && <><dt>Menge</dt><dd>{fmtNum(e.amount)} {e.amountUnit}</dd></>}
              {e.spot && <><dt>Stelle</dt><dd><a href={`#/tagebuch/verlauf?stelle=${encodeURIComponent(e.spot)}`}>{e.spot}</a></dd></>}
              {task && <><dt>Aufgabe</dt><dd><a href={`#/plan/aufgabe/${task.id}`}>{task.title}</a></dd></>}
              {obs && <><dt>Beobachtung</dt><dd><a href={`#/hilfe/beobachtung/${obs.id}`}>{plantLabel(obs)}</a></dd></>}
              {meas && <><dt>Messung</dt><dd><a href={`#/profil/flaeche/${meas.areaId}/boden`}>Bodenmessung vom {fmtDate(meas.date)}</a></dd></>}
            </dl>
            <div className="row-wrap">
              <button className="btn btn-outline btn-sm" onClick={() => setDlg('edit')}><Icon name="pencil" size={16} /> Bearbeiten</button>
              <button className="btn btn-danger-outline btn-sm btn" onClick={() => setDlg('delete')}><Icon name="trash" size={16} /> Löschen</button>
            </div>
          </section>
          {e.photoIds.length > 0 && <section className="card"><div className="photo-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>{e.photoIds.map((p) => <AttachmentImage key={p} id={p} alt={`Foto vom ${fmtDate(e.date)}`} caption={fmtDate(e.date)} />)}</div></section>}
        </div>
      </div>
      {dlg === 'edit' && <JournalForm open onClose={() => setDlg(null)} entry={e} />}
      <ConfirmDialog open={dlg === 'delete'} title="Eintrag löschen?" confirmLabel="Löschen" danger onClose={() => setDlg(null)}
        onConfirm={async () => { const ok = await store.run(() => store.deleteJournalEntry(e.id), 'Eintrag gelöscht.'); if (ok !== undefined) navigate('/tagebuch', { replace: true }); }}>
        <p>„{e.title}“ vom {fmtDate(e.date)} wird gelöscht{e.photoIds.length ? `, ebenso ${e.photoIds.length} Foto(s), sofern sie nicht anderswo verwendet werden` : ''}.</p>
        {task && <p className="small muted">Die Aufgabe „{task.title}“ bleibt {task.status === 'erledigt' ? 'als erledigt markiert' : 'bestehen'}.</p>}
      </ConfirmDialog>
    </>
  );
}

export function PhotoHistory() {
  const store = useStore();
  const path = usePath();
  const area = store.activeArea!;
  const withPhotos = store.data.journal.filter((j) => j.areaId === area.id && j.photoIds.length);
  const spots = Array.from(new Set(withPhotos.filter((j) => j.spot).map((j) => j.spot)));
  const [spot, setSpot] = useState(query(path).get('stelle') ?? spots[0] ?? '');
  const photos = withPhotos.filter((j) => (spot ? j.spot === spot : !j.spot)).sort((a, b) => a.date.localeCompare(b.date)).flatMap((j) => j.photoIds.map((p) => ({ p, date: j.date, title: j.title })));
  const [a, setA] = useState(0);
  const [b, setB] = useState(Math.max(0, photos.length - 1));
  const ia = Math.min(a, photos.length - 1);
  const ib = Math.min(b, photos.length - 1);
  return (
    <>
      <SubHead title="Fotoverlauf" subtitle={`Gleiche Stelle, tatsächliche Aufnahmedaten · ${area.name}`} backTo="/tagebuch" backLabel="Tagebuch" />
      {withPhotos.length === 0 ? (
        <Empty icon="image" title="Noch keine Fotos">Füge Tagebucheinträgen Fotos hinzu und gib eine Stelle an, um sie später zu vergleichen.</Empty>
      ) : (
        <div className="stack">
          <Field label="Stelle">
            {(id) => <select id={id} className="select" style={{ maxWidth: 420 }} value={spot} onChange={(e) => { setSpot(e.target.value); setA(0); setB(999); }}>
              {spots.map((s) => <option key={s} value={s}>{s}</option>)}
              <option value="">Ohne Stellenangabe</option>
            </select>}
          </Field>
          {photos.length >= 2 && (
            <section className="card stack-sm">
              <h2 className="section-title" style={{ marginBottom: 0 }}>Vergleich</h2>
              <div className="grid-2">
                <Field label="Links">{(id) => <select id={id} className="select" value={ia} onChange={(e) => setA(Number(e.target.value))}>{photos.map((x, i) => <option key={i} value={i}>{fmtDate(x.date)} – {x.title}</option>)}</select>}</Field>
                <Field label="Rechts">{(id) => <select id={id} className="select" value={ib} onChange={(e) => setB(Number(e.target.value))}>{photos.map((x, i) => <option key={i} value={i}>{fmtDate(x.date)} – {x.title}</option>)}</select>}</Field>
              </div>
              <div className="photo-pair">
                <AttachmentImage id={photos[ia].p} alt={`Foto vom ${fmtDate(photos[ia].date)}`} caption={fmtDate(photos[ia].date)} />
                <AttachmentImage id={photos[ib].p} alt={`Foto vom ${fmtDate(photos[ib].date)}`} caption={fmtDate(photos[ib].date)} />
              </div>
              <p className="tiny muted">Die Bewertung einer Veränderung bleibt dir überlassen.</p>
            </section>
          )}
          <section className="card stack-sm">
            <h2 className="section-title" style={{ marginBottom: 0 }}>Alle Fotos ({photos.length})</h2>
            {photos.length ? <div className="photo-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>{photos.map((x, i) => <AttachmentImage key={i} id={x.p} alt={`Foto vom ${fmtDate(x.date)}`} caption={fmtDate(x.date)} />)}</div> : <p className="muted">Keine Fotos für diese Auswahl.</p>}
          </section>
        </div>
      )}
    </>
  );
}
