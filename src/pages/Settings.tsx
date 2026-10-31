import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { Icon } from '../ui/icons';
import { ConfirmDialog, Dialog, Field, Notice, ReviewTag, SubHead } from '../ui/components';
import type { Region } from '../domain/types';
import { DATA_VERSION } from '../domain/types';
import { weatherProvider } from '../lib/services';
import { storageEstimate, requestPersistence } from '../lib/db';
import { fmtBytes, isNativeApp, readFileAsText, saveFile } from '../lib/files';
import { buildExport, journalCsv, parseImport, type ParsedImport } from '../lib/transfer';
import { today } from '../lib/dates';
import { navigate } from '../lib/router';
import { RULES } from '../content/rules';
import { APP_VERSION } from '../lib/update';
import { UpdateCheck } from '../ui/Update';
import { PLANTS } from '../content/plants';
import { PROBLEMS } from '../content/problems';


export function LocationPage() {
  const store = useStore();
  const r = store.data.user!.region;
  const [f, setF] = useState<Region>(r ?? { label: '', postalCode: '', country: 'DE' });
  const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    if (f.postalCode && !/^[0-9A-Za-z -]{3,10}$/.test(f.postalCode)) { setErr('Bitte eine gültige Postleitzahl angeben.'); return; }
    setErr(null);
    const empty = !f.label.trim() && !f.postalCode?.trim();
    await store.run(() => store.saveUser({ region: empty ? null : { label: f.label.trim(), postalCode: f.postalCode?.trim() || undefined, country: f.country } }), empty ? 'Region entfernt.' : 'Region gespeichert.');
  };
  return (
    <>
      <SubHead title="Standort & Wetter" subtitle="Optional – für spätere regionale Hinweise." backTo="/profil" backLabel="Profil" />
      <div className="cols">
        <form className="card card-pad-lg form" noValidate onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <Field label="Region (optional)" hint="Eine grobe Angabe genügt, z. B. „Raum Leipzig“.">{(id, db) => <input id={id} className="input" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} aria-describedby={db} />}</Field>
          <div className="grid-2">
            <Field label="Postleitzahl (optional)" error={err}>{(id, db) => <input id={id} className="input" inputMode="numeric" value={f.postalCode ?? ''} onChange={(e) => setF({ ...f, postalCode: e.target.value })} aria-describedby={db} />}</Field>
            <Field label="Land">{(id) => <select id={id} className="select" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value as Region['country'] })}>
              <option value="DE">Deutschland</option><option value="AT">Österreich</option><option value="CH">Schweiz</option><option value="andere">Anderes Land</option>
            </select>}</Field>
          </div>
          <p className="small muted">Die Region wird nur lokal gespeichert. Aktuell beeinflusst sie die Planung noch nicht.</p>
          <div><button className="btn btn-primary" type="submit">Speichern</button></div>
        </form>
        <div className="stack col-side">
          <section className="card stack-sm">
            <div className="row"><span className="icon-bubble"><Icon name="cloudOff" /></span><h3>{weatherProvider.name}</h3></div>
            <p className="small">Rasenzeit zeigt keine Wetterdaten an und schlägt keine wetteroptimierten Termine vor. Zeitfenster im Pflegeplan beruhen auf der Jahreszeit; den genauen Tag wählst du nach dem tatsächlichen Wetter.</p>
            <p className="tiny muted">Eine Wetterquelle kann später über eine austauschbare Schnittstelle angebunden werden.</p>
          </section>
        </div>
      </div>
    </>
  );
}

export function DataPage() {
  const store = useStore();
  const [est, setEst] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const native = isNativeApp();
  const attBytes = store.data.attachments.reduce((s, a) => s + a.size, 0);

  useEffect(() => { void storageEstimate().then(setEst); void navigator.storage?.persisted?.().then(setPersisted).catch(() => null); }, [store.data.attachments.length]);

  const exp = async (kind: 'json' | 'full' | 'csv') => {
    setBusy(true);
    const d = today();
    await store.run(async () => {
      if (kind === 'csv') { await saveFile(`rasenzeit-tagebuch-${d}.csv`, new Blob([journalCsv(store.data)], { type: 'text/csv;charset=utf-8' })); return; }
      const file = await buildExport(store.data, kind === 'full');
      await saveFile(kind === 'full' ? `rasenzeit-sicherung-mit-anhaengen-${d}.json` : `rasenzeit-daten-${d}.json`, new Blob([JSON.stringify(file)], { type: 'application/json' }));
    }, kind === 'full' ? `Vollständige Sicherung erstellt (inkl. ${store.data.attachments.length} Anhängen).` : kind === 'json' ? 'Daten ohne Anhänge exportiert.' : 'Tagebuch als CSV exportiert.');
    setBusy(false);
  };

  const onFile = async (file: File | undefined) => {
    setImportErr(null); setParsed(null);
    if (!file) return;
    if (file.size > 300 * 1024 * 1024) { setImportErr('Die Datei ist größer als 300 MB und kann nicht importiert werden.'); return; }
    try { setParsed(await parseImport(await readFileAsText(file))); }
    catch (e) { setImportErr(e instanceof Error ? e.message : 'Die Datei konnte nicht gelesen werden.'); }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <>
      <SubHead title="Datenschutz & Datenexport" subtitle="Deine Daten, deine Kontrolle." backTo="/profil" backLabel="Profil" />
      <div className="cols">
        <div className="stack">
          <Notice title="Wo deine Daten liegen">
            {native ? 'Alle Eingaben, Fotos und Dokumente werden ausschließlich auf diesem Gerät in der App gespeichert.' : 'Alle Eingaben, Fotos und Dokumente werden ausschließlich in diesem Browser auf diesem Gerät gespeichert.'} Es gibt kein Konto und keine automatische Synchronisierung zwischen Geräten. Wenn du {native ? 'die App deinstallierst' : 'Browserdaten löschst'}, gehen sie verloren – erstelle regelmäßig eine Sicherung.
          </Notice>

          <section className="card card-pad-lg stack">
            <h2 className="section-title" style={{ marginBottom: 0 }}>Exportieren</h2>
            <div className="stack-sm">
              <button className="btn btn-primary btn-block btn-wrap" disabled={busy} onClick={() => void exp('full')}><Icon name="download" size={18} /> Vollständige Sicherung (mit Fotos und Dokumenten)</button>
              <p className="small muted">JSON-Datei inklusive aller {store.data.attachments.length} Anhänge ({fmtBytes(attBytes)}). Zum Umzug auf ein anderes Gerät.</p>
              <button className="btn btn-outline btn-block btn-wrap" disabled={busy} onClick={() => void exp('json')}><Icon name="database" size={18} /> Strukturierte Daten (JSON, ohne Anhänge)</button>
              <p className="small muted">Klein und gut lesbar. Fotos und Dokumente sind <strong>nicht</strong> enthalten, nur deren Namen.</p>
              <button className="btn btn-outline btn-block btn-wrap" disabled={busy} onClick={() => void exp('csv')}><Icon name="file" size={18} /> Tagebuch als Tabelle (CSV)</button>
            </div>
          </section>

          <section className="card card-pad-lg stack">
            <h2 className="section-title" style={{ marginBottom: 0 }}>Importieren</h2>
            <p className="small muted">Rasenzeit-Sicherungen (JSON) werden vor dem Import geprüft. Du entscheidest, ob ergänzt oder ersetzt wird.</p>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void onFile(e.target.files?.[0])} />
            <div><button className="btn btn-outline" onClick={() => fileRef.current?.click()}><Icon name="upload" size={18} /> Sicherungsdatei auswählen</button></div>
            {importErr && <Notice kind="error" title="Import nicht möglich"><span style={{ whiteSpace: 'pre-line' }}>{importErr}</span></Notice>}
          </section>

          <section className="card card-pad-lg stack">
            <h2 className="section-title" style={{ marginBottom: 0 }}>Daten zurücksetzen</h2>
            <p className="small muted">Löscht alle Flächen, Aufgaben, Einträge, Messungen, Produkte, Geräte, Fotos und Dokumente auf diesem Gerät.</p>
            <div><button className="btn btn-danger-outline btn" onClick={() => setConfirmReset(true)}><Icon name="trash" size={18} /> Alle Daten löschen</button></div>
          </section>
        </div>
        <div className="stack col-side">
          <section className="card stack-sm">
            <h3>Speicher</h3>
            <dl className="kv small">
              <dt>Fotos & Dokumente</dt><dd>{store.data.attachments.length} · {fmtBytes(attBytes)}</dd>
              {est && <><dt>Belegt (gesamt)</dt><dd>{fmtBytes(est.usage)}</dd><dt>Verfügbar</dt><dd>ca. {fmtBytes(est.quota)}</dd></>}
              <dt>Datenformat</dt><dd>Version {DATA_VERSION}</dd>
              <dt>Dauerhaft</dt><dd>{persisted === null ? 'unbekannt' : persisted ? 'ja' : 'nein – Browser darf bei Platzmangel löschen'}</dd>
            </dl>
            {persisted === false && <button className="btn btn-ghost btn-sm" onClick={async () => { const r = await requestPersistence(); setPersisted(!!r); store.toast(r ? 'Speicher ist jetzt dauerhaft.' : 'Der Browser hat die Anfrage abgelehnt.', r ? 'ok' : 'info'); }}>Dauerhaften Speicher anfragen</button>}
          </section>
        </div>
      </div>

      <Dialog open={!!parsed} onClose={() => setParsed(null)} title="Sicherung prüfen"
        footer={<>
          <button className="btn btn-outline" onClick={() => setParsed(null)}>Abbrechen</button>
          <button className="btn btn-outline" disabled={busy} onClick={async () => {
            if (!parsed) return; setBusy(true);
            const r = await store.run(() => store.mergeIn(parsed.file.data, parsed.blobs));
            setBusy(false);
            if (r) { store.toast(`${r.added} Datensätze ergänzt, ${r.skipped} bereits vorhandene übersprungen.`); setParsed(null); }
          }}>Ergänzen</button>
          <button className="btn btn-danger" onClick={() => setConfirmReplace(true)}>Alles ersetzen …</button>
        </>}>
        {parsed && (
          <div className="stack">
            <p>Exportiert am {new Date(parsed.file.exportedAt).toLocaleString('de-DE')} · Format {parsed.file.version}</p>
            <p><strong>{parsed.file.includesAttachments ? 'Mit Fotos und Dokumenten' : 'Ohne Fotos und Dokumente'}</strong></p>
            <table className="simple"><tbody>{Object.entries(parsed.counts).map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td className="mono">{v}</td></tr>)}</tbody></table>
            {parsed.warnings.map((w) => <Notice key={w} kind="warn">{w}</Notice>)}
            <p className="small muted"><strong>Ergänzen</strong> fügt nur Datensätze hinzu, die noch nicht vorhanden sind – nichts wird überschrieben. <strong>Ersetzen</strong> löscht zuerst alle aktuellen Daten.</p>
          </div>
        )}
      </Dialog>

      <ConfirmDialog open={confirmReplace} title="Alle Daten ersetzen?" confirmLabel="Ersetzen" danger busy={busy} onClose={() => setConfirmReplace(false)}
        onConfirm={async () => {
          if (!parsed) return; setBusy(true);
          const ok = await store.run(() => store.replaceAll(parsed.file.data, parsed.blobs), 'Sicherung wiederhergestellt.');
          setBusy(false); setConfirmReplace(false);
          if (ok !== undefined) { setParsed(null); navigate('/', { replace: true }); }
        }}>
        <p>Alle aktuellen Daten auf diesem Gerät werden gelöscht und durch die Sicherung ersetzt.</p>
        {!parsed?.file.includesAttachments && <p><strong>Achtung:</strong> Diese Sicherung enthält keine Fotos und Dokumente. Vorhandene Anhänge gehen verloren.</p>}
      </ConfirmDialog>

      <ConfirmDialog open={confirmReset} title="Wirklich alle Daten löschen?" confirmLabel="Alles löschen" danger onClose={() => setConfirmReset(false)}
        onConfirm={async () => { const ok = await store.run(() => store.resetAll(), 'Alle Daten wurden gelöscht.'); setConfirmReset(false); if (ok !== undefined) navigate('/', { replace: true }); }}>
        <p>Das betrifft {store.data.areas.length} Fläche(n), {store.data.tasks.length} Aufgaben, {store.data.journal.length} Tagebucheinträge, {store.data.observations.length} Beobachtungen, {store.data.measurements.length} Messungen und {store.data.attachments.length} Anhänge.</p>
        <p className="small muted">Dieser Schritt kann nicht rückgängig gemacht werden.</p>
      </ConfirmDialog>
    </>
  );
}

export function AboutPage() {
  const reviewed = [...RULES, ...PLANTS, ...PROBLEMS].filter((x) => x.reviewStatus === 'geprueft').length;
  const total = RULES.length + PLANTS.length + PROBLEMS.length;
  return (
    <>
      <SubHead title="Hilfe & Hinweise" subtitle="So funktioniert Rasenzeit." backTo="/profil" backLabel="Profil" />
      <div className="cols">
        <div className="stack">
          <section className="card card-pad-lg stack-sm">
            <h2 className="section-title" style={{ marginBottom: 0 }}>Wie entstehen Vorschläge?</h2>
            <p>Der Pflegeplan entsteht aus festen Regeln und deinen Angaben: Jahreszeit, Zustand, Licht, Nutzung, Bodenprofil, Pflegeverlauf und hinterlegte Produkte. Jede Regel hat eine Kennung, nennt ihre Voraussetzungen und begründet den Vorschlag. Es gibt keine KI, keine Bilderkennung und keine Online-Anbindung.</p>
            <p>Unbekannte Angaben bleiben unbekannt. Fehlen Informationen, zeigt die Aufgabe „Angaben fehlen“ statt einer Vermutung.</p>
          </section>
          <section className="card card-pad-lg stack-sm">
            <h2 className="section-title" style={{ marginBottom: 0 }}>Prüfstatus der Inhalte</h2>
            <p>{reviewed} von {total} Fachinhalten sind fachlich geprüft. Alle anderen sind als Entwurf gekennzeichnet und werden nur als unverbindliche Vorschläge formuliert.</p>
            <div><ReviewTag meta={RULES[0]} /></div>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 600, minHeight: 40 }}>Alle Planungsregeln ({RULES.length})</summary>
              <div className="table-wrap"><table className="simple" style={{ marginTop: 8 }}>
                <thead><tr><th>Kennung</th><th>Titel</th><th>Voraussetzung</th></tr></thead>
                <tbody>{RULES.map((r) => <tr key={r.id}><td className="mono small">{r.id}</td><td>{r.title}</td><td className="small">{r.conditionText}</td></tr>)}</tbody>
              </table></div>
            </details>
          </section>
          <section className="card card-pad-lg stack-sm">
            <h2 className="section-title" style={{ marginBottom: 0 }}>Grenzen dieser Version</h2>
            <ul style={{ margin: 0, paddingLeft: 20 }} className="stack-sm">
              <li>Keine Wetterdaten – Zeitfenster richten sich nach der Jahreszeit.</li>
              <li>Keine Hintergrund-Mitteilungen; Erinnerungen erscheinen in der App und per ICS-Kalenderexport.</li>
              <li>Keine geprüften Referenzfotos für Pflanzen – stattdessen gekennzeichnete Platzhalter.</li>
              <li>Keine Empfehlungen für chemische Mittel und keine Herstellerdatenbank.</li>
              <li>Keine Synchronisierung zwischen Geräten.</li>
            </ul>
          </section>
        </div>
        <div className="stack col-side">
          <section className="card stack-sm">
            <h3>Kontakt</h3>
            <p className="small">Für diese erste Version ist noch keine Kontaktadresse hinterlegt. Fragen zur Rasenpflege beantworten Gartenfachhandel, Landwirtschaftskammern oder Gartenbauberatungen in deiner Region.</p>
          </section>
          <UpdateCheck />
          <p className="tiny muted">Rasenzeit {APP_VERSION} · {isNativeApp() ? 'Android-App' : 'Web-App'} · Datenformat {DATA_VERSION}</p>
        </div>
      </div>
    </>
  );
}
