import photos from './photos.json' with { type: 'json' };

const reply = (body, status = 200) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store' }
});
const normalize = text => text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
  .trim().replace(/^(a|an|the) +/, '').replace(/ +/g, ' ');

// A match ID is a seed. Every worker can reproduce its three distinct photos.
async function photoForRound(id, round) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id));
  const words = new DataView(digest);
  const remaining = [...photos];
  for (let i = 0; i <= round; i++) {
    const position = words.getUint32(i * 4) % remaining.length;
    const [photo] = remaining.splice(position, 1);
    if (i === round) return photo;
  }
}

export async function handle(request) {
  if (request.method !== 'POST') return reply({error:'Use POST.'},405);
  const path = new URL(request.url).pathname;
  if (path === '/api/puzzles') return reply({id:crypto.randomUUID()},201);
  const route = path.match(/^\/api\/puzzles\/([a-f0-9-]{36})\/(tile|guess)$/);
  if (!route) return reply({error:'Unknown puzzle.'},404);
  let body;
  try { body = await request.json(); } catch { return reply({error:'Invalid request.'},400); }
  if (![0,1,2].includes(body?.round)) return reply({error:'Invalid round.'},400);
  const photo = await photoForRound(route[1],body.round);
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
