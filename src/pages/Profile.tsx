import { useState, type ReactElement } from 'react';
import { useStore } from '../lib/store';
import { Icon, type IconName } from '../ui/icons';
import { Dialog, Field, GardenArt, IconBubble, PageHead, SectionTitle, Switch, useAttachmentUrl } from '../ui/components';
import { areaSummary, initials, soilSummary } from '../ui/helpers';
import { USAGE_LABEL } from '../domain/labels';
import type { LawnArea } from '../domain/types';

function AreaImage({ area, seed }: { area: LawnArea; seed: number }) {
  const { url } = useAttachmentUrl(area.photoId);
  return <div className="area-img">{url ? <img src={url} alt={`Foto von ${area.name}`} /> : <GardenArt seed={seed} className="" />}</div>;
}

function Row({ href, icon, title, sub, onClick, right }: { href?: string; icon: IconName; title: string; sub: string; onClick?: () => void; right?: ReactElement }) {
  const inner = (
    <>
      <span className="icon-bubble" style={{ background: 'transparent' }}><Icon name={icon} size={28} /></span>
      <span className="grow"><span className="title" style={{ display: 'block' }}>{title}</span><span className="sub">{sub}</span></span>
      {right ?? <Icon name="chevronRight" className="chev" />}
    </>
  );
  if (href) return <a className="list-row" href={href}>{inner}</a>;
  return <div className="list-row" style={{ cursor: 'default' }} onClick={onClick}>{inner}</div>;
}

export function ProfilePage() {
  const store = useStore();
  const { data } = store;
  const user = data.user!;
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(user.name);
  const [err, setErr] = useState<string | null>(null);

  const saveName = async () => {
    if (!name.trim()) { setErr('Bitte gib einen Namen ein.'); return; }
    const ok = await store.run(() => store.saveUser({ name: name.trim() }), 'Name gespeichert.');
    if (ok !== undefined) setEditName(false);
  };

  return (
    <>
      <PageHead title="Profil" subtitle="Dein Garten. Deine Einstellungen." />
      <div className="cols">
        <div className="stack">
          <section className="card card-pad-lg row" style={{ flexWrap: 'wrap' }}>
            <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
            <div className="grow">
              <h2 style={{ fontSize: '1.4rem' }}>{user.name}</h2>
              <span className="badge neutral" title="Alle Funktionen sind in dieser Version frei verfügbar.">Basis</span>
            </div>
            <button className="text-link" onClick={() => { setName(user.name); setErr(null); setEditName(true); }}>Profil bearbeiten <Icon name="chevronRight" size={16} /></button>
          </section>

          <section aria-labelledby="areas">
            <SectionTitle><span id="areas">Meine Rasenflächen</span></SectionTitle>
            <div className="stack">
              {data.areas.map((a, i) => {
                const active = a.id === store.activeArea?.id;
                const soil = soilSummary(a);
                return (
                  <article key={a.id} className={`card area-card${active ? ' active' : ''}`}>
                    <AreaImage area={a} seed={i} />
                    <div className="stack-sm">
                      <div className="spread" style={{ flexWrap: 'wrap' }}>
                        <h3>{a.name}</h3>
                        {active ? <span className="badge">Aktive Fläche</span> : (
                          <button className="btn btn-soft btn-sm" onClick={() => void store.run(() => store.setActiveArea(a.id), `„${a.name}“ ist jetzt ausgewählt.`)}>Auswählen</button>
                        )}
                      </div>
                      <p className="muted">{areaSummary(a)}</p>
                      <p className="muted small">Nutzung: {a.usage === 'unbekannt' ? 'nicht angegeben' : USAGE_LABEL[a.usage]}</p>
                      <p className="muted small">{soil ?? 'Boden noch unbekannt'}</p>
                      <div className="row-wrap">
                        <a className="text-link" href={`#/profil/flaeche/${a.id}`}>Rasenprofil bearbeiten <Icon name="chevronRight" size={16} /></a>
                        <a className="text-link" href={`#/profil/flaeche/${a.id}/boden`}>Mein Boden <Icon name="chevronRight" size={16} /></a>
                      </div>
                    </div>
                  </article>
                );
              })}
              <a className="btn btn-outline btn-block" href="#/profil/flaeche-neu"><Icon name="plus" /> Rasenfläche hinzufügen</a>
            </div>
          </section>
        </div>

        <div className="stack col-side">
          <section aria-labelledby="equip">
            <SectionTitle><span id="equip">Meine Ausstattung</span></SectionTitle>
            <div className="card list-card">
              <Row href="#/profil/produkte" icon="package" title="Produkte & Dünger" sub={`${data.products.length} hinterlegt · Vorhandene Produkte verwalten`} />
              <Row href="#/profil/geraete" icon="mower" title="Geräte" sub={`${data.devices.length} hinterlegt · Mäher und Werkzeuge`} />
            </div>
          </section>
          <section aria-labelledby="settings">
            <SectionTitle><span id="settings">Einstellungen</span></SectionTitle>
            <div className="card list-card">
              <Row icon="bell" title="Erinnerungen" sub="Fällige Aufgaben in der App anzeigen"
                right={<Switch checked={user.remindersEnabled} label="Erinnerungen in der App" onChange={(v) => void store.run(() => store.saveUser({ remindersEnabled: v }), v ? 'Erinnerungen eingeschaltet.' : 'Erinnerungen ausgeschaltet.')} />} />
              <Row href="#/profil/standort" icon="mapPin" title="Standort & Wetter" sub={user.region ? user.region.label : 'Region optional angeben'} />
              <Row href="#/profil/daten" icon="shield" title="Datenschutz & Datenexport" sub="Deine Daten, deine Kontrolle" />
              <Row href="#/profil/hilfe" icon="help" title="Hilfe & Hinweise" sub="So funktioniert Rasenzeit, App-Version und Updates" />
            </div>
          </section>
          <p className="tiny muted">Rasenzeit hat keine Benutzerkonten. Deine Daten liegen nur auf diesem Gerät bzw. in diesem Browser.</p>
        </div>
      </div>

      <Dialog open={editName} onClose={() => setEditName(false)} title="Profil bearbeiten"
        footer={<><button className="btn btn-outline" onClick={() => setEditName(false)}>Abbrechen</button><button className="btn btn-primary" onClick={() => void saveName()}>Speichern</button></>}>
        <form onSubmit={(e) => { e.preventDefault(); void saveName(); }}>
          <Field label="Name" error={err}>{(id, db) => <input id={id} className="input" value={name} onChange={(e) => setName(e.target.value)} aria-describedby={db} maxLength={60} />}</Field>
        </form>
      </Dialog>
    </>
  );
}

export { IconBubble };
