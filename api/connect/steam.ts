import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Steam public-library proxy. GET /api/connect/steam?id=<vanity-or-steamid64>
 *
 * Reads the community profile's games XML (public data, no API key) and
 * returns { games: [{ appid, name }] }. Nothing is logged or stored; this
 * function exists only because the XML endpoint has no CORS headers.
 */

const XML_OPTS = { headers: { 'user-agent': 'KillSwitch/1.0 (+library survival grades)' } };

function profileUrl(id: string): string {
  // 17-digit numeric → steamid64 profile URL; anything else → vanity URL.
  const kind = /^\d{17}$/.test(id) ? 'profiles' : 'id';
  return `https://steamcommunity.com/${kind}/${encodeURIComponent(id)}/games?tab=all&xml=1`;
}

function parseGames(xml: string): { appid: number; name: string }[] {
  const games: { appid: number; name: string }[] = [];
  const gameRe = /<game>([\s\S]*?)<\/game>/g;
  let m: RegExpExecArray | null;
  while ((m = gameRe.exec(xml)) !== null) {
    const block = m[1];
    const appid = /<appID>(\d+)<\/appID>/.exec(block)?.[1];
    const name = /<name><!\[CDATA\[([\s\S]*?)\]\]><\/name>/.exec(block)?.[1]
      ?? /<name>([\s\S]*?)<\/name>/.exec(block)?.[1];
    if (appid && name) games.push({ appid: Number(appid), name: name.trim() });
  }
  return games;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('cache-control', 'no-store');

  const id = typeof req.query.id === 'string' ? req.query.id.trim() : '';
  if (!id || id.length > 100 || !/^[\w.-]+$/.test(id)) {
    res.status(400).json({ error: 'Provide your Steam vanity name or 17-digit SteamID64, e.g. ?id=gabelogannewell.' });
    return;
  }

  let xml: string;
  try {
    const upstream = await fetch(profileUrl(id), XML_OPTS);
    if (!upstream.ok) {
      res.status(502).json({ error: `Steam answered ${upstream.status} — try again in a minute.` });
      return;
    }
    xml = await upstream.text();
  } catch {
    res.status(502).json({ error: 'Could not reach Steam. Try again in a minute.' });
    return;
  }

  if (/The specified profile could not be found/i.test(xml)) {
    res.status(404).json({ error: 'No Steam profile with that name or ID. Check the spelling — it’s the name in your profile URL, not your display name.' });
    return;
  }

  const games = parseGames(xml);
  if (games.length === 0) {
    // Private profiles and private game details both come back gameless.
    res.status(403).json({
      error:
        'That profile exists but its game list isn’t public. In Steam: Profile → Edit Profile → Privacy Settings → set "Game details" to Public, then retry. You can flip it back afterwards.',
    });
    return;
  }

  res.status(200).json({ games });
}
