import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { Icon, type IconName } from '../ui/icons';
import { Empty, IconBubble, Notice, PageHead, PlantPlaceholder, ReviewTag, SectionTitle, SubHead } from '../ui/components';
import { CHEMICAL_NOTE, PLANTS, getPlant } from '../content/plants';
import { PROBLEMS, getProblem } from '../content/problems';
import { ObservationForm, ObservationList } from './Observations';

const PROBLEM_ICON: Record<string, IconName> = { moss: 'grass', dry: 'sun', water: 'droplet', mushroom: 'mushroom' };

export function HelpPage() {
  const store = useStore();
  const area = store.activeArea!;
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!term) return null;
    const plants = PLANTS.filter((p) => [p.name, p.botanical, ...p.aliases].some((s) => s.toLowerCase().includes(term)));
    const problems = PROBLEMS.filter((p) => [p.title, ...p.keywords].some((s) => s.toLowerCase().includes(term)));
    return { plants, problems };
  }, [term]);
  const obsCount = store.data.observations.filter((o) => o.areaId === area.id).length;

  return (
    <>
      <PageHead title="Rasenhilfe" subtitle="Probleme verstehen. Gezielt handeln." />
      <div className="search" role="search">
        <Icon name="search" size={22} />
        <label htmlFor="help-search" className="sr-only">Pflanze oder Problem suchen</label>
        <input id="help-search" className="input" type="search" placeholder="Pflanze oder Problem suchen" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {results ? (
        <section className="section" aria-live="polite">
          <SectionTitle>Suchergebnisse</SectionTitle>
          {results.plants.length + results.problems.length === 0 ? (
            <Empty icon="search" title="Nichts gefunden">Versuche einen anderen Begriff oder nutze die Bestimmungshilfe.</Empty>
          ) : (
            <div className="card list-card">
              {results.plants.map((p) => (
                <a key={p.id} className="list-row" href={`#/hilfe/pflanze/${p.id}`}><IconBubble name="leaf" /><span className="grow"><span className="title" style={{ display: 'block' }}>{p.name}</span><span className="sub">{p.botanical} · Pflanze</span></span><Icon name="chevronRight" className="chev" /></a>
              ))}
              {results.problems.map((p) => (
                <a key={p.id} className="list-row" href={`#/hilfe/problem/${p.id}`}><IconBubble name={PROBLEM_ICON[p.icon]} /><span className="grow"><span className="title" style={{ display: 'block' }}>{p.title}</span><span className="sub">Rasenproblem</span></span><Icon name="chevronRight" className="chev" /></a>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <div className="cols section">
        <div className="stack">
          <section className="card card-pad-lg guide-hero">
            <span className="icon-bubble lg" style={{ width: 96, height: 96, justifySelf: 'center' }}><Icon name="search" size={44} /></span>
            <div className="stack-sm">
              <h2 style={{ fontSize: '1.4rem' }}>Unkraut eingrenzen</h2>
              <p className="muted">Vergleiche Merkmale und ähnliche Pflanzen – ohne KI, mit nachvollziehbaren Fragen.</p>
              <a className="btn btn-primary" href="#/hilfe/bestimmung">Bestimmungshilfe starten</a>
            </div>
          </section>

          <section>
            <SectionTitle>Unkräuter im Überblick</SectionTitle>
            <div className="plant-grid">
              {PLANTS.map((p) => (
                <a key={p.id} href={`#/hilfe/pflanze/${p.id}`} className="card plant-tile">
                  <PlantPlaceholder name={p.name} />
                  <span className="pt-foot"><span>{p.id === 'fingerhirse' ? 'Fingerhirse' : p.name}</span><Icon name="chevronRight" size={18} /></span>
                </a>
              ))}
            </div>
            <p className="tiny muted" style={{ marginTop: 8 }}>Platzhalter: Geprüfte, rechtmäßig nutzbare Referenzfotos sind noch nicht hinterlegt. Zur Bestimmung dienen die beschriebenen Merkmale.</p>
          </section>
        </div>

        <div className="stack col-side">
          <section>
            <SectionTitle>Weitere Rasenprobleme</SectionTitle>
            <div className="card list-card">
              {PROBLEMS.map((p) => (
                <a key={p.id} className="list-row" href={`#/hilfe/problem/${p.id}`}><IconBubble name={PROBLEM_ICON[p.icon]} /><span className="grow title">{p.title}</span><Icon name="chevronRight" className="chev" /></a>
              ))}
            </div>
          </section>
          <div className="card list-card">
            <a className="list-row" href="#/hilfe/beobachtungen"><IconBubble name="file" /><span className="grow"><span className="title" style={{ display: 'block' }}>Meine Beobachtungen</span><span className="sub">Funde und Veränderungen dokumentieren{obsCount ? ` · ${obsCount} für ${area.name}` : ''}</span></span><Icon name="chevronRight" className="chev" /></a>
            <a className="list-row" href={`#/profil/flaeche/${area.id}/boden`}><IconBubble name="layers" /><span className="grow"><span className="title" style={{ display: 'block' }}>Boden und Standort prüfen</span><span className="sub">Bodenart, Wasserverhalten, Verdichtung, Messwerte</span></span><Icon name="chevronRight" className="chev" /></a>
          </div>
        </div>
      </div>
    </>
  );
}

export function PlantDetail({ id }: { id: string }) {
  const plant = getPlant(id);
  const store = useStore();
  const [tab, setTab] = useState<'erkennen' | 'massnahmen' | 'verlauf'>('erkennen');
  const [formOpen, setFormOpen] = useState(false);
  if (!plant) return <><SubHead title="Pflanze" backTo="/hilfe" backLabel="Rasenhilfe" /><Empty icon="leaf" title="Pflanze nicht gefunden" /></>;
  const area = store.activeArea!;
  const obs = store.data.observations.filter((o) => o.plantId === plant.id && o.areaId === area.id);
  return (
    <>
      <SubHead title={plant.name} subtitle={<><em>{plant.botanical}</em> · {plant.type}</>} backTo="/hilfe" backLabel="Rasenhilfe" />
      <div className="row-wrap" style={{ marginBottom: 16 }}><ReviewTag meta={plant} /></div>
      <div className="tabs" role="tablist" aria-label="Bereiche">
        {([['erkennen', 'Erkennen'], ['massnahmen', 'Maßnahmen'], ['verlauf', `Verlauf${obs.length ? ` (${obs.length})` : ''}`]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} aria-controls={`panel-${k}`} id={`tab-${k}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'erkennen' && (
          <div className="cols">
            <div className="stack">
              <section className="card stack-sm">
                <h2 className="section-title" style={{ marginBottom: 0 }}>Merkmale</h2>
                <p className="muted">{plant.short}</p>
                <ul className="reason-list">{plant.features.map((f) => <li key={f}><Icon name="check" size={18} /><span>{f}</span></li>)}</ul>
                <p className="small muted">{plant.season}</p>
              </section>
              <section className="card stack-sm">
                <h2 className="section-title" style={{ marginBottom: 0 }}>So kannst du vergleichen</h2>
                <ul className="reason-list">{plant.compare.map((f) => <li key={f}><Icon name="search" size={18} /><span>{f}</span></li>)}</ul>
              </section>
              <section className="card stack-sm">
                <h2 className="section-title" style={{ marginBottom: 0 }}>Verwechslungsarten</h2>
                <div className="stack-sm">
                  {plant.lookalikes.map((l) => <div key={l.name}><strong>{l.name}</strong><p className="small muted">{l.difference}</p></div>)}
                </div>
              </section>
            </div>
            <div className="stack col-side">
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}><PlantPlaceholder name={plant.name} /></div>
              <p className="tiny muted">Referenzbilder: noch keine geprüften Fotos hinterlegt. Bitte bestimme anhand der Merkmale.</p>
              <Notice title="Standort">{plant.siteNote}</Notice>
            </div>
          </div>
        )}
        {tab === 'massnahmen' && (
          <div className="cols">
            <div className="stack">
              {plant.measures.map((m) => (
                <section key={m.title} className="card stack-sm"><h3>{m.title}</h3><p>{m.text}</p></section>
              ))}
              <section className="card stack-sm">
                <h3>Passende Pflege</h3>
                <ul className="reason-list">{plant.care.map((c) => <li key={c}><Icon name="sprout" size={18} /><span>{c}</span></li>)}</ul>
              </section>
            </div>
            <div className="stack col-side">
              <Notice kind="warn" title="Grenzen">{plant.limits.join(' ')}</Notice>
              <Notice title="Chemische Mittel">{CHEMICAL_NOTE}</Notice>
            </div>
          </div>
        )}
        {tab === 'verlauf' && (
          <div className="stack">
            <div className="spread" style={{ flexWrap: 'wrap' }}>
              <p className="muted">Funde von {plant.name} auf „{area.name}“.</p>
              <button className="btn btn-primary" onClick={() => setFormOpen(true)}><Icon name="plus" size={18} /> Fund dokumentieren</button>
            </div>
            <ObservationList list={obs} emptyText={`Noch kein Fund von ${plant.name} dokumentiert.`} />
          </div>
        )}
      </div>
      {formOpen && <ObservationForm open onClose={() => setFormOpen(false)} plantId={plant.id} />}
    </>
  );
}

export function ProblemDetail({ id }: { id: string }) {
  const p = getProblem(id);
  const store = useStore();
  if (!p) return <><SubHead title="Problem" backTo="/hilfe" backLabel="Rasenhilfe" /><Empty icon="help" title="Inhalt nicht gefunden" /></>;
  const area = store.activeArea!;
  return (
    <>
      <SubHead title={p.title} subtitle={p.summary} backTo="/hilfe" backLabel="Rasenhilfe" />
      <div className="row-wrap" style={{ marginBottom: 16 }}><ReviewTag meta={p} /></div>
      <div className="cols">
        <div className="stack">
          <section className="card stack-sm">
            <h2 className="section-title" style={{ marginBottom: 0 }}>Mögliche Ursachen</h2>
            <p className="small muted">Keine Diagnose – häufig wirken mehrere Ursachen zusammen.</p>
            {p.possibleCauses.map((c) => <div key={c.title}><strong>{c.title}</strong><p className="small muted">{c.text}</p></div>)}
          </section>
          <section className="card stack-sm">
            <h2 className="section-title" style={{ marginBottom: 0 }}>Was du prüfen kannst</h2>
            <ul className="reason-list">{p.checks.map((c) => <li key={c}><Icon name="search" size={18} /><span>{c}</span></li>)}</ul>
          </section>
          <section className="card stack-sm">
            <h2 className="section-title" style={{ marginBottom: 0 }}>Mögliche Maßnahmen</h2>
            {p.measures.map((m) => <div key={m.title}><strong>{m.title}</strong><p className="small">{m.text}</p></div>)}
          </section>
        </div>
        <div className="stack col-side">
          {p.soilRelevant && (
            <section className="card stack-sm">
              <h3>Boden und Standort prüfen</h3>
              <p className="small muted">Bodenart, Wasserverhalten und Verdichtung von „{area.name}“ festhalten. Beobachtungen bleiben Hinweise, bis sie bestätigt sind.</p>
              <a className="btn btn-outline" href={`#/profil/flaeche/${area.id}/boden`}>Mein Boden öffnen</a>
            </section>
          )}
          <Notice kind="warn" title="Grenzen">{p.limits.join(' ')}</Notice>
          <a className="btn btn-ghost" href="#/tagebuch?neu=beobachtung"><Icon name="camera" size={18} /> Beobachtung im Tagebuch festhalten</a>
        </div>
      </div>
    </>
  );
}
