// Budget Cycle Challenge - live game server (no npm install needed)
const http = require('http'), fs = require('fs'), path = require('path');
const Q = JSON.parse(fs.readFileSync(path.join(__dirname, 'questions.json'), 'utf8'));
const SRC = { BBM: 'Barangay Budgeting Manual 2026', IRR: 'RA 12009 (IRR)', COA: 'COA Manual on Financial Management', LGC: 'Local Government Code 1991' };
const PORT = process.env.PORT || 3000;
const PIN = process.env.GM_PIN || String(1000 + Math.floor(Math.random() * 9000));

function fresh() { return { phase: 'setup', regOpen: false, gid: String(Date.now()), order: [], perms: [], sources: [], idx: 0, dur: 20, qStart: 0, players: {}, timer: null }; }
let G = fresh();
const clients = new Set();

const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ranked = () => Object.values(G.players).sort((a, b) => b.score - a.score || a.tm - b.tm);
const clean = s => String(s || '').replace(/[<>]/g, '').trim().slice(0, 40);

const row = (p, i) => ({ rank: i + 1, name: p.name, barangay: p.barangay, position: p.position, score: p.score });
function snapshot() {
  const r = ranked(), v = { phase: G.phase, regOpen: G.regOpen, total: G.order.length, idx: G.idx, dur: G.dur, count: r.length };
  if (G.phase === 'setup') v.sources = Object.keys(SRC).map(id => ({ id, name: SRC[id], count: Q.filter(x => x.src === id).length }));
  if (G.phase !== 'setup') v.selSrc = G.sources.map(id => SRC[id]);
  if (G.phase === 'question' || G.phase === 'reveal') {
    const q = Q[G.order[G.idx]], pm = G.perms[G.idx];
    v.q = { c: q.c, t: q.q, o: pm.map(i => q.o[i]), src: SRC[q.src] };
    v.left = Math.max(0, G.dur * 1000 - (Date.now() - G.qStart));
    let n = 0; const counts = [0, 0, 0, 0];
    for (const p of r) { const a = p.answers[G.idx]; if (a) { n++; counts[a.k]++; } }
    v.answered = n;
    if (G.phase === 'reveal') v.reveal = { correct: pm.indexOf(0), e: q.e, s: q.s, counts };
  }
  if (G.phase === 'final') v.top = r.slice(0, 10).map(row);
  const gm = Object.assign({}, v);
  if (G.phase === 'lobby') gm.roster = r.map(row);
  if (G.phase === 'reveal') gm.top = r.slice(0, 5).map(row);
  if (G.phase === 'final') gm.all = r.map(row);
  const rankOf = new Map(r.map((p, i) => [p, i + 1]));
  return { sharedStr: JSON.stringify(v), gmStr: JSON.stringify(gm), rankOf };
}
function msgFor(c, s) {
  if (c.role === 'gm') return s.gmStr;
  const p = G.players[c.id];
  if (!p) return s.sharedStr;
  const a = p.answers[G.idx];
  return s.sharedStr.slice(0, -1) + ',"me":' + JSON.stringify({ name: p.name, score: p.score, rank: s.rankOf.get(p), answered: !!a, k: a ? a.k : null, pts: a ? a.pts : 0 }) + '}';
}
let pending = null;
function flush() {
  if (pending) { clearTimeout(pending); pending = null; }
  const s = snapshot();
  for (const c of clients) { try { c.res.write('data: ' + msgFor(c, s) + '\n\n'); } catch (e) { clients.delete(c); } }
}
// Joins and answers are batched (one update per 300 ms) so 300+ players stay fast.
function broadcast(now) { if (now) return flush(); if (!pending) pending = setTimeout(flush, 300); }
function startQuestion() {
  G.phase = 'question'; G.qStart = Date.now();
  clearTimeout(G.timer); G.timer = setTimeout(reveal, G.dur * 1000 + 400);
}
function reveal() { if (G.phase !== 'question') return; clearTimeout(G.timer); G.phase = 'reveal'; broadcast(true); }
function csv() {
  let s = 'Rank,Name,Barangay,Position,Score\n';
  ranked().forEach((p, i) => { s += [i + 1, p.name, p.barangay, p.position, p.score].map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',') + '\n'; });
  return s;
}
function finish() {
  G.phase = 'final'; clearTimeout(G.timer);
  try { fs.writeFileSync(path.join(__dirname, 'results-' + G.gid + '.csv'), '\ufeff' + csv()); } catch (e) {}
}

function body(req) { return new Promise(ok => { let b = ''; req.on('data', d => { b += d; if (b.length > 1e5) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { ok({}); } }); }); }
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'), p = u.pathname;
  if (req.method === 'GET' && (p === '/' || p === '/gm')) {
    const f = path.join(__dirname, 'public', p === '/' ? 'index.html' : 'gm.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(fs.readFileSync(f));
  }
  if (p === '/events') {
    const role = u.searchParams.get('role') === 'gm' ? 'gm' : 'player';
    if (role === 'gm' && u.searchParams.get('pin') !== PIN) { res.writeHead(403); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
    const c = { res, role, id: u.searchParams.get('id') || '' };
    clients.add(c);
    res.write('data: ' + msgFor(c, snapshot()) + '\n\n');
    const ka = setInterval(() => { try { res.write(': ka\n\n'); } catch (e) {} }, 15000);
    req.on('close', () => { clearInterval(ka); clients.delete(c); });
    return;
  }
  if (p === '/api/join' && req.method === 'POST') {
    const b = await body(req), id = clean(b.id);
    if (G.phase === 'setup' || !G.regOpen) return send(res, 400, { error: 'Registration is closed.' });
    const name = clean(b.name), barangay = clean(b.barangay), position = clean(b.position);
    if (!id || !name || !barangay) return send(res, 400, { error: 'Enter your name and barangay.' });
    G.players[id] = G.players[id] || { name, barangay, position, score: 0, tm: 0, answers: {} };
    Object.assign(G.players[id], { name, barangay, position });
    send(res, 200, { ok: 1 }); return broadcast();
  }
  if (p === '/api/answer' && req.method === 'POST') {
    const b = await body(req), pl = G.players[clean(b.id)], k = b.k;
    if (!pl || G.phase !== 'question' || ![0, 1, 2, 3].includes(k) || pl.answers[G.idx]) return send(res, 400, { error: 'Not accepted.' });
    const el = Date.now() - G.qStart, ms = G.dur * 1000;
    if (el > ms + 600) return send(res, 400, { error: 'Too late.' });
    const ok = G.perms[G.idx][k] === 0, pts = ok ? 500 + Math.round(500 * Math.max(0, 1 - el / ms)) : 0;
    pl.answers[G.idx] = { k, ms: el, pts }; pl.score += pts; if (ok) pl.tm += el;
    send(res, 200, { ok: 1 });
    if (Object.values(G.players).every(x => x.answers[G.idx])) reveal(); else broadcast();
    return;
  }
  if (p.startsWith('/api/gm/')) {
    const b = req.method === 'POST' ? await body(req) : {};
    if ((b.pin || u.searchParams.get('pin')) !== PIN) return send(res, 403, { error: 'Wrong PIN.' });
    const act = p.slice(8);
    if (act === 'check') return send(res, 200, { ok: 1 });
    if (act === 'csv') { res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename=budget-game-results.csv' }); return res.end('\ufeff' + csv()); }
    if (act === 'open') {
      const sel = (Array.isArray(b.sources) ? b.sources : []).filter(id => SRC[id]);
      if (!sel.length) return send(res, 400, { error: 'Select at least one source.' });
      const pools = sel.map(id => shuffle(Q.map((x, i) => x.src === id ? i : -1).filter(i => i >= 0)));
      const total = pools.reduce((a, p) => a + p.length, 0);
      const nq = Math.min(total, Math.max(1, parseInt(b.nq, 10) || 12)), dur = Math.min(120, Math.max(5, parseInt(b.dur, 10) || 20));
      const order = []; // balanced: take turns across the selected sources
      for (let k = 0; order.length < nq; k++) for (const p of pools) { if (k < p.length && order.length < nq) order.push(p[k]); }
      G = fresh(); G.phase = 'lobby'; G.regOpen = true; G.dur = dur; G.sources = sel;
      G.order = shuffle(order); G.perms = G.order.map(() => shuffle([0, 1, 2, 3]));
    } else if (act === 'start') { G.regOpen = false; G.idx = 0; startQuestion(); }
    else if (act === 'reveal') reveal();
    else if (act === 'next') { if (G.phase === 'reveal') { if (G.idx >= G.order.length - 1) finish(); else { G.idx++; startQuestion(); } } }
    else if (act === 'reset') { clearTimeout(G.timer); G = fresh(); }
    send(res, 200, { ok: 1 }); return broadcast(true);
  }
  res.writeHead(404); res.end('Not found');
}).listen(PORT, () => {
  console.log('\n=== Budget Cycle Challenge ===');
  console.log('Server running on port ' + PORT);
  console.log('GM PIN: ' + PIN);
  console.log('Game Master page (local):  http://localhost:' + PORT + '/gm?pin=' + PIN);
  console.log('\nNext: in a SECOND window run   ngrok http ' + PORT);
  console.log('Then open  https://YOUR-NGROK-ADDRESS/gm?pin=' + PIN + '  on your laptop.\n');
});
