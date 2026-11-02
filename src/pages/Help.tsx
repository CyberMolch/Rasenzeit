import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { Icon, type IconName } from '../ui/icons';
import { Empty, IconBubble, Notice, PageHead, ReviewTag, SectionTitle, SubHead } from '../ui/components';
import { ENTRIES } from '../content/lexicon/plants';
import { searchText } from '../content/lexicon/filters';
import { coverFor } from '../content/lexicon/media';
import { RefImage } from '../ui/media';
import { PROBLEMS, getProblem } from '../content/problems';

const PROBLEM_ICON: Record<string, IconName> = { moss: 'grass', dry: 'sun', water: 'droplet', mushroom: 'mushroom' };

export function HelpPage() {
  const store = useStore();
  const area = store.activeArea!;
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!term) return null;
    const t = term.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss');
    const plants = ENTRIES.filter((p) => searchText(p).includes(t));
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
                <a key={p.id} className="list-row" href={`#/hilfe/pflanze/${p.id}`}><span className="sim-thumb" style={{ width: 48, height: 48 }}><RefImage img={coverFor(p.id)} /></span><span className="grow"><span className="title" style={{ display: 'block' }}>{p.taxon.nameDe}</span><span className="sub"><em>{p.taxon.scientific}</em> · Pflanzenlexikon</span></span><Icon name="chevronRight" className="chev" /></a>
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

          <section className="card card-pad-lg lex-entry" aria-labelledby="lex-entry-h">
            <div className="stack-sm">
              <h2 id="lex-entry-h" style={{ fontSize: '1.4rem' }}>Pflanzenlexikon</h2>
              <p className="muted">Entdecke typische Pflanzen im Rasen und vergleiche ihre Merkmale.</p>
              <div><a className="btn btn-primary" href="#/hilfe/lexikon">Pflanzen ansehen</a></div>
            </div>
          </section>

          <section>
            <SectionTitle action={<a className="text-link" href="#/hilfe/lexikon">Alle {ENTRIES.length} ansehen</a>}>Typische Pflanzen im Rasen</SectionTitle>
            <div className="plant-grid">
              {ENTRIES.slice(0, 4).map((p) => (
                <a key={p.id} href={`#/hilfe/pflanze/${p.id}`} className="card plant-tile">
                  <div className="lex-img"><RefImage img={coverFor(p.id)} /></div>
                  <span className="pt-foot"><span>{p.taxon.nameDe}</span><Icon name="chevronRight" size={18} /></span>
                </a>
              ))}
            </div>
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
