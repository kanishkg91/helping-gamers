import { useState } from 'react';
import {
  createVault,
  forgetVaultKeyOnThisDevice,
  signInWithGoogle,
  signOut,
  syncNow,
  unlockWithPhrase,
  useSyncState,
} from '../../services/syncService';

function Explainer() {
  return (
    <div className="section">
      <h2>How zero-knowledge works here</h2>
      <ol className="dim" style={{ maxWidth: 700, paddingLeft: 20, fontSize: '0.93rem' }}>
        <li>Your shelf is encrypted <b>on your device</b> with AES-256-GCM.</li>
        <li>
          The key never leaves your device. Its only backup is a <b>12-word recovery phrase</b> shown
          to you once — we never see it.
        </li>
        <li>
          The server stores one opaque encrypted blob per account. We could not read your library if
          we were subpoenaed, breached, or just curious.
        </li>
        <li>New device: sign in, type the 12 words, done.</li>
      </ol>
    </div>
  );
}

function PhraseReveal({ words, onDone }: { words: string[]; onDone: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div className="card" style={{ borderColor: 'rgba(245,184,61,0.5)' }}>
      <h3>Write these 12 words down. This is the only time you’ll see them.</h3>
      <p className="dim" style={{ fontSize: '0.9rem' }}>
        They are the only way to unlock your library on another device. We cannot recover them —
        that’s the whole point.
      </p>
      <div className="phrasegrid">
        {words.map((w, i) => (
          <span className="w" key={i}>
            <b>{i + 1}</b>
            {w}
          </span>
        ))}
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.9rem', margin: '12px 0' }}>
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        I’ve written them somewhere safe (not a screenshot on the same device).
      </label>
      <button className="btn primary" disabled={!confirmed} onClick={onDone}>
        Done — start syncing
      </button>
    </div>
  );
}

export function SyncPage() {
  const sync = useSyncState();
  const [phraseWords, setPhraseWords] = useState<string[] | null>(null);
  const [phraseInput, setPhraseInput] = useState('');
  const [busyLocal, setBusyLocal] = useState(false);

  const create = async () => {
    setBusyLocal(true);
    try {
      setPhraseWords(await createVault());
    } finally {
      setBusyLocal(false);
    }
  };

  const unlock = async () => {
    setBusyLocal(true);
    try {
      await unlockWithPhrase(phraseInput);
      setPhraseInput('');
    } catch {
      /* error already surfaced via sync state */
    } finally {
      setBusyLocal(false);
    }
  };

  return (
    <>
      <div className="pagehead">
        <h1>🔐 Encrypted sync</h1>
        <p className="sub">
          Optional. The app is fully functional without an account — sync only exists so your shelf
          follows you across devices, encrypted so that <b>we can’t read it</b>. Not “we promise not
          to.” Can’t.
        </p>
      </div>

      {sync.error && <p className="error" style={{ margin: '14px 0' }}>{sync.error}</p>}

      {sync.phase === 'unconfigured' && (
        <div className="card" style={{ marginTop: 18 }}>
          <h3>Sync isn’t configured in this deployment.</h3>
          <p className="dim" style={{ fontSize: '0.92rem' }}>
            This build runs local-only: your shelf lives in this browser and nowhere else, which is
            the most private option of all. If you self-host, add free Supabase credentials
            (<span className="mono">VITE_SUPABASE_URL</span>, <span className="mono">VITE_SUPABASE_ANON_KEY</span>)
            to enable encrypted multi-device sync — the README has the 10-minute guide.
          </p>
        </div>
      )}

      {sync.phase === 'signed_out' && (
        <div className="card" style={{ marginTop: 18 }}>
          <h3>Sign in to sync</h3>
          <p className="dim" style={{ fontSize: '0.92rem' }}>
            Google verifies <i>who</i> you are so your encrypted blob has an owner. It never sees
            <i> what</i> you own.
          </p>
          <button className="btn primary" onClick={() => void signInWithGoogle()}>
            Continue with Google
          </button>
        </div>
      )}

      {sync.phase === 'needs_vault' && !phraseWords && (
        <div className="card" style={{ marginTop: 18 }}>
          <h3>Create your vault</h3>
          <p className="dim" style={{ fontSize: '0.92rem' }}>
            Signed in as <b>{sync.email}</b>. Next: we generate an encryption key on this device and
            show you its 12-word recovery phrase — once.
          </p>
          <button className="btn primary" disabled={busyLocal} onClick={() => void create()}>
            {busyLocal ? 'Generating…' : 'Generate my recovery phrase'}
          </button>
        </div>
      )}

      {phraseWords && <PhraseReveal words={phraseWords} onDone={() => setPhraseWords(null)} />}

      {sync.phase === 'needs_phrase' && (
        <div className="card" style={{ marginTop: 18 }}>
          <h3>Unlock your vault</h3>
          <p className="dim" style={{ fontSize: '0.92rem' }}>
            Signed in as <b>{sync.email}</b>. This account already has an encrypted vault — enter
            your 12-word phrase to unlock it on this device.
          </p>
          <textarea
            className="phrase"
            value={phraseInput}
            onChange={(e) => setPhraseInput(e.target.value)}
            placeholder="twelve words separated by spaces"
            spellCheck={false}
          />
          <div className="controls">
            <button
              className="btn primary"
              disabled={busyLocal || sync.busy || phraseInput.trim().split(/\s+/).length !== 12}
              onClick={() => void unlock()}
            >
              {busyLocal || sync.busy ? 'Unlocking…' : 'Unlock'}
            </button>
            <button className="btn" onClick={() => void signOut()}>Sign out</button>
          </div>
        </div>
      )}

      {sync.phase === 'ready' && !phraseWords && (
        <div className="card" style={{ marginTop: 18 }}>
          <h3>
            <span style={{ color: 'var(--grade-a)' }}>●</span> Syncing
          </h3>
          <p className="dim" style={{ fontSize: '0.92rem' }}>
            {sync.email} · every change to your shelf is encrypted here and pushed automatically.
            {sync.lastSyncAt && (
              <>
                {' '}Last sync: <span className="mono">{new Date(sync.lastSyncAt).toLocaleTimeString()}</span>
              </>
            )}
          </p>
          <div className="controls">
            <button className="btn" disabled={sync.busy} onClick={() => void syncNow()}>
              {sync.busy ? 'Syncing…' : 'Sync now'}
            </button>
            <button
              className="btn"
              onClick={() => {
                if (window.confirm('Forget the encryption key on this device? You will need your 12-word phrase to unlock sync again.')) {
                  forgetVaultKeyOnThisDevice();
                }
              }}
            >
              Forget key on this device
            </button>
            <button className="btn danger" onClick={() => void signOut()}>Sign out</button>
          </div>
        </div>
      )}

      <Explainer />
    </>
  );
}
