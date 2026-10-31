import { useState } from 'react';
import { useStore } from '../lib/store';
import { navigate, back } from '../lib/router';
import { Icon, Logo } from '../ui/icons';
import { CheckGroup, Field, GardenArt, Notice, RadioGroup, parseNum } from '../ui/components';
import type { Compaction, ConditionFlag, LawnArea, Light, SoilSource, SoilType, Usage, WaterBehaviour } from '../domain/types';
import { emptySoilProfile } from '../domain/types';
import {
  COMPACTION_LABEL, CONDITION_LABEL, LIGHT_LABEL, SOIL_TYPE_HINT, SOIL_TYPE_LABEL, USAGE_LABEL, WATER_LABEL, options,
} from '../domain/labels';
import { uid } from '../lib/ids';
import { nowStamp, today, isValidISO } from '../lib/dates';
import { createDemo } from '../content/demo';
import { Toasts } from '../App';

interface Draft {
  userName: string;
  name: string;
  size: string;
  sizeUnknown: boolean;
  light: Light;
  usage: Usage;
  soilType: SoilType;
  soilSource: SoilSource;
  soilNote: string;
  water: WaterBehaviour;
  compaction: Compaction;
  condition: ConditionFlag[];
  mowing: string;
  fertilizing: string;
  scarifying: string;
  overseeding: string;
}

const STEPS = ['Fläche', 'Licht & Nutzung', 'Boden', 'Zustand'];

export function Setup({ mode }: { mode: 'first' | 'area' }) {
  const store = useStore();
  const hasUser = !!store.data.user;
  const [step, setStep] = useState(mode === 'first' && !hasUser ? -1 : 0);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [d, setD] = useState<Draft>({
    userName: '', name: store.data.areas.length ? '' : 'Mein Garten', size: '', sizeUnknown: false,
    light: 'unbekannt', usage: 'unbekannt', soilType: 'unbekannt', soilSource: 'eigene', soilNote: '',
    water: 'unbekannt', compaction: 'unbekannt', condition: [], mowing: '', fertilizing: '', scarifying: '', overseeding: '',
  });
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const validateStep = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (mode === 'first' && !hasUser && !d.userName.trim()) e.userName = 'Bitte gib einen Namen ein, mit dem wir dich begrüßen.';
      if (!d.name.trim()) e.name = 'Bitte gib der Fläche einen Namen.';
      if (!d.sizeUnknown) {
        const n = parseNum(d.size);
        if (n === null) e.size = 'Bitte gib die Größe an oder wähle „Größe noch unbekannt“.';
        else if (Number.isNaN(n) || n <= 0) e.size = 'Die Größe muss eine Zahl größer als 0 sein.';
        else if (n > 1_000_000) e.size = 'Bitte prüfe die Größe – mehr als 1.000.000 m² ist unwahrscheinlich.';
      }
    }
    if (step === 3) {
      for (const k of ['mowing', 'fertilizing', 'scarifying', 'overseeding'] as const) {
        if (d[k] && (!isValidISO(d[k]) || d[k] > today())) e[k] = 'Bitte ein gültiges Datum, das nicht in der Zukunft liegt.';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const finish = async () => {
    if (!validateStep()) return;
    setBusy(true);
    const stamp = nowStamp();
    const soil = emptySoilProfile();
    soil.type = { value: d.soilType, source: d.soilType === 'unbekannt' ? null : d.soilSource, note: d.soilType === 'misch' ? d.soilNote : '', updatedAt: d.soilType === 'unbekannt' ? null : stamp };
    soil.water = { ...soil.water, value: d.water, updatedAt: d.water === 'unbekannt' ? null : stamp };
    soil.compaction = { ...soil.compaction, value: d.compaction, updatedAt: d.compaction === 'unbekannt' ? null : stamp };
    const area: LawnArea = {
      id: uid('area'), name: d.name.trim(), sizeM2: d.sizeUnknown ? null : (parseNum(d.size) as number),
      light: d.light, usage: d.usage, condition: d.condition, conditionNote: '',
      conditionAssessedAt: d.condition.length ? today() : null,
      lastCare: {
        mowing: d.mowing || undefined, fertilizing: d.fertilizing || undefined,
        scarifying: d.scarifying || undefined, overseeding: d.overseeding || undefined,
      },
      soil, photoId: null, createdAt: stamp, updatedAt: stamp,
    };
    const ok = await store.run(async () => {
      if (!store.data.user) await store.createUser(d.userName.trim(), false);
      await store.saveArea(area);
      await store.setActiveArea(area.id);
    }, mode === 'first' ? 'Willkommen! Dein Pflegeplan wurde aus deinen Angaben erstellt.' : `„${area.name}“ angelegt und ausgewählt.`);
    setBusy(false);
    if (ok !== undefined) navigate('/', { replace: true });
  };

  const startDemo = async () => {
    setBusy(true);
    await store.run(async () => { await store.resetAll(); await createDemo(store); }, 'Demomodus gestartet. Alle Inhalte sind Beispieldaten.');
    setBusy(false);
    navigate('/', { replace: true });
  };

  // ---------- Willkommen ----------
  if (step === -1) {
    return (
      <div className="setup">
        <div className="setup-card">
          <div className="brand" style={{ marginBottom: 24 }}><Logo size={32} /> Rasenzeit</div>
          <div className="welcome-art"><GardenArt className="hero-art" /></div>
          <h1 style={{ fontSize: 'clamp(2rem, 7vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.02em' }}>Dein Rasen. Dein Plan.</h1>
          <p className="muted" style={{ fontSize: '1.08rem', margin: '10px 0 24px' }}>
            Rasenzeit zeigt dir, was dein Rasen als Nächstes braucht – und warum. Ohne Konto, ohne KI, nachvollziehbar aus deinen Angaben.
          </p>
          <div className="stack-sm">
            <button className="btn btn-primary btn-block" onClick={() => setStep(0)} disabled={busy}>
              <Icon name="sprout" /> Mit eigenem Garten starten
            </button>
            <button className="btn btn-outline btn-block" onClick={() => void startDemo()} disabled={busy}>
              <Icon name="play" size={18} /> Demomodus mit Beispieldaten ansehen
            </button>
          </div>
          <p className="tiny muted" style={{ marginTop: 20 }}>
            Deine Daten bleiben in diesem Browser bzw. auf diesem Gerät gespeichert und werden nicht automatisch zwischen Geräten synchronisiert.
          </p>
        </div>
        <Toasts />
      </div>
    );
  }

  const isLast = step === STEPS.length - 1;
  const content = (
    <div className="card card-pad-lg setup-card">
      {mode === 'area' ? (
        <button type="button" className="back-link" onClick={() => back('/profil')}><Icon name="arrowLeft" /> Zum Profil</button>
      ) : (
        <div className="brand"><Logo /> Rasenzeit</div>
      )}
      <p className="eyebrow" style={{ marginTop: 16 }}>Schritt {step + 1} von {STEPS.length}</p>
      <h1 id="page-title" tabIndex={-1} style={{ fontSize: '1.7rem', fontWeight: 800 }}>
        {mode === 'area' ? 'Neue Rasenfläche: ' : ''}{STEPS[step]}
      </h1>
      <div className="progress" aria-hidden="true">{STEPS.map((_, i) => <span key={i} className={i <= step ? 'on' : ''} />)}</div>

      <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); if (isLast) void finish(); else if (validateStep()) setStep(step + 1); }}>
        {step === 0 && (
          <>
            {mode === 'first' && !hasUser && (
              <Field label="Wie dürfen wir dich nennen?" error={errors.userName}>
                {(id, db) => <input id={id} className="input" value={d.userName} onChange={(e) => set('userName', e.target.value)} autoComplete="given-name" aria-describedby={db} aria-invalid={!!errors.userName} maxLength={60} />}
              </Field>
            )}
            <Field label="Name der Rasenfläche" hint="Zum Beispiel „Garten hinten“ oder „Vorgarten“." error={errors.name}>
              {(id, db) => <input id={id} className="input" value={d.name} onChange={(e) => set('name', e.target.value)} aria-describedby={db} aria-invalid={!!errors.name} maxLength={60} />}
            </Field>
            <Field label="Größe" hint="Ungefähre Rasenfläche in Quadratmetern." error={errors.size}>
              {(id, db) => (
                <div className="input-unit">
                  <input id={id} className="input" inputMode="decimal" value={d.size} disabled={d.sizeUnknown} onChange={(e) => set('size', e.target.value)} aria-describedby={db} aria-invalid={!!errors.size} />
                  <span className="unit">m²</span>
                </div>
              )}
            </Field>
            <label className="checkbox-row"><input type="checkbox" checked={d.sizeUnknown} onChange={(e) => set('sizeUnknown', e.target.checked)} /> Größe noch unbekannt – später ergänzen</label>
          </>
        )}

        {step === 1 && (
          <>
            <RadioGroup legend="Wie viel Sonne bekommt die Fläche?" name="light" value={d.light} onChange={(v) => set('light', v)} columns
              options={options(LIGHT_LABEL).map((o) => o.value === 'unbekannt' ? { ...o, label: 'Weiß ich nicht' } : o)} />
            <RadioGroup legend="Wie wird die Fläche genutzt?" name="usage" value={d.usage} onChange={(v) => set('usage', v)} columns
              options={options(USAGE_LABEL).map((o) => o.value === 'unbekannt' ? { ...o, label: 'Möchte ich nicht angeben' } : o)} />
          </>
        )}

        {step === 2 && (
          <>
            <Notice>Diese vereinfachten Kategorien sind nur eine grobe Einordnung. Du kannst alles überspringen und später unter „Mein Boden“ ergänzen – dort gibt es auch eine Bestimmungshilfe.</Notice>
            <RadioGroup legend="Bodenart" name="soil" value={d.soilType} onChange={(v) => set('soilType', v)} columns
              options={options(SOIL_TYPE_LABEL).map((o) => ({ ...o, hint: SOIL_TYPE_HINT[o.value] }))} />
            {d.soilType === 'misch' && (
              <Field label="Notiz zum Mischboden (optional)">
                {(id) => <input id={id} className="input" value={d.soilNote} onChange={(e) => set('soilNote', e.target.value)} placeholder="z. B. vorne sandig, hinten lehmig" />}
              </Field>
            )}
            {d.soilType !== 'unbekannt' && (
              <RadioGroup legend="Woher stammt diese Angabe?" name="src" value={d.soilSource} onChange={(v) => set('soilSource', v)}
                options={[
                  { value: 'eigene', label: 'Eigene Einschätzung', hint: 'Wird als geschätzt gespeichert.' },
                  { value: 'analyse', label: 'Bodenanalyse oder fachlich bestätigt', hint: 'Nur wählen, wenn ein Ergebnis vorliegt.' },
                ]} />
            )}
            <RadioGroup legend="Was beobachtest du beim Wasser?" name="water" value={d.water} onChange={(v) => set('water', v)} options={options(WATER_LABEL)} hint="Beobachtungen sind Hinweise, keine bestätigten Ursachen." />
            <RadioGroup legend="Verdichtung" name="comp" value={d.compaction} onChange={(v) => set('compaction', v)} columns options={options(COMPACTION_LABEL)} />
          </>
        )}

        {step === 3 && (
          <>
            <CheckGroup legend="Wie sieht der Rasen aktuell aus?" hint="Mehrfachauswahl möglich. Ohne Auswahl bleibt der Zustand offen." values={d.condition} onChange={(v) => set('condition', v)} options={options(CONDITION_LABEL)} />
            <fieldset>
              <legend>Bekannte letzte Pflegearbeiten (optional)</legend>
              <div className="grid-2">
                {([['mowing', 'Zuletzt gemäht'], ['fertilizing', 'Zuletzt gedüngt'], ['scarifying', 'Zuletzt vertikutiert'], ['overseeding', 'Zuletzt nachgesät']] as const).map(([k, label]) => (
                  <Field key={k} label={label} error={errors[k]}>
                    {(id, db) => <input id={id} type="date" className="input" value={d[k]} max={today()} onChange={(e) => set(k, e.target.value)} aria-describedby={db} aria-invalid={!!errors[k]} />}
                  </Field>
                ))}
              </div>
            </fieldset>
          </>
        )}

        <div className="btn-row" style={{ marginTop: 8 }}>
          {step > 0 && <button type="button" className="btn btn-outline" onClick={() => { setErrors({}); setStep(step - 1); }}><Icon name="arrowLeft" size={18} /> Zurück</button>}
          {step === -1 + 1 && mode === 'first' && !hasUser && <button type="button" className="btn btn-ghost" onClick={() => setStep(-1)}>Abbrechen</button>}
          {step >= 1 && !isLast && <button type="button" className="btn btn-ghost" onClick={() => setStep(step + 1)}>Überspringen</button>}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {isLast ? (busy ? 'Wird gespeichert …' : 'Fertig') : 'Weiter'} {!isLast && <Icon name="arrowRight" size={18} />}
          </button>
        </div>
      </form>
    </div>
  );

  if (mode === 'area') return content;
  return <div className="setup">{content}<Toasts /></div>;
}
