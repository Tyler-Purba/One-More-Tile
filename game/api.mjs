import photos from './photos.json' with { type: 'json' };

const reply = (body, status = 200) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store' }
});
const normalize = text => text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
  .trim().replace(/^(a|an|the) +/, '').replace(/ +/g, ' ');

export async function handle(request, db) {
  if (request.method !== 'POST') return reply({error:'Use POST.'},405);
  const path = new URL(request.url).pathname;
  await db.prepare('CREATE TABLE IF NOT EXISTS puzzle_decks (id TEXT PRIMARY KEY, deck TEXT NOT NULL)').run();
  if (path === '/api/puzzles') {
    const bag = photos.map((_, index) => index);
    const deck = [4,8,16].map(() => bag.splice(Math.floor(Math.random()*bag.length),1)[0]);
    const id = crypto.randomUUID();
    await db.prepare('INSERT INTO puzzle_decks VALUES (?,?)').bind(id,JSON.stringify(deck)).run();
    return reply({id},201);
  }
  const route = path.match(/^\/api\/puzzles\/([a-f0-9-]{36})\/(tile|guess)$/);
  if (!route) return reply({error:'Unknown puzzle.'},404);
  let body;
  try { body = await request.json(); } catch { return reply({error:'Invalid request.'},400); }
  if (![0,1,2].includes(body?.round)) return reply({error:'Invalid round.'},400);
  const row = await db.prepare('SELECT deck FROM puzzle_decks WHERE id=?').bind(route[1]).first();
  if (!row) return reply({error:'Game not found. Start a new match.'},404);
  const photo = photos[JSON.parse(row.deck)[body.round]];
  if (route[2] === 'tile') {
    const grid = photo.grids[4 << body.round];
    if (!Number.isInteger(body.tile) || body.tile < 0 || body.tile >= grid.length)
      return reply({error:'Choose a tile on the board.'},400);
    return reply({image:grid[body.tile]});
  }
  if (typeof body.text !== 'string' || body.text.length > 80 || !normalize(body.text))
    return reply({error:'Enter a guess of up to 80 characters.'},400);
  if (!photo.answers.includes(normalize(body.text))) return reply({correct:false});
  return reply({correct:true,answer:photo.answers[0],full:photo.full,credit:'https://www.pexels.com/photo/'+photo.id+'/'});
}
