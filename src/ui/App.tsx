import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { DataProvider } from './data';
import { useRoute, href } from './router';
import { HomePage } from './pages/HomePage';
import { GamePage } from './pages/GamePage';
import { GraveyardPage } from './pages/GraveyardPage';
import { PublishersPage } from './pages/PublishersPage';
import { PublisherPage } from './pages/PublisherPage';
import { ShelfPage } from './pages/ShelfPage';
import { WatchPage } from './pages/WatchPage';
import { RightsPage } from './pages/RightsPage';
import { ConnectPage } from './pages/ConnectPage';
import { SyncPage } from './pages/SyncPage';
import { SupportPage } from './pages/SupportPage';
import { AboutPage } from './pages/AboutPage';
import { NotFoundPage } from './pages/NotFoundPage';

function PowerIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d="M32 12v20" stroke="var(--brand)" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M19.5 20.5a18 18 0 1 0 25 0" fill="none" stroke="var(--brand)" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

const NAV: [string, string][] = [
  ['/graveyard', 'Graveyard'],
  ['/publishers', 'Publishers'],
  ['/watch', 'Death Watch'],
  ['/shelf', 'My Shelf'],
  ['/rights', 'Rights'],
  ['/sync', 'Sync'],
  ['/about', 'About'],
];

const TABS: { path: string; label: string; icon: ReactNode }[] = [
  {
    path: '/',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
        <path d="M3 10.5 12 3l9 7.5V21h-6v-6h-6v6H3z" />
      </svg>
    ),
  },
  {
    path: '/graveyard',
    label: 'Graveyard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
        <path d="M6 21V9a6 6 0 0 1 12 0v12M4 21h16M12 8v6M9.5 10.5h5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    path: '/watch',
    label: 'Watch',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2.5M9 2h6" />
      </svg>
    ),
  },
  {
    path: '/shelf',
    label: 'Shelf',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
        <path d="M4 4h16v16H4zM4 9h16M8 4v5" />
      </svg>
    ),
  },
  {
    path: '/rights',
    label: 'Rights',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18M5 7l7-4 7 4M5 7l-2.5 6a3.5 3.5 0 0 0 7 0L7 7M19 7l-2.5 6a3.5 3.5 0 0 0 7 0L21 7M8 21h8" />
      </svg>
    ),
  },
];

function Page() {
  const { segments } = useRoute();
  const [head, arg] = segments;

  switch (head ?? '') {
    case '':
      return <HomePage />;
    case 'game':
      return arg ? <GamePage id={arg} /> : <NotFoundPage />;
    case 'graveyard':
      return <GraveyardPage />;
    case 'publishers':
      return <PublishersPage />;
    case 'publisher':
      return arg ? <PublisherPage id={arg} /> : <NotFoundPage />;
    case 'shelf':
      return <ShelfPage />;
    case 'watch':
      return <WatchPage />;
    case 'rights':
      return <RightsPage />;
    case 'connect':
      return <ConnectPage />;
    case 'sync':
      return <SyncPage />;
    case 'support':
      return <SupportPage />;
    case 'about':
      return <AboutPage />;
    default:
      return <NotFoundPage />;
  }
}

export function App() {
  const route = useRoute();
  const active = `/${route.segments[0] ?? ''}`;

  // New page, top of page. (Hash routing doesn't reset scroll by itself.)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.path]);

  return (
    <DataProvider>
      <div className="shell">
        <nav className="topnav">
          <div className="topnav-inner">
            <a className="brand" href={href('/')}>
              <PowerIcon />
              KillSwitch
            </a>
            <div className="navlinks">
              {NAV.map(([path, label]) => (
                <a key={path} href={href(path)} className={active === path ? 'active' : ''}>
                  {label}
                </a>
              ))}
            </div>
          </div>
        </nav>

        <main>
          <Page />
        </main>

        <footer className="site">
          <div className="inner">
            <span>
              <b style={{ color: 'var(--dim)' }}>KillSwitch</b> — you bought it; find out if you get to keep it.
            </span>
            <a href={href('/about')}>Methodology</a>
            <a href={href('/connect')}>Import library</a>
            <a href={href('/support')}>Support ♥</a>
            <span className="faint">No ads · no tracking · every feature free forever</span>
          </div>
        </footer>

        <nav className="tabbar">
          {TABS.map((t) => (
            <a key={t.path} href={href(t.path)} className={active === t.path ? 'active' : ''}>
              {t.icon}
              {t.label}
            </a>
          ))}
        </nav>
      </div>
    </DataProvider>
  );
}
