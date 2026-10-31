import { useState } from 'react';
import { useStore } from '../lib/store';
import { Empty, Notice, ReviewTag, SubHead } from '../ui/components';
import { GuideRunner } from '../ui/GuideRunner';
import { SOIL_GUIDE_INTRO, SOIL_QUESTIONS, evaluateSoil } from '../content/guides';
import { SOIL_TYPE_LABEL } from '../domain/labels';
import { nowStamp } from '../lib/dates';
import { navigate } from '../lib/router';
import type { ContentMeta } from '../domain/types';

const META: ContentMeta = {
  reviewStatus: 'entwurf', lastReviewed: null,
  sources: ['Vereinfachte Fingerprobe, angelehnt an die Bodenkundliche Kartieranleitung (KA5) – fachliche Prüfung der Fassung ausstehend'],
};

export function SoilGuidePage({ id }: { id: string }) {
  const store = useStore();
  const area = store.data.areas.find((a) => a.id === id);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  if (!area) return <><SubHead title="Bodenart grob einschätzen" backTo="/profil" /><Empty icon="layers" title="Fläche nicht gefunden" /></>;
  const r = evaluateSoil(answers);

  const apply = async (mode: 'eindeutig' | 'misch') => {
    const note = mode === 'misch' ? `Bestimmungshilfe nicht eindeutig; Hinweise auf: ${r.supported.map((s) => SOIL_TYPE_LABEL[s].toLowerCase()).join(', ')}` : '';
    const ok = await store.run(() => store.saveArea({
      ...area,
      soil: { ...area.soil, type: { value: mode === 'eindeutig' ? r.suggestion! : 'misch', source: 'bestimmungshilfe', note, guideAnswers: answers, updatedAt: nowStamp() } },
    }), 'Als grobe Einschätzung gespeichert.');
    if (ok !== undefined) navigate(`/profil/flaeche/${area.id}/boden`, { replace: true });
  };

  return (
    <>
      <SubHead title="Bodenart grob einschätzen" subtitle={`Fingerprobe für „${area.name}“`} backTo={`/profil/flaeche/${area.id}/boden`} backLabel="Mein Boden" />
      <div className="row-wrap" style={{ marginBottom: 16 }}><ReviewTag meta={META} /></div>
      <div style={{ maxWidth: 760 }}>
        <GuideRunner
          questions={SOIL_QUESTIONS}
          answers={answers}
          setAnswers={setAnswers}
          intro={<>
            <h2 style={{ fontSize: '1.3rem' }}>Vorbereitung</h2>
            <ol className="stack-sm" style={{ paddingLeft: 20, margin: 0 }}>{SOIL_GUIDE_INTRO.map((s) => <li key={s}>{s}</li>)}</ol>
            <Notice>Das Ergebnis ist eine grobe Einschätzung und ersetzt keine Laboranalyse. Für Nährstoffe und pH-Wert ist eine Messung nötig.</Notice>
          </>}
          renderResult={() => (
            <section className="card card-pad-lg stack" aria-live="polite">
              <h2 className="section-title" style={{ marginBottom: 0 }}>Grobe Einschätzung</h2>
              {r.verdict === 'zu_wenig' && (
                <Notice kind="warn" title="Keine Einschätzung möglich">Mindestens drei Fragen müssen beantwortet sein. Wiederhole die Probe mit gut angefeuchtetem Boden oder trage „Weiß ich nicht“ als Bodenart ein.</Notice>
              )}
              {r.verdict === 'eindeutig' && r.suggestion && (
                <>
                  <p style={{ fontSize: '1.25rem' }}>Deine Antworten deuten auf einen <strong>eher {SOIL_TYPE_LABEL[r.suggestion].toLowerCase()}en</strong> Boden hin.</p>
                  <p className="small muted">Alle beantworteten Fragen stützen diese Einordnung. Sie wird als „grobe Einschätzung mit Bestimmungshilfe“ gespeichert – nicht als bestätigte Tatsache.</p>
                  <div className="btn-row"><button className="btn btn-primary" onClick={() => void apply('eindeutig')}>Als grobe Einschätzung übernehmen</button></div>
                </>
              )}
              {r.verdict === 'widerspruechlich' && (
                <>
                  <p>Deine Antworten passen nicht eindeutig zu einer Bodenart. Hinweise gibt es auf: <strong>{r.supported.map((s) => SOIL_TYPE_LABEL[s].toLowerCase()).join(', ')}</strong>.</p>
                  <p className="small muted">Das ist bei Übergangsformen häufig. Rasenzeit legt sich deshalb nicht auf eine Bodenart fest.</p>
                  <div className="btn-row">
                    <button className="btn btn-outline btn-wrap" onClick={() => void apply('misch')}>Als „Mischboden / nicht eindeutig“ speichern</button>
                  </div>
                </>
              )}
              <a className="text-link" href={`#/profil/flaeche/${area.id}/boden`}>Ohne Speichern zurück zu Mein Boden</a>
            </section>
          )}
        />
      </div>
    </>
  );
}
