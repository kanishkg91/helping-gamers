import { href } from '../router';
import { SearchBox } from '../components/SearchBox';

export function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <h1 style={{ fontSize: '3rem' }}>404</h1>
      <p className="dim" style={{ maxWidth: 460, margin: '10px auto 26px' }}>
        This page doesn’t exist. Unlike the games in our Graveyard, it never did.
      </p>
      <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'left' }}>
        <SearchBox placeholder="Search for a game instead…" />
      </div>
      <p style={{ marginTop: 22 }}>
        <a className="btn" href={href('/')}>← Back home</a>
      </p>
    </div>
  );
}
