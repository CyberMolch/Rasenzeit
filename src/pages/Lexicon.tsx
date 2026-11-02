import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../lib/store';
import { Icon } from '../ui/icons';
import { Empty, Notice, ReviewTag, SubHead } from '../ui/components';
import { Credit, Lightbox, RefImage, RefPlaceholder, ZoomPane, usePreviewUrls } from '../ui/media';
import { ENTRIES, GLOSSARY, getEntry, type LexiconEntry } from '../content/lexicon/plants';
import {
  BLOOM_LABEL, CATEGORY_LABEL, EMPTY_FILTER, FILTER_OPTIONS, GROWTH_LABEL, MARGIN_LABEL, SHAPE_LABEL,
  applyFilters, criteriaCount, isEmptyFilter, matchedName, type FilterState,
} from '../content/lexicon/filters';
import { MEDIA_GENERATED_AT, SLOT_LABEL, SLOT_ORDER, TOTAL_IMAGES, TOTAL_IMAGE_BYTES, coverFor, imagesFor, missingSlots, taxonomyFor } from '../content/lexicon/media';
import { CHEMICAL_NOTE } from '../content/plants';
import { fmtBytes, isNativeApp, validateUpload } from '../lib/files';
import { navigate } from '../lib/router';
import { ObservationForm, ObservationList } from './Observations';
import { MONTHS, fmtDate } from '../lib/dates';

const FILTER_KEY = 'rz.lexikon.filter';

function loadFilter(): FilterState {
  try { const s = sessionStorage.getItem(FILTER_KEY); if (s) return { ...EMPTY_FILTER, ...JSON.parse(s) }; } catch { /* ignorieren */ }
  return EMPTY_FILTER;
}

function FavButton({ id, name, className }: { id: string; name: string; className?: string }) {
  const store = useStore();
  const on = store.data.favorites.includes(id);
  return (
    <button type="button" className={className ?? 'fav-btn'} aria-pressed={on} aria-label={on ? `${name} aus Favoriten entfernen` : `${name} zu Favoriten hinzufügen`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); void store.run(() => store.toggleFavorite(id)); }}>
      <Icon name={on ? 'starFilled' : 'star'} size={20} />
    </button>
  );
}

function ChipGroup<T extends string>({ legend, options, labels, values, onChange, hint, extra }: {
  legend: string; options: T[]; labels: Record<T, string>; values: T[]; onChange: (v: T[]) => void; hint?: string; extra?: ReactNode;
}) {
  return (
    <fieldset className="chip-group">
      <legend>{legend}{values.length > 0 && <button type="button" className="text-link small" style={{ marginLeft: 8, minHeight: 28 }} onClick={() => onChange([])}>Zurücksetzen</button>}</legend>
      {hint && <p className="tiny muted">{hint}</p>}
      <div className="chip-wrap">
        {options.map((o) => (
          <button key={o} type="button" className="chip chip-sm" aria-pressed={values.includes(o)}
            onClick={() => onChange(values.includes(o) ? values.filter((x) => x !== o) : [...values, o])}>{labels[o]}</button>
        ))}
        {extra}
      </div>
    </fieldset>
  );
}

function OfflineStatus() {
  const native = isNativeApp();
  return (
    <section className="card stack-sm" aria-labelledby="offline-h">
      <h3 id="offline-h">Offline-Nutzung</h3>
      {native ? (
        <p className="small">Texte und {TOTAL_IMAGES} Referenzbilder ({fmtBytes(TOTAL_IMAGE_BYTES)}) sind in der App enthalten und auch ohne Internetverbindung verfügbar. Nur Quellenlinks öffnen externe Webseiten.</p>
      ) : (
        <p className="small">In der Web-Version sind die Lexikontexte in der Seite enthalten. Die {TOTAL_IMAGES} Referenzbilder ({fmtBytes(TOTAL_IMAGE_BYTES)}) werden beim Ansehen geladen; eine Offline-Speicherung ist hier nicht eingerichtet. In der Android-App ist alles offline verfügbar.</p>
      )}
    </section>
  );
}

// ======================================================================= Übersicht

export function LexiconPage() {
  const store = useStore();
  const [f, setF] = useState<FilterState>(loadFilter);
  const [showFilters, setShowFilters] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 960);
  useEffect(() => { try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(f)); } catch { /* ignorieren */ } }, [f]);
  const favorites = store.data.favorites;
  const list = useMemo(() => applyFilters(ENTRIES, f, favorites).sort((a, b) => a.taxon.nameDe.localeCompare(b.taxon.nameDe, 'de')), [f, favorites]);
  const n = criteriaCount(f);
  const set = <K extends keyof FilterState>(k: K, v: FilterState[K]) => setF((x) => ({ ...x, [k]: v }));

  return (
    <>
      <SubHead title="Pflanzenlexikon" subtitle="Typische Pflanzen im Rasen – Merkmale vergleichen und selbst eingrenzen." backTo="/hilfe" backLabel="Rasenhilfe" />
      <div className="lex-layout">
        <aside className="lex-filters" aria-label="Suche und Filter">
          <div className="search" role="search">
            <Icon name="search" size={22} />
            <label htmlFor="lex-q" className="sr-only">Deutscher oder wissenschaftlicher Name, Synonym</label>
            <input id="lex-q" className="input" type="search" placeholder="Name oder wissenschaftlicher Name" value={f.q} onChange={(e) => set('q', e.target.value)} />
          </div>
          <div className="row-wrap" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-outline btn-sm" aria-expanded={showFilters} aria-controls="lex-filter-panel" onClick={() => setShowFilters(!showFilters)}>
              <Icon name="filter" size={16} /> Merkmale {n > 0 ? `(${n})` : ''}
            </button>
            <button type="button" className="chip chip-sm" aria-pressed={f.nurFavoriten} onClick={() => set('nurFavoriten', !f.nurFavoriten)}>
              <Icon name="star" size={14} /> Nur Favoriten{favorites.length ? ` (${favorites.length})` : ''}
            </button>
            {!isEmptyFilter(f) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setF(EMPTY_FILTER)}><Icon name="refresh" size={16} /> Alle Filter zurücksetzen</button>}
          </div>
          {showFilters && (
            <div id="lex-filter-panel" className="card stack" style={{ marginTop: 12 }}>
              <p className="small muted">Wähle nur, was du sicher erkennst. Unbekannte Merkmale einfach auslassen – mehrere Werte in einer Gruppe gelten als „oder“.</p>
              <ChipGroup legend="Kategorie" options={FILTER_OPTIONS.kategorie} labels={CATEGORY_LABEL} values={f.kategorie} onChange={(v) => set('kategorie', v)} />
              <ChipGroup legend="Blütenfarbe" options={FILTER_OPTIONS.bluete} labels={BLOOM_LABEL} values={f.bluete} onChange={(v) => setF((x) => ({ ...x, bluete: v, keineBluete: v.length ? false : x.keineBluete }))}
                extra={<button type="button" className="chip chip-sm" aria-pressed={f.keineBluete} onClick={() => setF((x) => ({ ...x, keineBluete: !x.keineBluete, bluete: [] }))}>Keine Blüte sichtbar</button>} />
              <ChipGroup legend="Blattform" options={FILTER_OPTIONS.blattform} labels={SHAPE_LABEL} values={f.blattform} onChange={(v) => set('blattform', v)} />
              <ChipGroup legend="Blattrand" options={FILTER_OPTIONS.blattrand} labels={MARGIN_LABEL} values={f.blattrand} onChange={(v) => set('blattrand', v)} />
              <ChipGroup legend="Wuchsform" options={FILTER_OPTIONS.wuchs} labels={GROWTH_LABEL} values={f.wuchs} onChange={(v) => set('wuchs', v)} />
            </div>
          )}
          <div className="lex-side-extra"><OfflineStatus /></div>
        </aside>

        <section aria-labelledby="lex-results" className="stack">
          <h2 id="lex-results" className="section-title" style={{ marginBottom: 0 }} aria-live="polite">
            <span>{list.length === ENTRIES.length ? `${ENTRIES.length} Pflanzen` : `${list.length} von ${ENTRIES.length} Pflanzen`}</span>
          </h2>
          {f.keineBluete && (
            <Notice title="Keine Blüte sichtbar">Viele Arten blühen nur zeitweise, und nach dem Mähen fehlen Blüten oft. Deshalb bleiben blühende Arten in der Liste. Vergleiche Blattform, Blattrand und Wuchsform.</Notice>
          )}
          {list.length > 0 && n > 0 && (n < 3 || list.length === 1) && (
            <Notice kind="warn" title="Noch keine Bestimmung">{list.length === 1 ? 'Nur ein Eintrag passt zu deinen Angaben. Das heißt nicht, dass es diese Art ist – im Lexikon sind nur 20 typische Arten enthalten. Prüfe die Merkmale und ähnlichen Pflanzen im Steckbrief.' : 'Mit wenigen Merkmalen bleiben mehrere Arten möglich. Vergleiche die Steckbriefe und ergänze weitere Merkmale, wenn du sie sicher erkennst.'}</Notice>
          )}
          {list.length === 0 ? (
            <Empty icon="search" title="Keine passenden Einträge" action={<button className="btn btn-primary" onClick={() => setF(EMPTY_FILTER)}>Alle Filter zurücksetzen</button>}>
              Zu dieser Kombination ist kein Eintrag hinterlegt. Vielleicht passt ein Merkmal nicht genau oder die Pflanze ist nicht im Lexikon. Du kannst sie trotzdem als unbestimmte Pflanze dokumentieren.
            </Empty>
          ) : (
            <div className="lex-grid">
              {list.map((e) => {
                const via = matchedName(e, f.q);
                return (
                  <a key={e.id} href={`#/hilfe/pflanze/${e.id}`} className="card plant-tile lex-tile">
                    <div className="lex-img"><RefImage img={coverFor(e.id)} /></div>
                    <FavButton id={e.id} name={e.taxon.nameDe} />
                    <span className="lex-tile-text">
                      <strong>{e.taxon.nameDe}</strong>
                      <em className="small muted">{e.taxon.scientific}</em>
                      {via && <span className="tiny muted">auch: {via}</span>}
                    </span>
                  </a>
                );
              })}
            </div>
          )}
          <p className="tiny muted">Redaktionelle Auswahl typischer Pflanzen im Rasen, keine Rangliste der häufigsten Arten. Moose sind nicht enthalten.</p>
          <div className="lex-bottom-extra"><OfflineStatus /></div>
        </section>
      </div>
    </>
  );
}

// ======================================================================= Steckbrief

function GlossaryHints({ texts }: { texts: string[] }) {
  const joined = texts.join(' ').toLowerCase();
  const terms = Object.entries(GLOSSARY).filter(([t]) => joined.includes(t.toLowerCase()));
  if (!terms.length) return null;
  return (
    <details className="glossary">
      <summary>Begriffe erklärt ({terms.length})</summary>
      <dl className="kv small" style={{ marginTop: 8 }}>{terms.map(([t, d]) => <Fragment key={t}><dt>{t}</dt><dd>{d}</dd></Fragment>)}</dl>
    </details>
  );
}

function Gallery({ e }: { e: LexiconEntry }) {
  const imgs = imagesFor(e.id);
  const [open, setOpen] = useState<number | null>(null);
  const missing = missingSlots(e.id);
  return (
    <section className="stack-sm" aria-labelledby="gal-h">
      <h2 id="gal-h" className="section-title" style={{ marginBottom: 0 }}>Bilder</h2>
      <div className="gallery">
        {SLOT_ORDER.map((slot) => {
          const i = imgs.findIndex((x) => x.slot === slot);
          if (i < 0) return <figure key={slot} className="gal-item"><div className="gal-img"><RefPlaceholder slot={slot} /></div><figcaption className="small muted">{SLOT_LABEL[slot]}</figcaption></figure>;
          const img = imgs[i];
          return (
            <figure key={slot} className="gal-item">
              <button type="button" className="gal-img" onClick={() => setOpen(i)} aria-label={`${img.caption} vergrößern`}>
                <RefImage img={img} />
                <span className="gal-zoom" aria-hidden="true"><Icon name="zoomIn" size={18} /></span>
              </button>
              <figcaption><span className="small">{img.caption}</span><Credit img={img} short /></figcaption>
            </figure>
          );
        })}
      </div>
      {missing.length > 0 && <p className="tiny muted">Für {missing.map((m) => SLOT_LABEL[m]).join(', ')} ist noch kein geprüftes Referenzbild hinterlegt.</p>}
      <Lightbox images={imgs} index={open} onIndex={setOpen} onClose={() => setOpen(null)} title={e.taxon.nameDe} />
    </section>
  );
}

export function LexiconDetail({ id }: { id: string }) {
  const store = useStore();
  const e = getEntry(id);
  const [tab, setTab] = useState<'erkennen' | 'umgang' | 'verlauf' | 'quellen'>('erkennen');
  const [obsOpen, setObsOpen] = useState(false);
  useEffect(() => { setTab('erkennen'); }, [id]);
  if (!e) return <><SubHead title="Pflanze" backTo="/hilfe/lexikon" backLabel="Pflanzenlexikon" /><Empty icon="leaf" title="Eintrag nicht gefunden" /></>;
  const area = store.activeArea!;
  const obs = store.data.observations.filter((o) => o.plantId === e.id && o.areaId === area.id);
  const tax = taxonomyFor(e.id);
  const tabs = [['erkennen', 'Erkennen'], ['umgang', 'Umgang im Rasen'], ['verlauf', `Verlauf${obs.length ? ` (${obs.length})` : ''}`], ['quellen', 'Quellen']] as const;

  return (
    <>
      <SubHead title={e.taxon.nameDe} backTo="/hilfe/lexikon" backLabel="Pflanzenlexikon"
        subtitle={<><em>{e.taxon.scientific}</em> {e.taxon.authority} · {e.taxon.family}</>}>
        <FavButton id={e.id} name={e.taxon.nameDe} className="btn btn-outline fav-inline" />
      </SubHead>
      <div className="row-wrap" style={{ marginBottom: 12 }}>
        <span className="badge">{e.category === 'gras' ? 'Gras' : 'Kraut'}</span>
        {e.taxon.rank === 'Artengruppe' && <span className="badge neutral">Artengruppe</span>}
        <ReviewTag meta={e} />
      </div>
      <div className="btn-row" style={{ marginBottom: 20 }}>
        <a className="btn btn-primary" href={`#/hilfe/pflanze/${e.id}/vergleich`}><Icon name="columns" size={18} /> Mit meinem Foto vergleichen</a>
        <button type="button" className="btn btn-outline" onClick={() => setObsOpen(true)}><Icon name="eye" size={18} /> Als Beobachtung speichern</button>
      </div>

      <div className="tabs" role="tablist" aria-label="Bereiche des Steckbriefs">
        {tabs.map(([k, l]) => (
          <button key={k} role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls={`panel-${k}`} tabIndex={tab === k ? 0 : -1}
            onClick={() => setTab(k)}
            onKeyDown={(ev) => {
              const i = tabs.findIndex((t) => t[0] === tab);
              if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
                const next = tabs[(i + (ev.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length][0];
                setTab(next); requestAnimationFrame(() => document.getElementById(`tab-${next}`)?.focus());
              }
            }}>{l}</button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}>
        {tab === 'erkennen' && (
          <div className="cols">
            <div className="stack">
              <section className="card stack-sm">
                <h2 className="section-title" style={{ marginBottom: 0 }}>Überblick</h2>
                <p>{e.short}</p>
                {e.groupNote && <p className="small muted">{e.groupNote}</p>}
                {e.synonyms.length > 0 && <p className="small"><span className="muted">Weitere Namen: </span>{e.synonyms.join(', ')}</p>}
              </section>
              <Gallery e={e} />
              <section className="card stack-sm" aria-labelledby="merk-h">
                <h2 id="merk-h" className="section-title" style={{ marginBottom: 0 }}>Erkennungsmerkmale</h2>
                <dl className="kv">
                  <dt>Blätter</dt><dd>{e.features.leaves}</dd>
                  <dt>{e.category === 'gras' ? 'Blütenstand' : 'Blüten'}</dt><dd>{e.features.flowers}</dd>
                  <dt>Wuchs</dt><dd>{e.features.growth}</dd>
                  {e.bloom && <><dt>Blütezeit</dt><dd>etwa {MONTHS[e.bloom[0] - 1]} bis {MONTHS[e.bloom[1] - 1]}</dd></>}
                </dl>
                {e.features.other.length > 0 && <ul className="reason-list">{e.features.other.map((x) => <li key={x}><Icon name="check" size={18} /><span>{x}</span></li>)}</ul>}
                <Notice icon="info" title="Nach dem Mähen">{e.mowingNote}</Notice>
                <GlossaryHints texts={[e.features.leaves, e.features.flowers, e.features.growth, ...e.features.other]} />
              </section>
            </div>
            <div className="stack col-side">
              <section className="card stack-sm" aria-labelledby="sim-h">
                <h2 id="sim-h" className="section-title" style={{ marginBottom: 0 }}>Ähnliche Pflanzen</h2>
                {e.lookalikes.map((l) => {
                  const other = l.id ? getEntry(l.id) : undefined;
                  return (
                    <div key={l.name} className="sim-item">
                      {other ? (
                        <a href={`#/hilfe/pflanze/${other.id}`} className="sim-link">
                          <span className="sim-thumb"><RefImage img={coverFor(other.id)} /></span>
                          <strong>{l.name}</strong><Icon name="chevronRight" size={16} />
                        </a>
                      ) : <strong>{l.name}</strong>}
                      <p className="small">{l.difference}</p>
                      {l.photoLimit && <p className="tiny warn-text"><Icon name="alert" size={14} /> Anhand von Fotos oft nicht sicher unterscheidbar.</p>}
                      {!other && <p className="tiny muted">Nicht im Lexikon enthalten.</p>}
                    </div>
                  );
                })}
              </section>
              <Notice title="Standort">{e.site}</Notice>
            </div>
          </div>
        )}

        {tab === 'umgang' && (
          <div className="cols">
            <div className="stack">
              <section className="card stack-sm"><h3>Einordnung</h3><p>{e.care.assessment}</p></section>
              <section className="card stack-sm"><h3>Belassen</h3><p>{e.care.keep}</p></section>
              <section className="card stack-sm">
                <h3>Falls du sie entfernen möchtest</h3>
                <ul className="reason-list">{e.care.mechanical.map((x) => <li key={x}><Icon name="wrench" size={18} /><span>{x}</span></li>)}</ul>
                <h3 style={{ marginTop: 8 }}>Rasenpflege und Vorbeugung</h3>
                <ul className="reason-list">{e.care.prevention.map((x) => <li key={x}><Icon name="sprout" size={18} /><span>{x}</span></li>)}</ul>
                <p className="small muted">Keine dieser Maßnahmen garantiert einen Erfolg. Rasenzeit legt keine Aufgaben automatisch an – plane eine Maßnahme bei Bedarf selbst über eine Beobachtung oder den Pflegeplan.</p>
              </section>
            </div>
            <div className="stack col-side">
              {e.care.limits.length > 0 && <Notice kind="warn" title="Grenzen">{e.care.limits.join(' ')}</Notice>}
              {e.safety && <Notice kind="warn" icon="alert" title="Hinweis">{e.safety}</Notice>}
              <Notice title="Chemische Mittel">{CHEMICAL_NOTE}</Notice>
            </div>
          </div>
        )}

        {tab === 'verlauf' && (
          <div className="stack">
            <div className="spread" style={{ flexWrap: 'wrap' }}>
              <p className="muted">Deine Beobachtungen mit der Zuordnung „{e.taxon.nameDe}“ auf „{area.name}“.</p>
              <button className="btn btn-primary" onClick={() => setObsOpen(true)}><Icon name="plus" size={18} /> Als Beobachtung speichern</button>
            </div>
            <ObservationList list={obs} emptyText={`Noch keine Beobachtung mit der Zuordnung ${e.taxon.nameDe}.`} />
          </div>
        )}

        {tab === 'quellen' && (
          <div className="stack">
            <section className="card stack-sm">
              <h2 className="section-title" style={{ marginBottom: 0 }}>Fachquellen und Prüfstand</h2>
              <dl className="kv small">
                <dt>Texte</dt><dd>Redaktioneller Entwurf auf Grundlage botanischer Standardmerkmale. Eine fachliche Prüfung steht aus.</dd>
                <dt>Name</dt><dd>
                  {tax?.gbif?.url ? <>Abgleich mit GBIF am {fmtDate(tax.checkedAt)}: <a href={tax.gbif.url} target="_blank" rel="noopener noreferrer">{tax.gbif.scientificName}</a> ({tax.gbif.status === 'ACCEPTED' ? 'akzeptierter Name' : tax.gbif.status}{tax.gbif.matchType === 'EXACT' ? ', exakte Übereinstimmung' : ''})</> : 'Noch nicht automatisch abgeglichen.'}
                  {e.taxon.rank === 'Artengruppe' && <><br /><span className="muted">Im Lexikon als Artengruppe geführt; GBIF wurde mit „{tax?.queried ?? e.taxon.scientific}“ abgefragt.</span></>}
                </dd>
                {tax?.wikipedia && <><dt>Übersicht</dt><dd><a href={tax.wikipedia.url} target="_blank" rel="noopener noreferrer">Wikipedia: {tax.wikipedia.title}</a> <span className="muted">(allgemeine Übersicht, keine Fachquelle)</span></dd></>}
                <dt>Bilder</dt><dd><a href={`https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(e.taxon.commons[0].replace(/ /g, '_'))}`} target="_blank" rel="noopener noreferrer">Wikimedia Commons: {e.taxon.commons[0]}</a></dd>
              </dl>
              <div><ReviewTag meta={e} /></div>
            </section>
            <section className="card stack-sm" aria-labelledby="bn-h">
              <h2 id="bn-h" className="section-title" style={{ marginBottom: 0 }}>Bildnachweise</h2>
              {imagesFor(e.id).length === 0 ? <p className="muted">Noch keine Bilder hinterlegt.</p> : (
                <div className="credits">
                  {imagesFor(e.id).map((img) => (
                    <article key={img.src} className="credit-row">
                      <div className="credit-thumb"><RefImage img={img} /></div>
                      <dl className="kv small">
                        <dt>Bild</dt><dd>{img.caption}</dd>
                        <dt>Urheber</dt><dd>{img.author}</dd>
                        <dt>Lizenz</dt><dd>{img.licenseUrl ? <a href={img.licenseUrl} target="_blank" rel="noopener noreferrer">{img.license}</a> : img.license}</dd>
                        <dt>Quelle</dt><dd><a href={img.sourcePage} target="_blank" rel="noopener noreferrer">{img.commonsTitle.replace(/^File:/, '')}</a></dd>
                        <dt>Änderungen</dt><dd>{img.changes}</dd>
                      </dl>
                    </article>
                  ))}
                </div>
              )}
              {MEDIA_GENERATED_AT && <p className="tiny muted">Bildnachweise automatisch aus der Wikimedia-Commons-API übernommen am {fmtDate(MEDIA_GENERATED_AT.slice(0, 10))}. Art und Motiv redaktionell gesichtet.</p>}
            </section>
          </div>
        )}
      </div>
      {obsOpen && <ObservationForm open onClose={() => setObsOpen(false)} plantId={e.id} identification="vermutet" />}
    </>
  );
}

// ======================================================================= Fotovergleich

export function LexiconCompare({ id }: { id: string }) {
  const store = useStore();
  const [plantId, setPlantId] = useState(id);
  const e = getEntry(plantId);
  const [files, setFiles] = useState<File[]>([]);
  const [ref, setRef] = useState(0);
  const [view, setView] = useState<'mein' | 'ref'>('mein');
  const [obsOpen, setObsOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [mine] = usePreviewUrls(files);
  useEffect(() => setRef(0), [plantId]);
  if (!e) return <><SubHead title="Fotovergleich" backTo="/hilfe/lexikon" /><Empty icon="leaf" title="Eintrag nicht gefunden" /></>;
  const refs = imagesFor(e.id);
  const r = refs[Math.min(ref, refs.length - 1)];

  const pick = (list: FileList | null) => {
    const f = list?.[0];
    if (!f) return;
    const err = validateUpload(f, 'foto');
    if (err) { store.toast(err, 'error'); return; }
    setFiles([f]);
    setView('mein');
    if (input.current) input.current.value = '';
  };

  return (
    <>
      <SubHead title="Mit meinem Foto vergleichen" subtitle={<>Vergleich mit <strong>{e.taxon.nameDe}</strong></>} backTo={`/hilfe/pflanze/${e.id}`} backLabel={e.taxon.nameDe} />
      <p className="cmp-label"><Icon name="info" size={18} /> Manueller Bildvergleich – keine automatische Erkennung.</p>
      <div className="row-wrap" style={{ margin: '12px 0' }}>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(ev) => pick(ev.target.files)} />
        <button type="button" className="btn btn-primary" onClick={() => input.current?.click()}><Icon name="camera" size={18} /> {files.length ? 'Anderes Foto wählen' : 'Foto aufnehmen oder auswählen'}</button>
        <label className="sr-only" htmlFor="cmp-plant">Vergleichen mit</label>
        <select id="cmp-plant" className="select" style={{ width: 'auto', maxWidth: '100%' }} value={plantId} onChange={(ev) => setPlantId(ev.target.value)}>
          {[...ENTRIES].sort((a, b) => a.taxon.nameDe.localeCompare(b.taxon.nameDe, 'de')).map((x) => <option key={x.id} value={x.id}>Vergleichen mit: {x.taxon.nameDe}</option>)}
        </select>
      </div>

      <div className="segmented cmp-switch" role="tablist" aria-label="Ansicht auf kleinen Bildschirmen">
        <button role="tab" aria-selected={view === 'mein'} onClick={() => setView('mein')}>Mein Foto</button>
        <button role="tab" aria-selected={view === 'ref'} onClick={() => setView('ref')}>Referenz</button>
      </div>

      <div className="cmp" data-view={view}>
        <section className="card cmp-pane cmp-mine" aria-label="Mein Foto">
          {mine ? <ZoomPane src={mine} alt="Mein Foto" label="Mein Foto" /> : (
            <button type="button" className="cmp-empty" onClick={() => input.current?.click()}>
              <Icon name="camera" size={30} /><span>Foto aufnehmen oder aus der Galerie wählen</span>
            </button>
          )}
        </section>
        <section className="card cmp-pane cmp-ref" aria-label="Referenzbild">
          {r ? (
            <>
              <ZoomPane src={r.src} alt={r.alt} label="Referenz">
                {refs.length > 1 && <>
                  <button type="button" className="icon-btn" onClick={() => setRef((ref - 1 + refs.length) % refs.length)} aria-label="Vorheriges Referenzbild"><Icon name="chevronLeft" /></button>
                  <button type="button" className="icon-btn" onClick={() => setRef((ref + 1) % refs.length)} aria-label="Nächstes Referenzbild"><Icon name="chevronRight" /></button>
                </>}
              </ZoomPane>
              <p className="small" style={{ padding: '0 12px' }}><strong>{r.caption}</strong> · Bild {ref + 1} von {refs.length}</p>
              <p className="tiny" style={{ padding: '0 12px 12px' }}><Credit img={r} /></p>
            </>
          ) : <div style={{ padding: 12 }}><RefPlaceholder /></div>}
        </section>
      </div>

      <div className="stack" style={{ marginTop: 16, maxWidth: 760 }}>
        <p className="small muted">Dein Foto bleibt auf diesem Gerät und wird an keinen Dienst übertragen. Es wird nur gespeichert, wenn du es einer Beobachtung zuordnest; sonst wird es beim Verlassen der Seite verworfen.</p>
        <div className="btn-row">
          <button type="button" className="btn btn-outline" disabled={!files.length} onClick={() => setObsOpen(true)}><Icon name="eye" size={18} /> Als Beobachtung speichern</button>
          <a className="btn btn-ghost" href={`#/hilfe/pflanze/${e.id}`}>Zum Steckbrief</a>
        </div>
      </div>
      {obsOpen && <ObservationForm open onClose={() => setObsOpen(false)} plantId={e.id} identification="vermutet" initialFiles={files}
        onSaved={(o) => { setFiles([]); navigate(`/hilfe/beobachtung/${o.id}`); }} />}
    </>
  );
}
