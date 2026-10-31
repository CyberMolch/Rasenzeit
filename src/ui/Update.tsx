import { useEffect, useState } from 'react';
import { Icon } from './icons';
import { Dialog } from './components';
import {
  APP_VERSION, RELEASES_URL, checkForUpdate, isSkipped, openDownload, shouldAutoCheck, skipVersion, type ReleaseInfo, type UpdateResult,
} from '../lib/update';
import { isNativeApp, fmtBytes } from '../lib/files';

function ReleaseNotes({ r }: { r: ReleaseInfo }) {
  return (
    <div className="stack-sm">
      <p className="small muted">Version {r.version} · veröffentlicht am {new Date(r.publishedAt).toLocaleDateString('de-DE')}{r.apkSize ? ` · ${fmtBytes(r.apkSize)}` : ''}</p>
      {r.notes ? <p style={{ whiteSpace: 'pre-line' }}>{r.notes}</p> : <p className="muted">Keine Änderungshinweise hinterlegt.</p>}
    </div>
  );
}

function InstallHint() {
  return (
    <ol className="small" style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4 }}>
      <li>Der Download startet im Browser.</li>
      <li>Danach die heruntergeladene Datei antippen und „Aktualisieren“ wählen.</li>
      <li>Beim ersten Mal fragt Android, ob der Browser Apps installieren darf – das einmal erlauben.</li>
    </ol>
  );
}

/** Hinweisleiste: erscheint in der Android-App, wenn ein neueres Release vorliegt. */
export function UpdateBanner() {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [hidden, setHidden] = useState(false);
  const [details, setDetails] = useState(false);

  useEffect(() => {
    if (!shouldAutoCheck()) return;
    void checkForUpdate().then((r) => { if (r.status === 'verfuegbar' && !isSkipped(r.latest.version)) setRelease(r.latest); });
  }, []);

  if (!release || hidden) return null;
  return (
    <>
      <div className="update-banner" role="status">
        <Icon name="download" size={20} />
        <span className="grow"><strong>Update verfügbar:</strong> Version {release.version} (du nutzt {APP_VERSION})</span>
        <div className="row-wrap">
          <button className="btn btn-sm btn-primary" onClick={() => setDetails(true)}>Ansehen</button>
          <button className="btn btn-sm btn-ghost" onClick={() => setHidden(true)}>Später</button>
        </div>
      </div>
      <Dialog open={details} onClose={() => setDetails(false)} title={`Rasenzeit ${release.version}`}
        footer={<>
          <button className="btn btn-ghost" onClick={() => { skipVersion(release.version); setDetails(false); setHidden(true); }}>Diese Version überspringen</button>
          <button className="btn btn-primary" onClick={() => release.apkUrl && openDownload(release.apkUrl)}><Icon name="download" size={18} /> Herunterladen</button>
        </>}>
        <div className="stack">
          <ReleaseNotes r={release} />
          <InstallHint />
          <p className="tiny muted">Deine Daten bleiben beim Aktualisieren erhalten. Zur Sicherheit kannst du vorher unter Profil → Datenschutz & Datenexport eine Sicherung erstellen.</p>
        </div>
      </Dialog>
    </>
  );
}

/** Manuelle Prüfung, z. B. auf der Seite „Hilfe & Hinweise“. */
export function UpdateCheck() {
  const native = isNativeApp();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UpdateResult | null>(null);
  const run = async () => { setBusy(true); setResult(await checkForUpdate()); setBusy(false); };
  return (
    <section className="card stack-sm" aria-labelledby="upd">
      <h3 id="upd">App-Version</h3>
      <p className="small">Installiert: <strong className="mono">{APP_VERSION}</strong> · {native ? 'Android-App' : 'Web-Version'}</p>
      {native ? (
        <>
          <button className="btn btn-outline" disabled={busy} onClick={() => void run()}><Icon name="refresh" size={18} /> {busy ? 'Prüfe …' : 'Nach Updates suchen'}</button>
          <div aria-live="polite">
            {result?.status === 'aktuell' && <p className="small">Du hast die neueste Version.{result.latest ? '' : ' Es ist noch kein Release veröffentlicht.'}</p>}
            {result?.status === 'fehler' && <p className="small" style={{ color: 'var(--c-danger)' }}>{result.message}</p>}
            {result?.status === 'verfuegbar' && (
              <div className="stack-sm">
                <p className="small"><strong>Version {result.latest.version} ist verfügbar.</strong></p>
                <ReleaseNotes r={result.latest} />
                <InstallHint />
                <button className="btn btn-primary" onClick={() => result.latest.apkUrl && openDownload(result.latest.apkUrl)}><Icon name="download" size={18} /> Herunterladen</button>
              </div>
            )}
          </div>
          <p className="tiny muted">Die App sucht außerdem höchstens einmal täglich beim Start automatisch. Dabei wird nur die öffentliche Release-Liste auf GitHub abgefragt; es werden keine Daten von dir gesendet.</p>
        </>
      ) : (
        <p className="small">Die Android-App gibt es als APK unter <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer">GitHub-Releases</a> (github.com/CyberMolch/Rasenzeit/releases).</p>
      )}
    </section>
  );
}
