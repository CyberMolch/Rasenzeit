import { useMemo } from 'react';
import { useStore } from '../lib/store';
import { Icon } from '../ui/icons';
import { AttachmentImage, GardenArt, IconBubble, PageHead, SectionTitle, useAttachmentUrl } from '../ui/components';
import { CATEGORY_ICON, JOURNAL_ICON, areaSummary, scheduleLabel, soilSummary, taskBadges } from '../ui/helpers';
import { nextSteps, missingInputs, openDependencies } from '../planning/engine';
import { greeting, relativeDays } from '../lib/dates';
import { navigate } from '../lib/router';

function Hero() {
  const { activeArea, data, setActiveArea } = useStore();
  const area = activeArea!;
  const { url } = useAttachmentUrl(area.photoId);
  const idx = data.areas.findIndex((a) => a.id === area.id);
  return (
    <div className="hero">
      {url ? <img src={url} alt={`Foto von ${area.name}`} /> : <GardenArt seed={idx} />}
      {data.areas.length > 1 && (
        <div className="hero-switch">
          <label className="sr-only" htmlFor="area-switch">Rasenfläche wechseln</label>
          <select id="area-switch" className="select" style={{ minHeight: 40, width: 'auto', background: 'rgba(255,255,255,.95)' }}
            value={area.id} onChange={(e) => void setActiveArea(e.target.value)}>
            {data.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}
      <div className="hero-text">
        <h2>{area.name}</h2>
        <p>{areaSummary(area)}</p>
      </div>
    </div>
  );
}

export function Overview() {
  const store = useStore();
  const { data, activeArea } = store;
  const area = activeArea!;
  const tasks = useMemo(() => data.tasks.filter((t) => t.areaId === area.id), [data.tasks, area.id]);
  const steps = useMemo(() => nextSteps(tasks), [tasks]);
  const ctx = store.ruleContext(area.id);
  const next = steps[0];
  const later = steps.slice(1, 4);
  const recent = useMemo(
    () => data.journal.filter((j) => j.areaId === area.id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 3),
    [data.journal, area.id],
  );
  const soil = soilSummary(area);
  const firstName = data.user!.name.split(' ')[0];

  return (
    <>
      <PageHead title="Übersicht" subtitle={`${greeting()}, ${firstName}`} />
      <div className="cols">
        <div className="stack">
          <div>
            <Hero />
            <div className="soil-line">
              <Icon name="layers" size={18} />
              {soil ? <span>{soil}</span> : (
                <>
                  <span>Boden noch unbekannt</span>
                  <a className="text-link" href={`#/profil/flaeche/${area.id}/boden`}>Bodenprofil ergänzen <Icon name="chevronRight" size={16} /></a>
                </>
              )}
              {soil && <a className="text-link" style={{ marginLeft: 'auto' }} href={`#/profil/flaeche/${area.id}/boden`}>Mein Boden</a>}
            </div>
          </div>

          {next ? (
            <section className="card card-pad-lg next-card" aria-labelledby="next-title">
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <IconBubble name={CATEGORY_ICON[next.category]} size="lg" />
                <div className="grow">
                  <p className="eyebrow">Dein nächster Schritt</p>
                  <h2 id="next-title">{next.title}</h2>
                  <p className="muted">{next.description}</p>
                </div>
              </div>
              <div className="row-wrap">
                <span className="badge outline"><Icon name="calendar" size={14} /> {scheduleLabel(next)}</span>
                {taskBadges(next, tasks, missingInputs(next, ctx)).map((b) => <span key={b.text} className={`badge ${b.kind === 'sage' ? '' : b.kind}`}>{b.text}</span>)}
                {next.origin.type === 'regel' && <span className="badge neutral">Vorschlag</span>}
              </div>
              {openDependencies(tasks, next).length > 0 && (
                <p className="small muted">Wartet auf: {openDependencies(tasks, next).map((t) => t.title).join(', ')}</p>
              )}
              <button className="btn btn-primary btn-block" onClick={() => navigate(`/plan/aufgabe/${next.id}`)}>
                Aufgabe öffnen <Icon name="chevronRight" size={18} />
              </button>
            </section>
          ) : (
            <section className="card card-pad-lg next-card">
              <p className="eyebrow">Dein nächster Schritt</p>
              <h2>Gerade ist nichts geplant</h2>
              <p className="muted">Für diese Fläche gibt es keine offenen Aufgaben. Du kannst eine eigene Aufgabe anlegen oder den Zustand ergänzen, damit passende Vorschläge entstehen.</p>
              <div className="btn-row">
                <a className="btn btn-primary" href="#/plan?neu=1"><Icon name="plus" size={18} /> Eigene Aufgabe</a>
                <a className="btn btn-outline" href={`#/profil/flaeche/${area.id}`}>Zustand ergänzen</a>
              </div>
            </section>
          )}

          <section aria-labelledby="later-title">
            <SectionTitle action={<a className="text-link" href="#/plan">Pflegeplan</a>}><span id="later-title">Danach geplant</span></SectionTitle>
            {later.length ? (
              <div className="card list-card">
                {later.map((t) => (
                  <a key={t.id} href={`#/plan/aufgabe/${t.id}`} className="list-row">
                    <IconBubble name={CATEGORY_ICON[t.category]} />
                    <span className="grow">
                      <span className="title" style={{ display: 'block' }}>{t.title}</span>
                      <span className="sub">
                        {openDependencies(tasks, t).length ? `Nach: ${openDependencies(tasks, t)[0].title}` : scheduleLabel(t)}
                        {missingInputs(t, ctx).length ? ' · Angaben fehlen' : ''}
                      </span>
                    </span>
                    <Icon name="chevronRight" className="chev" />
                  </a>
                ))}
              </div>
            ) : <p className="muted card">Keine weiteren Aufgaben geplant.</p>}
          </section>
        </div>

        <div className="stack col-side">
          <section className="card" style={{ padding: 0, overflow: 'hidden' }} aria-labelledby="help-title">
            <div className="row" style={{ alignItems: 'stretch', flexWrap: 'wrap' }}>
              <div className="icon-bubble lg" style={{ margin: '16px 0 0 16px' }}><Icon name="search" size={28} /></div>
              <div className="grow" style={{ padding: 16, minWidth: 200 }}>
                <h3 id="help-title">Unbekannte Pflanze im Rasen?</h3>
                <p className="muted small" style={{ margin: '4px 0 6px' }}>Merkmale vergleichen, Möglichkeiten eingrenzen und Funde dokumentieren.</p>
                <a className="text-link" href="#/hilfe">Zur Rasenhilfe <Icon name="chevronRight" size={16} /></a>
              </div>
            </div>
          </section>

          <section aria-labelledby="recent-title">
            <SectionTitle action={<a className="text-link" href="#/tagebuch">Tagebuch</a>}><span id="recent-title">Zuletzt erledigt</span></SectionTitle>
            {recent.length ? (
              <div className="card list-card">
                {recent.map((j) => (
                  <a key={j.id} href={`#/tagebuch/eintrag/${j.id}`} className="list-row">
                    {j.photoIds[0] ? <div style={{ width: 48, flexShrink: 0 }}><AttachmentImage id={j.photoIds[0]} alt="" /></div> : <IconBubble name={JOURNAL_ICON[j.type]} />}
                    <span className="grow">
                      <span className="title" style={{ display: 'block' }}>{j.title}</span>
                      <span className="sub">{relativeDays(j.date)}</span>
                    </span>
                    <Icon name="chevronRight" className="chev" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="card"><p className="muted">Noch keine Einträge. Erledigte Aufgaben und eigene Notizen erscheinen hier.</p></div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
