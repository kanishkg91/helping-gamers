import { useState } from 'react';
import { useAppData } from '../data';
import { href } from '../router';
import { CONNECTORS } from '../../services/connectors/types';
import { fetchSteamLibrary, importToShelf, type SteamImportSummary } from '../../services/connectors/steam';

function SteamConnector() {
  const { dataset } = useAppData();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SteamImportSummary | null>(null);

  const run = async () => {
    if (!input.trim() || busy) return;
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const games = await fetchSteamLibrary(input);
      setSummary(importToShelf(games, dataset));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Steam</h3>
        <span className="tag green">works</span>
      </div>
      <p className="dim" style={{ fontSize: '0.9rem' }}>
        {CONNECTORS.find((c) => c.id === 'steam')!.description}
      </p>
      <form
        className="controls"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <input
          className="text"
          style={{ flex: 1, minWidth: 220 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Vanity name or SteamID64 (from your profile URL)"
          aria-label="Steam vanity name or SteamID64"
          spellCheck={false}
        />
        <button className="btn primary" disabled={busy || !input.trim()}>
          {busy ? 'Reading…' : 'Import library'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {summary && (
        <p className="ok">
          Found {summary.totalOwned} games on that profile. Matched{' '}
          <b>{summary.matched.length}</b> against our dataset and added them to{' '}
          <a href={href('/shelf')}>your shelf</a>
          {summary.unmatched > 0 && (
            <span className="dim">
              {' '}
              — {summary.unmatched} aren’t rated by us yet (we only grade what we can verify).
            </span>
          )}
        </p>
      )}
      <p className="faint" style={{ fontSize: '0.78rem', marginTop: 10 }}>
        Privacy: the request goes straight through a stateless proxy to Steam’s public XML and back.
        Nothing is logged, stored, or associated with you.
      </p>
    </div>
  );
}

export function ConnectPage() {
  return (
    <>
      <div className="pagehead">
        <h1>🔌 Connect a library</h1>
        <p className="sub">
          Import what you own instead of typing it. One platform makes that possible. The other
          three are their own indictment.
        </p>
      </div>

      <div className="grid" style={{ gap: 14, marginTop: 18 }}>
        <SteamConnector />

        {CONNECTORS.filter((c) => c.status === 'unavailable').map((c) => (
          <div className="card" key={c.id} style={{ opacity: 0.85 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0 }}>{c.name}</h3>
              <span className="tag red">no public API</span>
            </div>
            <p className="dim" style={{ fontSize: '0.9rem', marginBottom: 0 }}>
              {c.description}{' '}
              <a href={href('/rights')}>Know your rights →</a>
            </p>
          </div>
        ))}
      </div>

      <p className="dim" style={{ marginTop: 20, fontSize: '0.9rem' }}>
        You can always <a href={href('/shelf')}>add games manually</a> — search works for every game
        we rate, no account needed.
      </p>
    </>
  );
}
