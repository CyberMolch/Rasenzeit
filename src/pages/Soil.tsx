import { useState } from 'react';
import { useStore } from '../lib/store';
import { Icon } from '../ui/icons';
import {
  AttachmentImage, ConfirmDialog, Dialog, Empty, Field, Notice, PhotoEditor, RadioGroup, SubHead, UploadButton, fmtNum, openAttachment, parseNum,
} from '../ui/components';
import type { Compaction, LawnArea, MeasureMethod, MeasuredValue, SoilMeasurement, SoilSource, SoilType, WaterBehaviour } from '../domain/types';
import {
  COMPACTION_LABEL, METHOD_LABEL, SOIL_SOURCE_LABEL, SOIL_TYPE_HINT, SOIL_TYPE_LABEL, WATER_LABEL, options,
} from '../domain/labels';
import { fmtDate, isValidISO, nowStamp, today } from '../lib/dates';
import { uid } from '../lib/ids';
import { fmtBytes } from '../lib/files';
import { getRule } from '../content/rules';

function useArea(id: string) {
  return useStore().data.areas.find((a) => a.id === id);
}

function SoilTypeSection({ area }: { area: LawnArea }) {
  const store = useStore();
  const t = area.soil.type;
  const [value, setValue] = useState<SoilType>(t.value);
  const [source, setSource] = useState<SoilSource>(t.source ?? 'eigene');
  const [note, setNote] = useState(t.note);
  const dirty = value !== t.value || (value !== 'unbekannt' && source !== t.source) || note !== t.note;

  const save = () => store.run(() => store.saveArea({
    ...area,
    soil: { ...area.soil, type: { value, source: value === 'unbekannt' ? null : source, note: value === 'misch' ? note.trim() : '', guideAnswers: source === 'bestimmungshilfe' && value === t.value ? t.guideAnswers : undefined, updatedAt: nowStamp() } },
  }), value === 'unbekannt' ? 'Bodenart als „weiß ich nicht“ gespeichert.' : 'Bodenart gespeichert.');

  const sourceOptions: { value: SoilSource; label: string; hint: string }[] = [
    { value: 'eigene', label: 'Eigene Einschätzung', hint: 'Wird als geschätzt behandelt.' },
    ...(t.source === 'bestimmungshilfe' ? [{ value: 'bestimmungshilfe' as SoilSource, label: 'Ergebnis der Bestimmungshilfe', hint: 'Grobe Einschätzung, keine Laboranalyse.' }] : []),
    { value: 'analyse', label: 'Bodenanalyse / fachlich bestätigt', hint: 'Nur wählen, wenn ein Ergebnis vorliegt.' },
  ];

  return (
    <section className="card card-pad-lg stack" aria-labelledby="s-type">
      <div className="spread" style={{ flexWrap: 'wrap' }}>
        <h2 id="s-type" className="section-title" style={{ marginBottom: 0 }}>Bodenart</h2>
        <span className="badge neutral">{t.value === 'unbekannt' ? 'Nicht bekannt' : `${SOIL_TYPE_LABEL[t.value]} · ${t.source ? SOIL_SOURCE_LABEL[t.source] : ''}`}</span>
      </div>
      <p className="small muted">Diese vereinfachten Kategorien sind eine grobe Einordnung der Zusammensetzung. Sie sagen allein nichts über Nährstoffe, pH-Wert oder Verdichtung aus.</p>
      <RadioGroup legend="Zusammensetzung" name="soiltype" value={value} onChange={setValue} columns options={options(SOIL_TYPE_LABEL).map((o) => ({ ...o, hint: SOIL_TYPE_HINT[o.value] }))} />
      {value === 'misch' && <Field label="Notiz zum Mischboden">{(id) => <input id={id} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. vorne sandig, hinten lehmig" />}</Field>}
      {value !== 'unbekannt' && <RadioGroup legend="Herkunft der Angabe" name="soilsrc" value={source} onChange={setSource} options={sourceOptions} />}
      {t.source === 'bestimmungshilfe' && t.guideAnswers && <p className="tiny muted">Die Antworten der Bestimmungshilfe sind gespeichert und nachvollziehbar.</p>}
      <div className="btn-row">
        <button className="btn btn-primary" disabled={!dirty} onClick={() => void save()}>Bodenart speichern</button>
        <a className="btn btn-outline" href={`#/profil/flaeche/${area.id}/boden/bestimmung`}><Icon name="search" size={18} /> Bodenart grob einschätzen</a>
      </div>
    </section>
  );
}

function WaterSection({ area }: { area: LawnArea }) {
  const store = useStore();
  const w = area.soil.water;
  const [f, setF] = useState({ value: w.value, period: w.period, subArea: w.subArea, note: w.note, photos: w.photoId ? [w.photoId] : [] as string[] });
  const save = () => store.run(() => store.saveArea({
    ...area, soil: { ...area.soil, water: { value: f.value, period: f.period.trim(), subArea: f.subArea.trim(), note: f.note.trim(), photoId: f.photos[0] ?? null, updatedAt: nowStamp() } },
  }), 'Wasserverhalten gespeichert.');
  return (
    <section className="card card-pad-lg stack" aria-labelledby="s-water">
      <h2 id="s-water" className="section-title" style={{ marginBottom: 0 }}>Beobachtetes Wasserverhalten</h2>
      <p className="small muted">Getrennt von der Bodenart erfasst. Beobachtungen sind Hinweise, keine bestätigten Ursachen.</p>
      <RadioGroup legend="Was beobachtest du?" name="water" value={f.value} onChange={(v: WaterBehaviour) => setF({ ...f, value: v })} options={options(WATER_LABEL)} />
      {f.value !== 'unbekannt' && (
        <>
          <div className="grid-2">
            <Field label="Zeitpunkt oder Zeitraum (optional)">{(id) => <input id={id} className="input" value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })} placeholder="z. B. Juli 2026, nach Starkregen" />}</Field>
            <Field label="Betroffener Teilbereich (optional)">{(id) => <input id={id} className="input" value={f.subArea} onChange={(e) => setF({ ...f, subArea: e.target.value })} placeholder="z. B. Senke am Beet" />}</Field>
          </div>
          <Field label="Notiz (optional)">{(id) => <textarea id={id} className="textarea" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />}</Field>
          {f.photos.length === 0 ? <PhotoEditor ids={f.photos} onChange={(v) => setF({ ...f, photos: v.slice(0, 1) })} label="Foto (optional)" /> : (
            <div className="field"><span style={{ fontWeight: 600 }}>Foto</span><div style={{ maxWidth: 260 }}><AttachmentImage id={f.photos[0]} alt="Foto zum Wasserverhalten" /></div>
              <div><button className="btn btn-ghost btn-sm" onClick={() => setF({ ...f, photos: [] })}>Foto entfernen</button></div></div>
          )}
        </>
      )}
      <div><button className="btn btn-primary" onClick={() => void save()}>Wasserverhalten speichern</button></div>
    </section>
  );
}

function CompactionSection({ area }: { area: LawnArea }) {
  const store = useStore();
  const c = area.soil.compaction;
  const [f, setF] = useState({ value: c.value, method: c.method, date: c.date ?? '', note: c.note });
  const [err, setErr] = useState<string | null>(null);
  const save = () => {
    if (f.date && (!isValidISO(f.date) || f.date > today())) { setErr('Gültiges Datum, nicht in der Zukunft.'); return; }
    setErr(null);
    void store.run(() => store.saveArea({ ...area, soil: { ...area.soil, compaction: { value: f.value, method: f.method.trim(), date: f.date || null, note: f.note.trim(), updatedAt: nowStamp() } } }), 'Angaben zur Verdichtung gespeichert.');
  };
  return (
    <section className="card card-pad-lg stack" aria-labelledby="s-comp">
      <h2 id="s-comp" className="section-title" style={{ marginBottom: 0 }}>Verdichtung</h2>
      <p className="small muted">Wird nicht aus der Bodenart abgeleitet. Eine Spatenprobe kann Hinweise geben.</p>
      <RadioGroup legend="Stand" name="comp" value={f.value} onChange={(v: Compaction) => setF({ ...f, value: v })} columns options={options(COMPACTION_LABEL)} />
      {(f.value === 'bestaetigt' || f.value === 'keine' || f.value === 'vermutet') && (
        <div className="grid-2">
          <Field label="Untersuchung (optional)">{(id) => <input id={id} className="input" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} placeholder="z. B. Spatenprobe, Bodensonde" />}</Field>
          <Field label="Datum (optional)" error={err}>{(id, db) => <input id={id} type="date" className="input" value={f.date} max={today()} onChange={(e) => setF({ ...f, date: e.target.value })} aria-describedby={db} />}</Field>
        </div>
      )}
      <Field label="Notiz (optional)">{(id) => <textarea id={id} className="textarea" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />}</Field>
      <div><button className="btn btn-primary" onClick={save}>Verdichtung speichern</button></div>
    </section>
  );
}

function MeasurementForm({ open, onClose, area, existing }: { open: boolean; onClose: () => void; area: LawnArea; existing?: SoilMeasurement }) {
  const store = useStore();
  const [f, setF] = useState({
    date: existing?.date ?? today(), method: existing?.method ?? 'teststreifen' as MeasureMethod, methodNote: existing?.methodNote ?? '',
    ph: existing?.ph != null ? String(existing.ph).replace('.', ',') : '', values: existing?.values ?? [] as MeasuredValue[],
    attachments: existing?.attachmentIds ?? [] as string[], note: existing?.note ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const metas = store.data.attachments.filter((a) => f.attachments.includes(a.id));

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!isValidISO(f.date) || f.date > today()) e.date = 'Bitte ein gültiges Messdatum, nicht in der Zukunft.';
    const ph = parseNum(f.ph);
    if (f.ph && (ph === null || Number.isNaN(ph) || ph < 0 || ph > 14)) e.ph = 'Der pH-Wert liegt zwischen 0 und 14.';
    f.values.forEach((v, i) => { if (!v.name.trim() || !v.value.trim()) e[`v${i}`] = 'Name und Wert angeben oder Zeile entfernen.'; });
    if (!f.ph && f.values.length === 0 && f.attachments.length === 0) e.ph = 'Bitte mindestens einen pH-Wert, einen weiteren Wert oder einen Bericht angeben.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const stamp = nowStamp();
    const m: SoilMeasurement = {
      id: existing?.id ?? uid('meas'), areaId: area.id, date: f.date, method: f.method, methodNote: f.methodNote.trim(),
      ph: f.ph ? (ph as number) : null, values: f.values.map((v) => ({ ...v, name: v.name.trim(), value: v.value.trim(), unit: v.unit.trim() })),
      attachmentIds: f.attachments, note: f.note.trim(), createdAt: existing?.createdAt ?? stamp,
    };
    const ok = await store.run(async () => {
      await store.save('measurements', m);
      const linked = store.data.journal.find((j) => j.linkedMeasurementId === m.id);
      const summary = [m.ph != null ? `pH ${fmtNum(m.ph, 2)}` : '', ...m.values.map((v) => `${v.name} ${v.value}${v.unit ? ' ' + v.unit : ''}`)].filter(Boolean).join(', ');
      const note = `${summary}${summary ? ' – ' : ''}${METHOD_LABEL[m.method]}${m.methodNote ? ` (${m.methodNote})` : ''}`;
      await store.save('journal', linked ? { ...linked, date: m.date, note, updatedAt: stamp } : {
        id: uid('jrn'), areaId: area.id, date: m.date, type: 'messung', title: m.ph != null ? 'pH-Wert gemessen' : 'Bodenanalyse hinterlegt', note,
        productId: null, amount: null, amountUnit: '', photoIds: [], spot: '', linkedTaskId: null, linkedObservationId: null, linkedMeasurementId: m.id, createdAt: stamp, updatedAt: stamp,
      });
      if (existing) await store.deleteAttachments(existing.attachmentIds.filter((a) => !f.attachments.includes(a)));
    }, existing ? 'Messung gespeichert.' : 'Messung gespeichert und im Tagebuch vermerkt.');
    if (ok !== undefined) onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={existing ? 'Messung bearbeiten' : 'Messung oder Analyse hinzufügen'}
      footer={<><button className="btn btn-outline" onClick={onClose}>Abbrechen</button><button className="btn btn-primary" onClick={() => void submit()}>Speichern</button></>}>
      <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <p className="small muted">Zugehörige Fläche: <strong>{area.name}</strong>. Trage Werte so ein, wie sie im Bericht stehen.</p>
        <div className="grid-2">
          <Field label="Messdatum" error={errors.date}>{(id, db) => <input id={id} type="date" className="input" value={f.date} max={today()} onChange={(e) => setF({ ...f, date: e.target.value })} aria-describedby={db} aria-invalid={!!errors.date} />}</Field>
          <Field label="Messmethode">{(id) => <select id={id} className="select" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value as MeasureMethod })}>{options(METHOD_LABEL).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>}</Field>
        </div>
        <Field label="Details zur Methode (optional)" hint="z. B. Labor, Verfahren (etwa CaCl₂-Extraktion), Gerätename">{(id, db) => <input id={id} className="input" value={f.methodNote} onChange={(e) => setF({ ...f, methodNote: e.target.value })} aria-describedby={db} />}</Field>
        <Field label="pH-Wert (optional)" hint="Einheitenlos, zwischen 0 und 14." error={errors.ph}>{(id, db) => <input id={id} className="input" inputMode="decimal" value={f.ph} onChange={(e) => setF({ ...f, ph: e.target.value })} aria-describedby={db} aria-invalid={!!errors.ph} style={{ maxWidth: 200 }} />}</Field>
        <fieldset>
          <legend>Weitere Analysewerte (optional)</legend>
          <div className="stack-sm">
            {f.values.map((v, i) => (
              <div key={v.id} className="stack-sm" style={{ borderBottom: '1px solid var(--c-border)', paddingBottom: 8 }}>
                <div className="grid-2">
                  <input className="input" aria-label={`Wert ${i + 1}: Name`} placeholder="Name, z. B. Phosphor (P₂O₅)" value={v.name} onChange={(e) => setF({ ...f, values: f.values.map((x) => x.id === v.id ? { ...x, name: e.target.value } : x) })} />
                  <div className="row">
                    <input className="input" aria-label={`Wert ${i + 1}: Wert`} placeholder="Wert" value={v.value} onChange={(e) => setF({ ...f, values: f.values.map((x) => x.id === v.id ? { ...x, value: e.target.value } : x) })} />
                    <input className="input" aria-label={`Wert ${i + 1}: Einheit`} placeholder="Einheit" value={v.unit} onChange={(e) => setF({ ...f, values: f.values.map((x) => x.id === v.id ? { ...x, unit: e.target.value } : x) })} style={{ maxWidth: 140 }} />
                    <button type="button" className="icon-btn" aria-label={`Wert ${i + 1} entfernen`} onClick={() => setF({ ...f, values: f.values.filter((x) => x.id !== v.id) })}><Icon name="trash" size={18} /></button>
                  </div>
                </div>
                {errors[`v${i}`] && <span className="error small" style={{ color: 'var(--c-danger)' }}>{errors[`v${i}`]}</span>}
              </div>
            ))}
            <div><button type="button" className="btn btn-ghost btn-sm" onClick={() => setF({ ...f, values: [...f.values, { id: uid('val'), name: '', value: '', unit: '' }] })}><Icon name="plus" size={16} /> Wert hinzufügen</button></div>
          </div>
        </fieldset>
        <div className="field">
          <span style={{ fontWeight: 600 }}>Laborbericht (optional)</span>
          {metas.map((m) => (
            <div key={m.id} className="row small"><Icon name="file" size={18} /><span className="grow">{m.name} · {fmtBytes(m.size)}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setF({ ...f, attachments: f.attachments.filter((a) => a !== m.id) })}>Entfernen</button></div>
          ))}
          <div><UploadButton kind="dokument" label="Bericht hinzufügen (PDF oder Bild)" onAdded={(ms) => setF({ ...f, attachments: [...f.attachments, ...ms.map((m) => m.id)] })} /></div>
          <span className="hint small muted">Der Bericht wird nur als Anhang gespeichert und nicht automatisch ausgewertet.</span>
        </div>
        <Field label="Notiz (optional)">{(id) => <textarea id={id} className="textarea" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />}</Field>
      </form>
    </Dialog>
  );
}

function MeasurementsSection({ area }: { area: LawnArea }) {
  const store = useStore();
  const list = store.data.measurements.filter((m) => m.areaId === area.id).sort((a, b) => b.date.localeCompare(a.date));
  const [form, setForm] = useState<{ open: boolean; existing?: SoilMeasurement }>({ open: false });
  const [del, setDel] = useState<SoilMeasurement | null>(null);
  const methods = Array.from(new Set(list.map((m) => `${m.method}|${m.methodNote}`)));
  return (
    <section className="card card-pad-lg stack" aria-labelledby="s-meas">
      <div className="spread" style={{ flexWrap: 'wrap' }}>
        <h2 id="s-meas" className="section-title" style={{ marginBottom: 0 }}>pH-Wert und Bodenanalyse</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setForm({ open: true })}><Icon name="plus" size={16} /> Messung hinzufügen</button>
      </div>
      {list.length === 0 ? <p className="muted">Noch keine Messwerte. Optional kannst du pH-Wert, Laborwerte und den Bericht hinterlegen.</p> : (
        <>
          {methods.length > 1 && <Notice>Messungen mit unterschiedlichen Methoden werden getrennt aufgeführt und nicht direkt miteinander verglichen.</Notice>}
          {methods.map((key) => {
            const [method, note] = key.split('|');
            const group = list.filter((m) => `${m.method}|${m.methodNote}` === key);
            return (
              <div key={key} className="stack-sm">
                <h3 style={{ fontSize: '1rem' }}>{METHOD_LABEL[method as MeasureMethod]}{note ? ` · ${note}` : ''}</h3>
                <div className="table-wrap">
                  <table className="simple">
                    <thead><tr><th scope="col">Datum</th><th scope="col">pH</th><th scope="col">Weitere Werte</th><th scope="col">Bericht</th><th scope="col"><span className="sr-only">Aktionen</span></th></tr></thead>
                    <tbody>
                      {group.map((m) => (
                        <tr key={m.id}>
                          <td>{fmtDate(m.date)}</td>
                          <td className="mono">{m.ph != null ? fmtNum(m.ph, 2) : '–'}</td>
                          <td>{m.values.length ? m.values.map((v) => `${v.name}: ${v.value}${v.unit ? ` ${v.unit}` : ''}`).join('; ') : '–'}</td>
                          <td>{m.attachmentIds.length ? m.attachmentIds.map((a) => {
                            const meta = store.data.attachments.find((x) => x.id === a);
                            return <button key={a} className="text-link" onClick={() => openAttachment(a, (s) => store.toast(s, 'error'))}><Icon name="file" size={14} /> {meta?.name ?? 'Anhang'}</button>;
                          }) : '–'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button className="icon-btn" aria-label={`Messung vom ${fmtDate(m.date)} bearbeiten`} onClick={() => setForm({ open: true, existing: m })}><Icon name="pencil" size={18} /></button>
                            <button className="icon-btn" aria-label={`Messung vom ${fmtDate(m.date)} löschen`} onClick={() => setDel(m)}><Icon name="trash" size={18} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </>
      )}
      {form.open && <MeasurementForm open onClose={() => setForm({ open: false })} area={area} existing={form.existing} />}
      <ConfirmDialog open={!!del} title="Messung löschen?" confirmLabel="Löschen" danger onClose={() => setDel(null)}
        onConfirm={async () => { if (del) await store.run(() => store.deleteMeasurement(del.id), 'Messung gelöscht.'); setDel(null); }}>
        <p>Die Messung vom {del ? fmtDate(del.date) : ''} und angehängte Berichte werden gelöscht. Der Tagebucheintrag bleibt ohne Verknüpfung erhalten.</p>
      </ConfirmDialog>
    </section>
  );
}

function PlanningImpact({ area }: { area: LawnArea }) {
  const store = useStore();
  const soilKeys = ['bodenart', 'wasserverhalten', 'verdichtung', 'ph'];
  const tasks = store.data.tasks.filter((t) => t.areaId === area.id && t.status !== 'erledigt' && t.origin.type === 'regel' && getRule(t.origin.ruleId)?.considers.some((k) => soilKeys.includes(k)));
  return (
    <section className="card stack-sm">
      <h3>Einfluss auf die Planung</h3>
      <p className="small muted">Bodenangaben fließen nur in Regeln ein, die dafür vorgesehen sind. Bereits erledigte Aufgaben werden durch Änderungen nicht verändert.</p>
      {tasks.length ? tasks.map((t) => <a key={t.id} className="text-link" href={`#/plan/aufgabe/${t.id}`}><Icon name="arrowRight" size={16} /> {t.title}</a>) : <p className="small">Derzeit berücksichtigt keine offene Aufgabe deine Bodenangaben.</p>}
    </section>
  );
}

export function SoilPage({ id }: { id: string }) {
  const area = useArea(id);
  if (!area) return <><SubHead title="Mein Boden" backTo="/profil" backLabel="Profil" /><Empty icon="layers" title="Fläche nicht gefunden" /></>;
  return (
    <>
      <SubHead title="Mein Boden" subtitle={`Bodenprofil für „${area.name}“`} backTo={`/profil/flaeche/${area.id}`} backLabel="Rasenprofil" />
      <div className="cols">
        <div className="stack" key={area.updatedAt}>
          <SoilTypeSection area={area} />
          <WaterSection area={area} />
          <CompactionSection area={area} />
          <MeasurementsSection area={area} />
        </div>
        <div className="stack col-side">
          <Notice title="Vier getrennte Angaben">Bodenart, beobachtetes Wasserverhalten, Verdichtung und gemessene Werte werden unabhängig voneinander gespeichert. „Weiß ich nicht“ ist jederzeit erlaubt – unbekannte Werte bleiben unbekannt.</Notice>
          <PlanningImpact area={area} />
          <Notice kind="warn" title="Keine Ableitungen ohne Messung">Aus „sandig“ oder „lehmig“ allein leitet Rasenzeit keine Nährstoffmängel, Wassermengen oder Kalkgaben ab.</Notice>
        </div>
      </div>
    </>
  );
}
