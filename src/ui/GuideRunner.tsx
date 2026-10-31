import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { GuideQuestion } from '../content/guides';
import { UNKNOWN } from '../content/guides';
import { RadioGroup } from './components';
import { Figure } from './figures';
import { Icon } from './icons';

/**
 * Schrittweise Fragen mit „Weiß ich nicht“, Rückwärtsnavigation und Korrektur.
 * Das Ergebnis wird erst nach der Zusammenfassung angezeigt.
 */
export function GuideRunner({ questions, answers, setAnswers, renderResult, intro }: {
  questions: GuideQuestion[];
  answers: Record<string, string>;
  setAnswers: (a: Record<string, string>) => void;
  renderResult: () => ReactNode;
  intro?: ReactNode;
}) {
  const active = questions.filter((q) => !q.when || q.when(answers));
  const [idx, setIdx] = useState(intro ? -1 : 0);
  const [showError, setShowError] = useState(false);
  const headRef = useRef<HTMLHeadingElement>(null);
  const done = idx >= active.length;
  const q = active[idx];

  useEffect(() => { headRef.current?.focus(); }, [idx]);

  const choose = (v: string) => {
    const next = { ...answers, [q.id]: v };
    // Antworten auf Fragen, die nicht mehr gestellt werden, verwerfen
    for (const other of questions) if (other.when && !other.when(next)) delete next[other.id];
    setAnswers(next);
    setShowError(false);
  };

  if (idx === -1) {
    return (
      <div className="card card-pad-lg stack">
        {intro}
        <div><button className="btn btn-primary" onClick={() => setIdx(0)}>Los geht’s <Icon name="arrowRight" size={18} /></button></div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="stack">
        <section className="card card-pad-lg stack" aria-labelledby="sum">
          <h2 id="sum" ref={headRef} tabIndex={-1} className="section-title" style={{ marginBottom: 0 }}>Deine Angaben</h2>
          <div className="card list-card" style={{ boxShadow: 'none' }}>
            {active.map((qq, i) => {
              const a = answers[qq.id];
              const label = a === UNKNOWN || !a ? 'Weiß ich nicht' : qq.options.find((o) => o.value === a)?.label;
              return (
                <div key={qq.id} className="list-row" style={{ cursor: 'default' }}>
                  <span className="grow"><span className="sub" style={{ display: 'block' }}>{qq.title}</span><span className="title">{label}</span></span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setIdx(i)} aria-label={`Antwort ändern: ${qq.title}`}>Ändern</button>
                </div>
              );
            })}
          </div>
        </section>
        {renderResult()}
        <div className="btn-row">
          <button className="btn btn-outline" onClick={() => setIdx(active.length - 1)}><Icon name="arrowLeft" size={18} /> Zurück</button>
          <button className="btn btn-ghost" onClick={() => { setAnswers({}); setIdx(0); }}><Icon name="refresh" size={18} /> Neu beginnen</button>
        </div>
      </div>
    );
  }

  return (
    <section className="card card-pad-lg stack" aria-labelledby={`q-${q.id}`}>
      <p className="eyebrow">Frage {idx + 1} von {active.length}</p>
      <div className="progress" aria-hidden="true" style={{ margin: 0 }}>{active.map((_, i) => <span key={i} className={i <= idx ? 'on' : ''} />)}</div>
      <h2 id={`q-${q.id}`} ref={headRef} tabIndex={-1} style={{ fontSize: '1.3rem' }}>{q.title}</h2>
      <p className="muted">{q.help}</p>
      <RadioGroup
        legend={<span className="sr-only">{q.title}</span>}
        name={q.id}
        value={answers[q.id] ?? null}
        onChange={choose}
        options={[...q.options.map((o) => ({ value: o.value, label: o.label, hint: o.hint, figure: o.figure ? <Figure id={o.figure} /> : undefined })), { value: UNKNOWN, label: 'Weiß ich nicht' }]}
      />
      {showError && <p className="error" role="alert" style={{ color: 'var(--c-danger)' }}>Bitte wähle eine Antwort – „Weiß ich nicht“ ist ebenfalls möglich.</p>}
      <div className="btn-row">
        {idx > 0 && <button className="btn btn-outline" onClick={() => setIdx(idx - 1)}><Icon name="arrowLeft" size={18} /> Zurück</button>}
        <button className="btn btn-primary" onClick={() => { if (!answers[q.id]) { setShowError(true); return; } setIdx(idx + 1); }}>
          {idx === active.length - 1 ? 'Auswertung' : 'Weiter'} <Icon name="arrowRight" size={18} />
        </button>
      </div>
    </section>
  );
}
