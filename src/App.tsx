import { useEffect, useMemo, useState } from 'react';
import { useStore } from './lib/store';
import { match, navigate, usePath } from './lib/router';
import { Icon, Logo, type IconName } from './ui/icons';
import { Dialog } from './ui/components';
import { today, fmtDateTime, fmtSchedule } from './lib/dates';
import { isDue } from './planning/engine';

import { Setup } from './pages/Setup';
import { Overview } from './pages/Overview';
import { PlanPage } from './pages/Plan';
import { TaskDetail } from './pages/TaskDetail';
import { HelpPage, ProblemDetail } from './pages/Help';
import { LexiconCompare, LexiconDetail, LexiconPage } from './pages/Lexicon';
import { WeedGuide } from './pages/WeedGuide';
import { ObservationsPage, ObservationDetail } from './pages/Observations';
import { JournalPage, JournalEntryPage, PhotoHistory } from './pages/Journal';
import { ProfilePage } from './pages/Profile';
import { AreaProfile } from './pages/AreaProfile';
import { SoilPage } from './pages/Soil';
import { SoilGuidePage } from './pages/SoilGuide';
import { ProductsPage, DevicesPage } from './pages/Equipment';
import { LocationPage, DataPage, AboutPage } from './pages/Settings';
import { exitDemo } from './content/demo';
import { UpdateBanner } from './ui/Update';

const NAV: { path: string; label: string; icon: IconName }[] = [
  { path: '/', label: 'Übersicht', icon: 'home' },
  { path: '/plan', label: 'Pflegeplan', icon: 'calendar' },
  { path: '/hilfe', label: 'Rasenhilfe', icon: 'sprout' },
  { path: '/tagebuch', label: 'Tagebuch', icon: 'book' },
  { path: '/profil', label: 'Profil', icon: 'user' },
];

function section(path: string): string {
  if (path === '/' || path === '') return '/';
  const first = '/' + path.split('?')[0].split('/')[1];
  return NAV.some((n) => n.path === first) ? first : '/';
}

function NavList() {
  const path = usePath();
  const cur = section(path);
  return (
    <ul>
      {NAV.map((n) => (
        <li key={n.path}>
          <a href={`#${n.path}`} className="nav-link" aria-current={cur === n.path ? 'page' : undefined}>
            <Icon name={n.icon} size={24} strokeWidth={cur === n.path ? 2.2 : 1.8} />
            <span>{n.label}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function RemindersButton() {
  const { data } = useStore();
  const [open, setOpen] = useState(false);
  const t = today();
  const now = new Date();
  const nowLocal = `${t}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const enabled = data.user?.remindersEnabled ?? true;
  const due = useMemo(() => {
    if (!enabled) return [];
    return data.tasks
      .filter((x) => x.status !== 'erledigt' && ((x.reminderAt && x.reminderAt <= nowLocal) || isDue(x, t)))
      .sort((a, b) => (a.reminderAt ?? '9').localeCompare(b.reminderAt ?? '9'));
  }, [data.tasks, enabled, nowLocal, t]);
  const areaName = (id: string) => data.areas.find((a) => a.id === id)?.name ?? '';
  return (
    <>
      <button type="button" className="icon-btn" aria-label={`Fällige Aufgaben${due.length ? ` (${due.length})` : ''}`} onClick={() => setOpen(true)}>
        <Icon name="bell" size={24} />
        {due.length > 0 && <span className="dot" aria-hidden="true">{due.length > 9 ? '9+' : due.length}</span>}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Fällige Aufgaben">
        {!enabled ? (
          <p className="muted">Erinnerungen sind ausgeschaltet. Du kannst sie im Profil unter Einstellungen aktivieren.</p>
        ) : due.length === 0 ? (
          <p className="muted">Gerade ist nichts fällig. Aufgaben erscheinen hier, sobald ihr Termin, ihr Zeitfenster oder ihre Erinnerungszeit erreicht ist.</p>
        ) : (
          <div className="card list-card">
            {due.map((x) => (
              <a key={x.id} className="list-row" href={`#/plan/aufgabe/${x.id}`} onClick={() => setOpen(false)}>
                <span className="grow">
                  <span className="title" style={{ display: 'block' }}>{x.title}</span>
                  <span className="sub">{areaName(x.areaId)} · {x.reminderAt ? `Erinnerung ${fmtDateTime(x.reminderAt)}` : fmtSchedule(x.schedule)}</span>
                </span>
                <Icon name="chevronRight" className="chev" />
              </a>
            ))}
          </div>
        )}
        <p className="tiny muted" style={{ marginTop: 16 }}>Erinnerungen werden innerhalb der App angezeigt, wenn du sie öffnest. Hintergrund-Mitteilungen gibt es in dieser Version nicht – für Kalender-Erinnerungen nutze den ICS-Export im Pflegeplan.</p>
      </Dialog>
    </>
  );
}

function DemoBanner() {
  const store = useStore();
  const [busy, setBusy] = useState(false);
  if (!store.data.user?.isDemo) return null;
  return (
    <div className="demo-banner" role="status">
      <span><strong>Demomodus:</strong> Alle Inhalte sind Beispieldaten.</span>
      <button type="button" className="btn btn-sm btn-outline" disabled={busy} onClick={async () => {
        setBusy(true);
        await store.run(() => exitDemo(store), 'Demomodus beendet. Beispieldaten wurden entfernt.');
        setBusy(false);
        navigate('/start', { replace: true });
      }}>Demo beenden</button>
    </div>
  );
}

function Routes({ path }: { path: string }) {
  const p = path.split('?')[0];
  let m: Record<string, string> | null;
  if (p === '/' || p === '') return <Overview />;
  if (p === '/plan') return <PlanPage />;
  if ((m = match('/plan/aufgabe/:id', p))) return <TaskDetail id={m.id} />;
  if (p === '/hilfe') return <HelpPage />;
  if (p === '/hilfe/bestimmung') return <WeedGuide />;
  if (p === '/hilfe/lexikon') return <LexiconPage />;
  if ((m = match('/hilfe/pflanze/:id', p))) return <LexiconDetail id={m.id} />;
  if ((m = match('/hilfe/pflanze/:id/vergleich', p))) return <LexiconCompare id={m.id} />;
  if ((m = match('/hilfe/problem/:id', p))) return <ProblemDetail id={m.id} />;
  if (p === '/hilfe/beobachtungen') return <ObservationsPage />;
  if ((m = match('/hilfe/beobachtung/:id', p))) return <ObservationDetail id={m.id} />;
  if (p === '/tagebuch') return <JournalPage />;
  if ((m = match('/tagebuch/eintrag/:id', p))) return <JournalEntryPage id={m.id} />;
  if (p === '/tagebuch/verlauf') return <PhotoHistory />;
  if (p === '/profil') return <ProfilePage />;
  if (p === '/profil/flaeche-neu') return <Setup mode="area" />;
  if ((m = match('/profil/flaeche/:id', p))) return <AreaProfile id={m.id} />;
  if ((m = match('/profil/flaeche/:id/boden', p))) return <SoilPage id={m.id} />;
  if ((m = match('/profil/flaeche/:id/boden/bestimmung', p))) return <SoilGuidePage id={m.id} />;
  if (p === '/profil/produkte') return <ProductsPage />;
  if (p === '/profil/geraete') return <DevicesPage />;
  if (p === '/profil/standort') return <LocationPage />;
  if (p === '/profil/daten') return <DataPage />;
  if (p === '/profil/hilfe') return <AboutPage />;
  return (
    <div className="card empty">
      <h1 style={{ fontSize: '1.4rem' }}>Seite nicht gefunden</h1>
      <a className="btn btn-primary" href="#/">Zur Übersicht</a>
    </div>
  );
}

export function App() {
  const store = useStore();
  const path = usePath();

  // Fokus nach Seitenwechsel auf die Überschrift setzen und nach oben scrollen
  useEffect(() => {
    window.scrollTo(0, 0);
    const h = document.getElementById('page-title');
    h?.focus({ preventScroll: true });
  }, [path]);

  if (!store.ready) return <div className="setup"><p className="muted">Rasenzeit wird geladen …</p></div>;
  if (store.fatal) {
    return (
      <div className="setup"><div className="card card-pad-lg setup-card stack">
        <div className="brand"><Logo /> Rasenzeit</div>
        <h1 style={{ fontSize: '1.5rem' }}>Lokaler Speicher nicht verfügbar</h1>
        <p>{store.fatal}</p>
        <p className="muted small">Rasenzeit speichert deine Daten ausschließlich in diesem Browser. Ohne Zugriff darauf können keine Eingaben gesichert werden.</p>
        <button className="btn btn-primary" onClick={() => void store.reload()}>Erneut versuchen</button>
      </div></div>
    );
  }
  if (!store.data.user || store.data.areas.length === 0) return <Setup mode="first" />;

  return (
    <div className="shell">
      <a className="skip-link" href="#main">Zum Inhalt springen</a>
      <nav className="sidebar" aria-label="Hauptnavigation">
        <a className="brand" href="#/"><Logo /> Rasenzeit</a>
        <NavList />
        <p className="sidebar-foot">Daten werden nur lokal in diesem Browser gespeichert.</p>
      </nav>
      <div>
        <main className="main" id="main">
          <div className="topbar">
            <a className="brand" href="#/"><Logo /> Rasenzeit</a>
            <div className="topbar-actions"><RemindersButton /></div>
          </div>
          <UpdateBanner />
          <DemoBanner />
          <div className="fade-in" key={path.split('?')[0]}><Routes path={path} /></div>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Hauptnavigation"><NavList /></nav>
      <Toasts />
    </div>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="toasts" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind === 'error' ? 'error' : ''}`} role={t.kind === 'error' ? 'alert' : 'status'}>
          <Icon name={t.kind === 'error' ? 'alert' : 'checkCircle'} size={18} />
          <span>{t.text}</span>
          <button type="button" aria-label="Meldung schließen" onClick={() => dismissToast(t.id)}><Icon name="x" size={16} /></button>
        </div>
      ))}
    </div>
  );
}
