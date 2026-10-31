import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { Icon } from '../ui/icons';
import { Empty, Notice, PageHead } from '../ui/components';
import { CATEGORY_ICON, scheduleLabel, taskBadges } from '../ui/helpers';
import { missingInputs, openDependencies, sortTasks, isOverdue } from '../planning/engine';
import {
  MONTHS, WEEKDAYS_SHORT, addDays, fmtDate, monthRange, overlaps, parseISO, scheduleEnd, scheduleStart, today, toISO, weekAround, fmtDayMonth,
} from '../lib/dates';
import { navigate, query, usePath } from '../lib/router';
import { TaskForm } from './TaskForm';
import type { Task } from '../domain/types';
import { saveFile } from '../lib/files';
import { tasksIcs } from '../lib/transfer';

function TaskCard({ t, all, primary }: { t: Task; all: Task[]; primary?: boolean }) {
  const store = useStore();
  const ctx = store.ruleContext(t.areaId, Number(scheduleStart(t.schedule).slice(0, 4)));
  const missing = missingInputs(t, ctx);
  const deps = openDependencies(all, t);
  const done = t.status === 'erledigt';
  return (
    <div className="tl-item">
      <span className={`tl-dot ${done ? 'done' : primary ? 'filled' : ''}`} aria-hidden="true">{done && <Icon name="check" size={14} strokeWidth={3} />}</span>
      <article className={`card task-card${done ? ' is-done' : ''}`}>
        <div className="t-top">
          <div className="task-thumb"><Icon name={CATEGORY_ICON[t.category]} size={30} /></div>
          <div className="grow">
            <div className="row-wrap">
              {taskBadges(t, all, missing).map((b) => <span key={b.text} className={`badge ${b.kind === 'sage' ? '' : b.kind}`}>{b.text}</span>)}
            </div>
            <h3><a className="t-title-link" href={`#/plan/aufgabe/${t.id}`}>{t.title}</a></h3>
            <p className="muted small">
              {deps.length ? `Nach: ${deps.map((d) => d.title).join(', ')}. ` : ''}
              {missing.length ? `Fehlt: ${missing.join(', ')}.` : t.description}
            </p>
            <p className="meta-line" style={{ marginTop: 6 }}>
              <span><Icon name="calendar" size={14} /> {scheduleLabel(t)}</span>
              {t.reminderAt && <span><Icon name="bell" size={14} /> Erinnerung</span>}
              {t.origin.type === 'regel' && <span><Icon name="info" size={14} /> Vorschlag</span>}
            </p>
          </div>
          <Icon name="chevronRight" className="chev muted" />
        </div>
        {!done && (
          missing.length ? (
            <button className="btn btn-outline btn-block" onClick={() => navigate(`/plan/aufgabe/${t.id}`)}>Angaben ergänzen</button>
          ) : primary ? (
            <button className="btn btn-primary btn-block" onClick={() => navigate(`/plan/aufgabe/${t.id}`)}>Aufgabe öffnen</button>
          ) : (
            <button className="btn btn-outline btn-block" onClick={() => navigate(`/plan/aufgabe/${t.id}`)}>Details ansehen</button>
          )
        )}
      </article>
    </div>
  );
}

export function PlanPage() {
  const store = useStore();
  const path = usePath();
  const area = store.activeArea!;
  const t0 = today();
  const [view, setView] = useState<'zeitplan' | 'jahr'>('zeitplan');
  const [cursor, setCursor] = useState(t0); // ausgewählter Tag
  const [dayFilter, setDayFilter] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [formOpen, setFormOpen] = useState(query(path).get('neu') === '1');
  const year = Number(cursor.slice(0, 4));
  const month0 = parseISO(cursor).getMonth();

  useEffect(() => { void store.ensurePlan(area.id, year); }, [area.id, year]); // eslint-disable-line

  const areaTasks = useMemo(() => store.data.tasks.filter((t) => t.areaId === area.id), [store.data.tasks, area.id]);
  const { start: mStart, end: monthEnd } = monthRange(year, month0);
  // Im laufenden Monat auch die kommenden 14 Tage zeigen, damit nichts am Monatsende verschwindet
  const isCurMonth = mStart <= t0 && t0 <= monthEnd;
  const ahead = addDays(t0, 14);
  const mEnd = isCurMonth && ahead > monthEnd ? ahead : monthEnd;

  const visible = useMemo(() => {
    let list = areaTasks.filter((t) => overlaps(scheduleStart(t.schedule), scheduleEnd(t.schedule), mStart, mEnd));
    if (dayFilter) list = list.filter((t) => scheduleStart(t.schedule) <= cursor && scheduleEnd(t.schedule) >= cursor);
    if (!showDone) list = list.filter((t) => t.status !== 'erledigt');
    return list.sort(sortTasks);
  }, [areaTasks, mStart, mEnd, dayFilter, cursor, showDone]);

  const overdue = useMemo(() => areaTasks.filter((t) => isOverdue(t, t0) && scheduleEnd(t.schedule) < mStart).sort(sortTasks), [areaTasks, t0, mStart]);
  const doneCount = areaTasks.filter((t) => t.status === 'erledigt' && overlaps(scheduleStart(t.schedule), scheduleEnd(t.schedule), mStart, mEnd)).length;


  const week = weekAround(cursor);
  const hasTaskOn = (d: string) => areaTasks.some((t) => t.status !== 'erledigt' && (t.schedule.kind === 'datum' ? t.schedule.date === d : t.schedule.start === d || t.schedule.end === d));

  const shiftMonth = (n: number) => {
    const d = parseISO(cursor);
    const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
    const isCur = target.getFullYear() === Number(t0.slice(0, 4)) && target.getMonth() === parseISO(t0).getMonth();
    setCursor(isCur ? t0 : toISO(target));
    setDayFilter(false);
  };

  const exportIcs = async () => {
    const open = areaTasks.filter((t) => t.status !== 'erledigt');
    if (!open.length) { store.toast('Keine offenen Aufgaben zum Exportieren.', 'info'); return; }
    const ics = tasksIcs(open, (id) => store.data.areas.find((a) => a.id === id)?.name ?? '');
    await store.run(async () => { await saveFile(`rasenzeit-pflegeplan-${area.name.replace(/\W+/g, '-').toLowerCase()}.ics`, new Blob([ics], { type: 'text/calendar' })); },
      `${open.length} Aufgaben als Kalenderdatei exportiert.`);
  };

  return (
    <>
      <PageHead title="Pflegeplan" subtitle={<>Deine nächsten Schritte im Blick · <strong>{area.name}</strong></>} />
      <div className="segmented" role="tablist" aria-label="Ansicht" style={{ marginBottom: 16 }}>
        <button role="tab" aria-selected={view === 'zeitplan'} onClick={() => setView('zeitplan')}>Zeitplan</button>
        <button role="tab" aria-selected={view === 'jahr'} onClick={() => setView('jahr')}>Jahresübersicht</button>
      </div>

      {view === 'zeitplan' ? (
        <div className="cols">
          <div className="stack">
            <div className="card">
              <div className="month-nav">
                <button className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Vorheriger Monat"><Icon name="chevronLeft" /></button>
                <div className="row" style={{ gap: 4 }}>
                  <label className="sr-only" htmlFor="month-sel">Monat</label>
                  <select id="month-sel" value={month0} onChange={(e) => { const m = Number(e.target.value); setCursor(toISO(new Date(year, m, 1))); setDayFilter(false); }}>
                    {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </select>
                  <label className="sr-only" htmlFor="year-sel">Jahr</label>
                  <select id="year-sel" value={year} onChange={(e) => { setCursor(toISO(new Date(Number(e.target.value), month0, 1))); setDayFilter(false); }}>
                    {Array.from({ length: 5 }, (_, i) => Number(t0.slice(0, 4)) - 1 + i).map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <button className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Nächster Monat"><Icon name="chevronRight" /></button>
              </div>
              <div className="week" role="group" aria-label="Woche">
                {week.map((d) => {
                  const dt = parseISO(d);
                  const sel = dayFilter && d === cursor;
                  return (
                    <button key={d} className={d === t0 ? 'today' : ''} aria-pressed={sel || (!dayFilter && d === cursor)}
                      aria-label={`${fmtDayMonth(d)}${hasTaskOn(d) ? ', Aufgabe beginnt oder endet' : ''}${d === t0 ? ', heute' : ''}`}
                      onClick={() => { if (dayFilter && d === cursor) setDayFilter(false); else { setCursor(d); setDayFilter(true); } }}>
                      <span className="num">{dt.getDate()}</span>
                      <span className="wd">{WEEKDAYS_SHORT[dt.getDay()]}</span>
                      <span className={`mark${hasTaskOn(d) ? ' has' : ''}`} />
                    </button>
                  );
                })}
              </div>
              <div className="spread" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                <span className="small muted">{dayFilter ? `Aufgaben am ${fmtDayMonth(cursor)}` : (mEnd !== monthEnd ? `${MONTHS[month0]} ${year} und Aufgaben bis ${fmtDate(mEnd)}` : `Alle Aufgaben im ${MONTHS[month0]} ${year}`)}</span>
                <div className="row-wrap">
                  {dayFilter && <button className="text-link" onClick={() => setDayFilter(false)}>Ganzen Monat zeigen</button>}
                  {cursor !== t0 && <button className="text-link" onClick={() => { setCursor(t0); setDayFilter(false); }}>Heute</button>}
                </div>
              </div>
            </div>

            {overdue.length > 0 && !dayFilter && (
              <Notice kind="warn" title={`${overdue.length} offene Aufgabe${overdue.length > 1 ? 'n' : ''} aus früheren Monaten`}>
                {overdue.map((t, i) => <span key={t.id}>{i > 0 && ', '}<a href={`#/plan/aufgabe/${t.id}`}>{t.title}</a></span>)}
              </Notice>
            )}

            {visible.length ? (
              <div className="timeline">
                {visible.map((t, i) => <TaskCard key={t.id} t={t} all={areaTasks} primary={i === 0 && t.status !== 'erledigt'} />)}
              </div>
            ) : (
              <Empty icon="calendar" title={dayFilter ? 'An diesem Tag ist nichts geplant' : 'In diesem Monat ist nichts geplant'}>
                {Number(year) < Number(t0.slice(0, 4)) ? 'Für vergangene Jahre werden keine Vorschläge erzeugt.' : 'Vorschläge entstehen aus deinen Angaben. Du kannst jederzeit eigene Aufgaben ergänzen.'}
              </Empty>
            )}
            {doneCount > 0 && (
              <label className="checkbox-row small"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Erledigte Aufgaben anzeigen ({doneCount})</label>
            )}
          </div>

          <div className="stack col-side">
            <Notice title="Dein Plan bleibt flexibel">
              Erledigte oder verschobene Aufgaben werden berücksichtigt. Vorschläge beruhen auf Regeln, die fachlich noch nicht geprüft sind, und ersetzen keine Beratung. Ohne Wetteranbindung sind Termine nicht wetteroptimiert.
            </Notice>
            <button className="btn btn-outline btn-block" onClick={() => setFormOpen(true)}><Icon name="plus" size={18} /> Eigene Aufgabe</button>
            <button className="btn btn-ghost btn-block" onClick={() => void exportIcs()}><Icon name="calendarClock" size={18} /> Offene Aufgaben als Kalender (ICS)</button>
          </div>
        </div>
      ) : (
        <YearView year={year} setYear={(y) => setCursor(toISO(new Date(y, month0, 1)))} tasks={areaTasks} onOpenMonth={(m) => { setCursor(m === parseISO(t0).getMonth() && year === Number(t0.slice(0, 4)) ? t0 : toISO(new Date(year, m, 1))); setDayFilter(false); setView('zeitplan'); }} />
      )}

      {formOpen && <TaskForm open={formOpen} onClose={() => { setFormOpen(false); if (query(path).get('neu')) navigate('/plan', { replace: true }); }} areaId={area.id} />}
    </>
  );
}

function YearView({ year, setYear, tasks, onOpenMonth }: { year: number; setYear: (y: number) => void; tasks: Task[]; onOpenMonth: (m: number) => void }) {
  const t0 = today();
  const curYear = Number(t0.slice(0, 4));
  const curMonth = parseISO(t0).getMonth();
  return (
    <div className="stack">
      <div className="month-nav card" style={{ padding: 8 }}>
        <button className="icon-btn" onClick={() => setYear(year - 1)} aria-label="Vorheriges Jahr"><Icon name="chevronLeft" /></button>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--c-primary)' }} aria-live="polite">{year}</h2>
        <button className="icon-btn" onClick={() => setYear(year + 1)} aria-label="Nächstes Jahr"><Icon name="chevronRight" /></button>
      </div>
      <div className="year-grid">
        {MONTHS.map((m, i) => {
          const { start, end } = monthRange(year, i);
          const list = tasks.filter((t) => overlaps(scheduleStart(t.schedule), scheduleEnd(t.schedule), start, end)).sort(sortTasks);
          const isCur = year === curYear && i === curMonth;
          return (
            <section key={m} className={`card year-month${isCur ? ' current' : ''}`} aria-label={`${m} ${year}`}>
              <h3><span>{m}</span>{isCur && <span className="badge">Aktuell</span>}</h3>
              {list.length ? (
                <ul>
                  {list.map((t) => (
                    <li key={t.id}>
                      <button onClick={() => navigate(`/plan/aufgabe/${t.id}`)}>
                        <Icon name={t.status === 'erledigt' ? 'checkCircle' : CATEGORY_ICON[t.category]} size={16} />
                        <span className="grow" style={{ textDecoration: t.status === 'erledigt' ? 'line-through' : undefined }}>{t.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="small muted">Keine Aufgaben</p>}
              <button className="text-link small" onClick={() => onOpenMonth(i)}>Monat öffnen <Icon name="chevronRight" size={14} /></button>
            </section>
          );
        })}
      </div>
      <p className="small muted">Für {year < curYear ? 'vergangene Jahre werden keine Vorschläge erzeugt' : `${year} werden Vorschläge erzeugt, sobald du das Jahr öffnest`}. Eigene Aufgaben erscheinen immer.</p>
    </div>
  );
}

