import { useState } from 'react';
import { useStore } from '../lib/store';
import { Icon } from '../ui/icons';
import { ConfirmDialog, Dialog, Empty, Field, Notice, ReviewTag, SubHead } from '../ui/components';
import { CATEGORY_ICON, taskBadges } from '../ui/helpers';
import { conflictingDependents, missingInputs, openDependencies, ruleStillApplies, taskExplanation } from '../planning/engine';
import { getRule, INPUT_LABEL } from '../content/rules';
import { addDays, diffDays, fmtDate, fmtDateTime, fmtSchedule, isValidISO, scheduleStart, today } from '../lib/dates';
import { CATEGORY_LABEL, STATUS_LABEL } from '../domain/labels';
import { navigate } from '../lib/router';
import { TaskForm } from './TaskForm';
import { AmountCalculator } from '../ui/Calculator';

const MISSING_LINK: Record<string, (areaId: string) => string> = {
  'Datum der letzten Düngung': (a) => `/profil/flaeche/${a}`,
  'Dünger mit Dosierung von der Verpackung': () => '/profil/produkte',
  'Saatgut in deiner Produktliste': () => '/profil/produkte',
};

export function TaskDetail({ id }: { id: string }) {
  const store = useStore();
  const task = store.data.tasks.find((t) => t.id === id);
  const [dlg, setDlg] = useState<null | 'done' | 'move' | 'edit' | 'delete' | 'reopen'>(null);
  const [doneDate, setDoneDate] = useState(today());
  const [doneNote, setDoneNote] = useState('');
  const [moveDate, setMoveDate] = useState('');
  const [moveDeps, setMoveDeps] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  if (!task) return <><SubHead title="Aufgabe" backTo="/plan" backLabel="Pflegeplan" /><Empty icon="calendar" title="Aufgabe nicht gefunden">Sie wurde möglicherweise gelöscht.</Empty></>;

  const area = store.data.areas.find((a) => a.id === task.areaId);
  const all = store.data.tasks.filter((t) => t.areaId === task.areaId);
  const ctx = store.ruleContext(task.areaId, Number(scheduleStart(task.schedule).slice(0, 4)));
  const rule = task.origin.type === 'regel' ? getRule(task.origin.ruleId) : undefined;
  const missing = missingInputs(task, ctx);
  const deps = task.dependsOn.map((d) => all.find((t) => t.id === d)).filter((t): t is NonNullable<typeof t> => !!t);
  const openDeps = openDependencies(all, task);
  const dependents = all.filter((t) => t.dependsOn.includes(task.id));
  const reasons = taskExplanation(task, ctx);
  const journalEntry = store.data.journal.find((j) => j.linkedTaskId === task.id);
  const stillApplies = ruleStillApplies(task, ctx);
  const done = task.status === 'erledigt';
  const observation = task.origin.type === 'beobachtung' ? store.data.observations.find((o) => o.id === (task.origin as { observationId: string }).observationId) : undefined;

  const startMove = () => {
    const base = addDays(today(), 7);
    setMoveDate(base > scheduleStart(task.schedule) ? base : addDays(scheduleStart(task.schedule), 7));
    setMoveDeps({});
    setErr(null);
    setDlg('move');
  };
  const conflicts = moveDate && isValidISO(moveDate) ? conflictingDependents(all, task.id, moveDate) : [];

  const doComplete = async () => {
    if (!isValidISO(doneDate) || doneDate > today()) { setErr('Bitte ein gültiges Datum wählen, das nicht in der Zukunft liegt.'); return; }
    const r = await store.run(() => store.completeTask(task.id, doneDate, doneNote.trim()), journalEntry ? 'Erledigt. Der vorhandene Tagebucheintrag wurde aktualisiert.' : 'Erledigt und im Tagebuch eingetragen.');
    if (r) setDlg(null);
  };
  const doMove = async () => {
    if (!isValidISO(moveDate)) { setErr('Bitte ein gültiges Datum wählen.'); return; }
    const moves = Object.entries(moveDeps).filter(([, d]) => d).map(([tid, date]) => ({ id: tid, date }));
    if (moves.some((m) => !isValidISO(m.date) || m.date < moveDate)) { setErr('Abhängige Aufgaben müssen am oder nach dem neuen Termin liegen.'); return; }
    const ok = await store.run(() => store.postponeTask(task.id, moveDate, moves), `Auf ${fmtDate(moveDate)} verschoben${moves.length ? `, ${moves.length} abhängige Aufgabe(n) ebenfalls` : ''}.`);
    if (ok !== undefined) setDlg(null);
  };

  return (
    <>
      <SubHead title={task.title} backTo="/plan" backLabel="Pflegeplan" subtitle={area ? `${area.name} · ${CATEGORY_LABEL[task.category]}` : undefined} />
      <div className="cols">
        <div className="stack">
          <section className="card card-pad-lg stack">
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <span className="icon-bubble lg"><Icon name={CATEGORY_ICON[task.category]} size={30} /></span>
              <div className="grow stack-sm">
                <div className="row-wrap">
                  <span className={`badge ${done ? 'done' : 'neutral'}`}>{STATUS_LABEL[task.status]}</span>
                  {taskBadges(task, all, missing).filter((b) => b.kind !== 'done').map((b) => <span key={b.text} className={`badge ${b.kind === 'sage' ? '' : b.kind}`}>{b.text}</span>)}
                </div>
                <p>{task.description || <span className="muted">Keine Beschreibung.</span>}</p>
              </div>
            </div>
            <dl className="kv">
              <dt>{task.schedule.kind === 'datum' ? 'Termin' : 'Zeitfenster'}</dt>
              <dd>{fmtSchedule(task.schedule)} <span className="muted small">({task.schedule.kind === 'datum' ? 'von dir festgelegt' : 'empfohlenes Zeitfenster – genauer Tag nach Wetter und Zustand'})</span></dd>
              {task.postponedFrom && <><dt>Ursprünglich</dt><dd>{fmtDate(task.postponedFrom)}</dd></>}
              {done && <><dt>Erledigt am</dt><dd>{fmtDate(task.completedAt)}</dd></>}
              {task.reminderAt && <><dt>Erinnerung</dt><dd>{fmtDateTime(task.reminderAt)}</dd></>}
              {task.productId && <><dt>Produkt</dt><dd>{store.data.products.find((p) => p.id === task.productId)?.name ?? 'Nicht mehr vorhanden'}</dd></>}
              {task.note && <><dt>Notiz</dt><dd>{task.note}</dd></>}
              <dt>Herkunft</dt><dd>{task.origin.type === 'regel' ? 'Vorschlag aus Planungsregel' : task.origin.type === 'beobachtung' ? 'Nachkontrolle einer Beobachtung' : 'Eigene Aufgabe'}</dd>
            </dl>
            {!done ? (
              <div className="btn-row">
                <button className="btn btn-primary" onClick={() => { setDoneDate(today()); setDoneNote(''); setErr(null); setDlg('done'); }}><Icon name="check" size={18} /> Als erledigt markieren</button>
                <button className="btn btn-outline" onClick={startMove}><Icon name="moveRight" size={18} /> Verschieben</button>
              </div>
            ) : (
              <div className="btn-row">
                {journalEntry && <a className="btn btn-outline" href={`#/tagebuch/eintrag/${journalEntry.id}`}><Icon name="book" size={18} /> Tagebucheintrag</a>}
                <button className="btn btn-ghost" onClick={() => setDlg('reopen')}><Icon name="refresh" size={18} /> Wieder öffnen</button>
              </div>
            )}
            <div className="row-wrap">
              <button className="btn btn-ghost btn-sm" onClick={() => setDlg('edit')}><Icon name="pencil" size={16} /> Bearbeiten</button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--c-danger)' }} onClick={() => setDlg('delete')}><Icon name="trash" size={16} /> Löschen</button>
            </div>
          </section>

          {!done && !stillApplies && (
            <Notice kind="warn" title="Trifft nach deinen aktuellen Angaben nicht mehr zu">
              Die Voraussetzung dieser Regel ist nicht mehr erfüllt ({rule?.conditionText}). Du kannst die Aufgabe trotzdem behalten oder löschen.
            </Notice>
          )}

          {missing.length > 0 && (
            <section className="card stack-sm" aria-labelledby="miss">
              <h2 id="miss" className="section-title" style={{ marginBottom: 0 }}>Noch fehlende Angaben</h2>
              <p className="small muted">Ohne diese Angaben bleibt die Aufgabe ein allgemeiner Hinweis.</p>
              <ul className="reason-list">
                {missing.map((m) => (
                  <li key={m}><Icon name="alert" size={18} /><span className="grow">{m}</span>
                    {MISSING_LINK[m] && <a className="text-link" href={`#${MISSING_LINK[m](task.areaId)}`}>Ergänzen</a>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(rule || reasons.length > 0) && (
            <section className="card stack" aria-labelledby="why">
              <h2 id="why" className="section-title" style={{ marginBottom: 0 }}>Warum passt das zu meinem Rasen?</h2>
              {rule && <p>{rule.rationale}</p>}
              {reasons.length > 0 && (
                <>
                  <p className="small muted">{done && task.contextSnapshot ? `Stand bei Erledigung am ${fmtDate(task.completedAt)} – spätere Änderungen am Profil ändern diese Angaben nicht.` : 'Aus deinem Profil berücksichtigt:'}</p>
                  <ul className="reason-list">{reasons.map((r) => <li key={r}><Icon name="check" size={18} /><span>{r}</span></li>)}</ul>
                </>
              )}
              {rule && (
                <>
                  <dl className="kv small">
                    <dt>Voraussetzung</dt><dd>{rule.conditionText}</dd>
                    {rule.limits && <><dt>Grenzen</dt><dd>{rule.limits}</dd></>}
                    <dt>Berücksichtigt</dt><dd>{rule.considers.map((k) => INPUT_LABEL[k]).join(', ')}</dd>
                    <dt>Quelle</dt><dd>{rule.sources.join('; ')}</dd>
                    <dt>Regel</dt><dd className="mono">{rule.id}</dd>
                  </dl>
                  <div><ReviewTag meta={rule} /></div>
                </>
              )}
              {area && <a className="text-link" href={`#/profil/flaeche/${area.id}/boden`}>Bodenprofil ansehen <Icon name="chevronRight" size={16} /></a>}
            </section>
          )}
        </div>

        <div className="stack col-side">
          {(deps.length > 0 || dependents.length > 0) && (
            <section className="card stack-sm">
              <h2 className="section-title" style={{ marginBottom: 0 }}>Abhängigkeiten</h2>
              {deps.length > 0 && <p className="small muted">Voraussetzungen:</p>}
              {deps.map((d) => (
                <a key={d.id} className="row text-link" href={`#/plan/aufgabe/${d.id}`}>
                  <Icon name={d.status === 'erledigt' ? 'checkCircle' : 'circle'} size={18} /> {d.title} <span className="muted small">({STATUS_LABEL[d.status]})</span>
                </a>
              ))}
              {dependents.length > 0 && <p className="small muted">Danach geplant:</p>}
              {dependents.map((d) => (
                <a key={d.id} className="row text-link" href={`#/plan/aufgabe/${d.id}`}><Icon name="arrowRight" size={18} /> {d.title}</a>
              ))}
            </section>
          )}
          {observation && (
            <section className="card stack-sm">
              <h2 className="section-title" style={{ marginBottom: 0 }}>Zugehörige Beobachtung</h2>
              <a className="text-link" href={`#/hilfe/beobachtung/${observation.id}`}>{observation.location || 'Beobachtung öffnen'} <Icon name="chevronRight" size={16} /></a>
            </section>
          )}
          {(task.category === 'duengen' || task.category === 'nachsaat') && (
            <AmountCalculator products={store.data.products.filter((p) => (task.category === 'duengen' ? p.category === 'duenger' : p.category === 'saatgut'))} defaultArea={area?.sizeM2 ?? null} defaultProductId={task.productId} />
          )}
        </div>
      </div>

      {/* Erledigen */}
      <Dialog open={dlg === 'done'} onClose={() => setDlg(null)} title="Als erledigt markieren"
        footer={<><button className="btn btn-outline" onClick={() => setDlg(null)}>Abbrechen</button><button className="btn btn-primary" onClick={() => void doComplete()}>Erledigt</button></>}>
        <div className="form">
          {openDeps.length > 0 && <Notice kind="warn">Voraussetzung noch offen: {openDeps.map((d) => d.title).join(', ')}. Du kannst die Aufgabe trotzdem abschließen.</Notice>}
          <Field label="Erledigt am" error={err}>
            {(fid, db) => <input id={fid} type="date" className="input" value={doneDate} max={today()} onChange={(e) => setDoneDate(e.target.value)} aria-describedby={db} />}
          </Field>
          <Field label="Notiz fürs Tagebuch (optional)">
            {(fid) => <textarea id={fid} className="textarea" value={doneNote} onChange={(e) => setDoneNote(e.target.value)} placeholder="z. B. Gerät, Menge oder Auffälligkeiten" />}
          </Field>
          <p className="small muted">{journalEntry ? 'Der bereits verknüpfte Tagebucheintrag wird aktualisiert – es entsteht kein zweiter.' : 'Es wird genau ein verknüpfter Tagebucheintrag angelegt.'}</p>
        </div>
      </Dialog>

      {/* Verschieben */}
      <Dialog open={dlg === 'move'} onClose={() => setDlg(null)} title="Aufgabe verschieben"
        footer={<><button className="btn btn-outline" onClick={() => setDlg(null)}>Abbrechen</button><button className="btn btn-primary" onClick={() => void doMove()}>Verschieben</button></>}>
        <div className="form">
          <Field label="Neuer Termin" error={err}>
            {(fid, db) => <input id={fid} type="date" className="input" value={moveDate} onChange={(e) => { setMoveDate(e.target.value); setErr(null); }} aria-describedby={db} />}
          </Field>
          {conflicts.length > 0 ? (
            <fieldset>
              <legend>Abhängige Aufgaben</legend>
              <p className="small muted" style={{ marginBottom: 8 }}>Diese Aufgaben setzen „{task.title}“ voraus und würden sonst davor beginnen. Wähle, welche mitverschoben werden sollen. Andere Aufgaben bleiben unverändert.</p>
              <div className="options">
                {conflicts.map((c) => {
                  const gap = Math.max(1, diffDays(scheduleStart(c.schedule), scheduleStart(task.schedule)));
                  const proposal = moveDate && isValidISO(moveDate) ? addDays(moveDate, gap) : '';
                  const checked = !!moveDeps[c.id];
                  return (
                    <div key={c.id} className="option" style={{ flexWrap: 'wrap' }}>
                      <input type="checkbox" id={`dep-${c.id}`} checked={checked} onChange={(e) => setMoveDeps((m) => ({ ...m, [c.id]: e.target.checked ? proposal : '' }))} />
                      <label htmlFor={`dep-${c.id}`} className="grow"><span className="o-label">{c.title}</span><span className="o-hint" style={{ display: 'block' }}>Bisher: {fmtSchedule(c.schedule)}</span></label>
                      {checked && (
                        <input type="date" className="input" style={{ maxWidth: 200 }} aria-label={`Neuer Termin für ${c.title}`} value={moveDeps[c.id]} min={moveDate} onChange={(e) => setMoveDeps((m) => ({ ...m, [c.id]: e.target.value }))} />
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ) : dependents.length > 0 ? <p className="small muted">Abhängige Aufgaben liegen bereits nach dem neuen Termin und bleiben unverändert.</p> : null}
        </div>
      </Dialog>

      <ConfirmDialog open={dlg === 'delete'} title="Aufgabe löschen?" confirmLabel="Löschen" danger onClose={() => setDlg(null)}
        onConfirm={async () => { const ok = await store.run(() => store.deleteTask(task.id), 'Aufgabe gelöscht.'); if (ok !== undefined) navigate('/plan', { replace: true }); }}>
        <p>„{task.title}“ wird aus dem Pflegeplan entfernt.</p>
        {journalEntry && <p className="small muted">Der Tagebucheintrag bleibt als Dokumentation erhalten, verliert aber die Verknüpfung.</p>}
        {dependents.length > 0 && <p className="small muted">{dependents.length} abhängige Aufgabe(n) verlieren diese Voraussetzung.</p>}
        {task.origin.type === 'regel' && <p className="small muted">Der Vorschlag wird für diese Saison nicht erneut erzeugt.</p>}
      </ConfirmDialog>

      <Dialog open={dlg === 'reopen'} onClose={() => setDlg(null)} title="Aufgabe wieder öffnen?"
        footer={<>
          <button className="btn btn-outline" onClick={() => setDlg(null)}>Abbrechen</button>
          {journalEntry && <button className="btn btn-danger-outline btn" onClick={async () => { await store.run(() => store.reopenTask(task.id, true), 'Wieder geöffnet, Tagebucheintrag entfernt.'); setDlg(null); }}>Öffnen und Eintrag löschen</button>}
          <button className="btn btn-primary" onClick={async () => { await store.run(() => store.reopenTask(task.id, false), 'Aufgabe wieder geöffnet.'); setDlg(null); }}>{journalEntry ? 'Öffnen, Eintrag behalten' : 'Wieder öffnen'}</button>
        </>}>
        <p>Die Aufgabe wird wieder als geplant geführt.{journalEntry ? ' Soll der verknüpfte Tagebucheintrag erhalten bleiben? Wird sie später erneut erledigt, wird dieser Eintrag wiederverwendet.' : ''}</p>
      </Dialog>

      {dlg === 'edit' && <TaskForm open onClose={() => setDlg(null)} task={task} areaId={task.areaId} />}
    </>
  );
}
