const KOFI = import.meta.env.VITE_DONATE_KOFI as string | undefined;
const GH = import.meta.env.VITE_DONATE_GITHUB_SPONSORS as string | undefined;
const BMC = import.meta.env.VITE_DONATE_BUYMEACOFFEE as string | undefined;

export function SupportPage() {
  const links = [
    KOFI && { name: 'Ko-fi', url: KOFI, emoji: '☕' },
    GH && { name: 'GitHub Sponsors', url: GH, emoji: '💜' },
    BMC && { name: 'Buy Me a Coffee', url: BMC, emoji: '🧋' },
  ].filter(Boolean) as { name: string; url: string; emoji: string }[];

  return (
    <>
      <div className="pagehead">
        <h1>💛 Support KillSwitch</h1>
        <p className="sub">
          Every feature here is free, forever, for everyone. No premium tier, no locked charts, no
          “pro” grades. An app about not letting people take things away from you is not going to
          take things away from you.
        </p>
      </div>

      {links.length > 0 ? (
        <div className="grid cols3" style={{ marginTop: 20 }}>
          {links.map((l) => (
            <a className="card" key={l.name} href={l.url} target="_blank" rel="noreferrer noopener" style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '1.8rem' }}>{l.emoji}</span>
              <h3 style={{ margin: '8px 0 0' }}>{l.name}</h3>
            </a>
          ))}
        </div>
      ) : (
        <div className="card" style={{ marginTop: 20 }}>
          <h3>No donation links configured in this deployment.</h3>
          <p className="dim" style={{ fontSize: '0.92rem', marginBottom: 0 }}>
            If you self-host, set <span className="mono">VITE_DONATE_KOFI</span>,{' '}
            <span className="mono">VITE_DONATE_GITHUB_SPONSORS</span> or{' '}
            <span className="mono">VITE_DONATE_BUYMEACOFFEE</span> to show your links here.
          </p>
        </div>
      )}

      <div className="section">
        <h2>Ways to help that cost nothing</h2>
        <ul className="dim" style={{ maxWidth: 700, paddingLeft: 20, fontSize: '0.93rem' }}>
          <li>Share your Shelf risk report — the number does the arguing for you.</li>
          <li>File a data correction if we got a grade wrong. Receipts win.</li>
          <li>When a shutdown is announced, check Death Watch and warn people who own it.</li>
        </ul>
      </div>
    </>
  );
}
