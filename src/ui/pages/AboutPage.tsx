import { useAppData } from '../data';
import { href } from '../router';

const FACTORS = [
  ['Server dependency', '32%', 'How much of the game dies with the publisher’s servers — from “nothing” (fully offline) to “everything” (always-online).'],
  ['End-of-life plan', '16%', 'What the publisher has committed to for shutdown day: shipped offline patch, promise, partial survival, or the industry default — silence. Skipped (weight redistributed) for fully offline games, which have nothing to sunset.'],
  ['DRM & activation', '14%', 'Whether your copy runs on your say-so (DRM-free) or theirs (storefront check, Denuvo re-validation, per-session login).'],
  ['Business model', '14%', 'Pay-once products have no shutdown clock. Free-to-play live services are historically the highest-mortality category in gaming.'],
  ['Publisher track record', '14%', 'Computed from our graveyard: kills, how much was lost, how recently, and whether players were refunded (the one mitigating act).'],
  ['Physical / backup escape hatch', '10%', 'Whether a complete offline copy exists on disc, cartridge, or DRM-free installer — the last line of defense.'],
] as const;

export function AboutPage() {
  const { dataset, source } = useAppData();

  return (
    <>
      <div className="pagehead">
        <h1>About KillSwitch</h1>
        <p className="sub">
          <b>You bought it. Find out if you get to keep it.</b> Every game gets a Survival Grade
          answering the question no storefront will: can this game be taken away from you?
        </p>
      </div>

      <div className="section">
        <h2>Why this exists</h2>
        <p className="dim" style={{ maxWidth: 720 }}>
          On June 16, 2026, the European Commission answered 1.29 million citizens demanding that
          purchased games stay playable: no law, just a voluntary industry code of conduct and a
          promise to raise “awareness of existing consumer rights.” This app is that awareness,
          weaponized. Games people paid for keep being switched off —{' '}
          {dataset.graveyard.length} of them are in our <a href={href('/graveyard')}>Graveyard</a>,
          every one with sources.
        </p>
      </div>

      <div className="section">
        <h2>Show the math — the whole math</h2>
        <p className="sub">
          Each factor scores 0–100 (100 = safest) and carries the weight below. Weights renormalize
          when a factor doesn’t apply. The weighted sum is the Survival Score.
        </p>
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          {FACTORS.map(([name, weight, desc]) => (
            <div className="factor" key={name} style={{ padding: '12px 2px' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <span className="flabel">{name}</span>
                <span className="fweight">{weight}</span>
              </div>
              <p className="finding" style={{ padding: '4px 0 0' }}>{desc}</p>
            </div>
          ))}
        </div>
        <p className="dim" style={{ marginTop: 14, fontSize: '0.92rem', maxWidth: 720 }}>
          Grades: <b className="mono">A ≥ 85 · B ≥ 70 · C ≥ 55 · D ≥ 40 · F &lt; 40</b>.
          Two overrides, both non-negotiable: an <b>announced shutdown</b> caps the score at 5
          (grade F — a death sentence is a death sentence), and a game whose shutdown date has
          passed scores 0 and moves to the Graveyard automatically.
        </p>
      </div>

      <div className="section">
        <h2>Where the data comes from</h2>
        <p className="dim" style={{ maxWidth: 720 }}>
          Every game, grave, rap-sheet entry, and store guide cites public sources — publisher
          announcements, Wikipedia’s shutdown records, news coverage, court filings. A daily
          pipeline harvests newly announced shutdowns for <b>human review</b> (never auto-merged)
          and moves expired games to the Graveyard. This build: dataset v{dataset.version}, updated{' '}
          {dataset.updated} ({source === 'remote' ? 'live' : 'bundled snapshot'}).
        </p>
        <p className="dim" style={{ maxWidth: 720 }}>
          Got a correction? Open a pull request or issue with a source — receipts win arguments.
          The grading engine is open too, so you can check the math on any grade.
        </p>
      </div>

      <div className="section">
        <h2>Privacy, in one paragraph</h2>
        <p className="dim" style={{ maxWidth: 720 }}>
          No account needed for anything. Your shelf lives in your browser. Optional sync encrypts
          it on your device with a key we never see — the server holds an unreadable blob. The Steam
          import is a stateless pass-through of your public profile. There is no analytics script on
          this site.
        </p>
      </div>
    </>
  );
}
