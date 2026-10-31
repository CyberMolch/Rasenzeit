import { useState } from 'react';
import { useStore } from '../lib/store';
import { Icon } from '../ui/icons';
import { CheckGroup, ConfirmDialog, Empty, Field, GardenArt, RadioGroup, SubHead, UploadButton, parseNum, useAttachmentUrl } from '../ui/components';
import type { ConditionFlag, LawnArea, Light, Usage } from '../domain/types';
import { CONDITION_LABEL, LIGHT_LABEL, USAGE_LABEL, options } from '../domain/labels';
import { isValidISO, today } from '../lib/dates';
import { navigate } from '../lib/router';
import { soilSummary } from '../ui/helpers';

export function AreaProfile({ id }: { id: string }) {
  const store = useStore();
  const area = store.data.areas.find((a) => a.id === id);
  if (!area) return <><SubHead title="Rasenprofil" backTo="/profil" backLabel="Profil" /><Empty icon="grass" title="Fläche nicht gefunden" /></>;
  return <AreaForm key={area.id + area.updatedAt} area={area} />;
}

function AreaForm({ area }: { area: LawnArea }) {
  const store = useStore();
  const [f, setF] = useState({
    name: area.name,
    size: area.sizeM2 != null ? String(area.sizeM2).replace('.', ',') : '',
    light: area.light, usage: area.usage, condition: area.condition, conditionNote: area.conditionNote,
    mowing: area.lastCare.mowing ?? '', fertilizing: area.lastCare.fertilizing ?? '', scarifying: area.lastCare.scarifying ?? '', overseeding: area.lastCare.overseeding ?? '',
    photoId: area.photoId,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const { url } = useAttachmentUrl(f.photoId);
  const isActive = store.activeArea?.id === area.id;

  const counts = {
    tasks: store.data.tasks.filter((t) => t.areaId === area.id).length,
    journal: store.data.journal.filter((j) => j.areaId === area.id).length,
    observations: store.data.observations.filter((o) => o.areaId === area.id).length,
    measurements: store.data.measurements.filter((m) => m.areaId === area.id).length,
  };

  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'Bitte gib der Fläche einen Namen.';
    const n = parseNum(f.size);
    if (f.size && (n === null || Number.isNaN(n) || n <= 0)) e.size = 'Die Größe muss eine Zahl größer als 0 sein – oder leer für „unbekannt“.';
    for (const k of ['mowing', 'fertilizing', 'scarifying', 'overseeding'] as const) {
      if (f[k] && (!isValidISO(f[k]) || f[k] > today())) e[k] = 'Gültiges Datum, nicht in der Zukunft.';
    }
    setErrors(e);
    if (Object.keys(e).length) { document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); return; }
    const condChanged = JSON.stringify([...f.condition].sort()) !== JSON.stringify([...area.condition].sort());
    const next: LawnArea = {
      ...area, name: f.name.trim(), sizeM2: f.size ? (n as number) : null, light: f.light, usage: f.usage,
      condition: f.condition, conditionNote: f.conditionNote.trim(),
      conditionAssessedAt: condChanged ? today() : area.conditionAssessedAt,
      lastCare: { ...area.lastCare, mowing: f.mowing || undefined, fertilizing: f.fertilizing || undefined, scarifying: f.scarifying || undefined, overseeding: f.overseeding || undefined },
      photoId: f.photoId,
    };
    await store.run(() => store.saveArea(next), 'Rasenprofil gespeichert. Offene Vorschläge berücksichtigen die neuen Angaben.');
  };

  return (
    <>
      <SubHead title="Rasenprofil" subtitle={area.name} backTo="/profil" backLabel="Profil">
        {!isActive && <button className="btn btn-soft" onClick={() => void store.run(() => store.setActiveArea(area.id), `„${area.name}“ ausgewählt.`)}>Als aktive Fläche wählen</button>}
      </SubHead>
      <div className="cols">
        <form className="form card card-pad-lg" noValidate onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <Field label="Name der Rasenfläche" error={errors.name}>{(id, db) => <input id={id} className="input" value={f.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!errors.name} aria-describedby={db} maxLength={60} />}</Field>
          <Field label="Größe" hint="Leer lassen, wenn unbekannt." error={errors.size}>
            {(id, db) => <div className="input-unit"><input id={id} className="input" inputMode="decimal" value={f.size} onChange={(e) => set('size', e.target.value)} aria-invalid={!!errors.size} aria-describedby={db} /><span className="unit">m²</span></div>}
          </Field>
          <RadioGroup legend="Lichtverhältnisse" name="light" value={f.light} onChange={(v: Light) => set('light', v)} columns options={options(LIGHT_LABEL).map((o) => o.value === 'unbekannt' ? { ...o, label: 'Weiß ich nicht' } : o)} />
          <RadioGroup legend="Nutzung" name="usage" value={f.usage} onChange={(v: Usage) => set('usage', v)} columns options={options(USAGE_LABEL)} />
          <CheckGroup legend="Aktueller Zustand" hint={area.conditionAssessedAt ? `Zuletzt eingeschätzt am ${area.conditionAssessedAt.split('-').reverse().join('.')}.` : 'Noch nicht eingeschätzt.'}
            values={f.condition} onChange={(v: ConditionFlag[]) => set('condition', v)} options={options(CONDITION_LABEL)} />
          <Field label="Notiz zum Zustand (optional)">{(id) => <textarea id={id} className="textarea" value={f.conditionNote} onChange={(e) => set('conditionNote', e.target.value)} />}</Field>
          <fieldset>
            <legend>Letzte Pflegearbeiten</legend>
            <p className="small muted" style={{ marginBottom: 8 }}>Werden beim Erledigen von Aufgaben automatisch fortgeschrieben.</p>
            <div className="grid-2">
              {([['mowing', 'Zuletzt gemäht'], ['fertilizing', 'Zuletzt gedüngt'], ['scarifying', 'Zuletzt vertikutiert'], ['overseeding', 'Zuletzt nachgesät']] as const).map(([k, label]) => (
                <Field key={k} label={label} error={errors[k]}>{(id, db) => <input id={id} type="date" className="input" value={f[k]} max={today()} onChange={(e) => set(k, e.target.value)} aria-describedby={db} aria-invalid={!!errors[k]} />}</Field>
              ))}
            </div>
          </fieldset>
          <button type="submit" className="btn btn-primary">Speichern</button>
        </form>

        <div className="stack col-side">
          <section className="card stack-sm">
            <h3>Gartenbild</h3>
            <div className="area-img">{url ? <img src={url} alt={`Foto von ${area.name}`} /> : <GardenArt seed={0} className="" />}</div>
            <p className="tiny muted">{f.photoId ? 'Eigenes Foto. Speichern nicht vergessen.' : 'Neutrale Illustration – lade ein eigenes Foto hoch.'}</p>
            <div className="row-wrap">
              <UploadButton kind="foto" multiple={false} label={f.photoId ? 'Foto ersetzen' : 'Foto hochladen'} onAdded={(m) => set('photoId', m[0].id)} />
              {f.photoId && <button type="button" className="btn btn-ghost btn-sm" onClick={() => set('photoId', null)}>Entfernen</button>}
            </div>
          </section>
          <a className="card list-card" href={`#/profil/flaeche/${area.id}/boden`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="list-row"><span className="icon-bubble"><Icon name="layers" /></span><span className="grow"><span className="title" style={{ display: 'block' }}>Mein Boden</span><span className="sub">{soilSummary(area) ?? 'Boden noch unbekannt – Bodenprofil ergänzen'}</span></span><Icon name="chevronRight" className="chev" /></span>
          </a>
          <button className="btn btn-danger-outline btn" onClick={() => setConfirm(true)}><Icon name="trash" size={18} /> Rasenfläche löschen</button>
        </div>
      </div>

      <ConfirmDialog open={confirm} title={`„${area.name}“ löschen?`} confirmLabel="Endgültig löschen" danger onClose={() => setConfirm(false)}
        onConfirm={async () => {
          const ok = await store.run(() => store.deleteArea(area.id), `„${area.name}“ wurde gelöscht.`);
          if (ok !== undefined) navigate(store.data.areas.length > 1 ? '/profil' : '/', { replace: true });
        }}>
        <p>Folgende Daten dieser Fläche werden ebenfalls gelöscht:</p>
        <ul>
          <li>{counts.tasks} Aufgabe(n) im Pflegeplan</li>
          <li>{counts.journal} Tagebucheintrag/-einträge mit ihren Fotos</li>
          <li>{counts.observations} Pflanzenbeobachtung(en)</li>
          <li>{counts.measurements} Bodenmessung(en) mit Berichten</li>
          <li>Das Bodenprofil und das Gartenbild</li>
        </ul>
        <p className="small muted">Produkte und Geräte bleiben erhalten. Dieser Schritt lässt sich nicht rückgängig machen – exportiere vorher bei Bedarf deine Daten.</p>
        {store.data.areas.length === 1 && <p className="small"><strong>Dies ist deine einzige Fläche.</strong> Danach startest du mit der Einrichtung einer neuen Fläche.</p>}
      </ConfirmDialog>
    </>
  );
}
