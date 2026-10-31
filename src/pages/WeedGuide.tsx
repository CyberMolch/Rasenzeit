import { useState } from 'react';
import { SubHead, Notice, ReviewTag } from '../ui/components';
import { GuideRunner } from '../ui/GuideRunner';
import { WEED_QUESTIONS, evaluateWeed } from '../content/guides';
import { Icon } from '../ui/icons';
import { ObservationForm } from './Observations';
import type { ContentMeta } from '../domain/types';

const GUIDE_META: ContentMeta = { reviewStatus: 'entwurf', lastReviewed: null, sources: ['Merkmalsvergleich der hinterlegten Pflanzen – fachliche Prüfung ausstehend'] };

export function WeedGuide() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [obsFor, setObsFor] = useState<string | null | undefined>(undefined);
  const result = evaluateWeed(answers);
  const qTitle = (id: string) => WEED_QUESTIONS.find((q) => q.id === id)?.title ?? id;

  return (
    <>
      <SubHead title="Unkraut eingrenzen" subtitle="Merkmale vergleichen, Möglichkeiten eingrenzen." backTo="/hilfe" backLabel="Rasenhilfe" />
      <div className="row-wrap" style={{ marginBottom: 16 }}><ReviewTag meta={GUIDE_META} /></div>
      <div style={{ maxWidth: 760 }}>
        <GuideRunner
          questions={WEED_QUESTIONS}
          answers={answers}
          setAnswers={setAnswers}
          intro={<>
            <h2 style={{ fontSize: '1.3rem' }}>So funktioniert’s</h2>
            <p>Du beantwortest einige Fragen zu Wuchs, Blättern und Blüten. Rasenzeit vergleicht deine Antworten mit den hinterlegten Pflanzen und zeigt, welche dazu passen könnten – und welche nicht.</p>
            <p className="muted small">Derzeit sind vier Pflanzen hinterlegt. Eine sichere Bestimmung ist so nicht möglich; bei Unsicherheit hilft eine Fachberatung oder ein Bestimmungsbuch.</p>
          </>}
          renderResult={() => (
            <section className="card card-pad-lg stack" aria-live="polite">
              <h2 className="section-title" style={{ marginBottom: 0 }}>Mögliche Zuordnungen</h2>
              {result.verdict === 'zu_wenig' && <Notice kind="warn" title="Zu wenige Angaben">Mit weniger als zwei bekannten Merkmalen lässt sich nichts eingrenzen. Versuche, weitere Merkmale zu beobachten – etwa zur Blütezeit.</Notice>}
              {result.verdict === 'keine' && <Notice title="Keine der hinterlegten Pflanzen passt">Deine Angaben widersprechen allen vier hinterlegten Pflanzen. Es handelt sich wahrscheinlich um eine andere Art. Du kannst den Fund trotzdem als unbestimmte Pflanze dokumentieren.</Notice>}
              {result.verdict === 'mehrere' && <p className="muted">Mehrere Pflanzen sind mit deinen Angaben vereinbar. Vergleiche die Merkmale auf den Detailseiten.</p>}
              {result.verdict === 'eine_moeglichkeit' && <p className="muted">Von den hinterlegten Pflanzen passt nur eine zu deinen Angaben. Das ist eine mögliche Zuordnung, keine sichere Bestimmung – andere, nicht hinterlegte Arten sind nicht ausgeschlossen.</p>}

              {result.verdict !== 'zu_wenig' && result.candidates.map((c) => (
                <article key={c.plant.id} className="card stack-sm" style={{ boxShadow: 'none', border: '1.5px solid var(--c-border)' }}>
                  <div className="spread" style={{ flexWrap: 'wrap' }}>
                    <h3>{c.plant.name} <span className="muted small" style={{ fontWeight: 400 }}><em>{c.plant.botanical}</em></span></h3>
                    <span className="badge">Kein Widerspruch</span>
                  </div>
                  <p className="small">Übereinstimmende Merkmale: {c.matches.length ? c.matches.map(qTitle).map((t) => t.replace(/\?$/, '')).join('; ') : 'keine direkt bestätigten'}</p>
                  <p className="small muted">Ähnliche Arten: {c.plant.lookalikes.map((l) => l.name).join(', ')}</p>
                  <div className="row-wrap">
                    <a className="btn btn-outline btn-sm" href={`#/hilfe/pflanze/${c.plant.id}`}>Merkmale vergleichen</a>
                    <button className="btn btn-ghost btn-sm" onClick={() => setObsFor(c.plant.id)}><Icon name="plus" size={16} /> Als Vermutung dokumentieren</button>
                  </div>
                </article>
              ))}

              {result.verdict !== 'zu_wenig' && result.excluded.length > 0 && (
                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 600, minHeight: 40 }}>Passen nicht ({result.excluded.length})</summary>
                  <ul className="reason-list" style={{ marginTop: 8 }}>
                    {result.excluded.map((c) => <li key={c.plant.id}><Icon name="x" size={18} /><span><strong>{c.plant.name}</strong> – widerspricht bei: {c.conflicts.map(qTitle).join('; ')}</span></li>)}
                  </ul>
                </details>
              )}
              <button className="btn btn-ghost" onClick={() => setObsFor(null)}><Icon name="camera" size={18} /> Als unbestimmte Pflanze dokumentieren</button>
            </section>
          )}
        />
      </div>
      {obsFor !== undefined && <ObservationForm open onClose={() => setObsFor(undefined)} plantId={obsFor} identification={obsFor ? 'vermutet' : 'unbestimmt'} />}
    </>
  );
}
