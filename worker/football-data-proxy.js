/**
 * Intermediario per football-data.org su Cloudflare Workers.
 *
 * Perché serve: football-data.org non accetta richieste dirette da una pagina web
 * (blocco CORS). Questo script riceve le richieste della dashboard, aggiunge il token
 * e le inoltra a football-data.org. Il token resta su Cloudflare e non arriva mai al browser.
 *
 * Impostazioni del Worker (Settings → Variables and Secrets):
 *   FD_TOKEN         (Secret, obbligatorio)  il tuo token di football-data.org
 *   ALLOWED_ORIGINS  (Text, facoltativo)     siti autorizzati, separati da virgola.
 *                                            Predefinito: https://fpuzzilli.github.io
 *
 * Accetta solo le due richieste usate dalla dashboard:
 *   /v4/competitions/SA/matches   (eventualmente ?matchday=N)
 *   /v4/competitions/SA/standings
 */

const UPSTREAM = 'https://api.football-data.org';
const ALLOWED_PATH = /^\/v4\/competitions\/SA\/(matches|standings)$/;
const CACHE_SECONDS = 30; // più visitatori nello stesso mezzo minuto = una sola richiesta a football-data.org

export default {
  async fetch(request, env, ctx) {
    const allowed = (env.ALLOWED_ORIGINS || 'https://fpuzzilli.github.io')
      .split(',').map(s => s.trim()).filter(Boolean);
    const origin = request.headers.get('Origin') || '';
    const okOrigin = allowed.includes(origin);

    const cors = {
      'Access-Control-Allow-Origin': okOrigin ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    const reply = (status, message) =>
      new Response(JSON.stringify({ message }), {
        status,
        headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
      });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return reply(405, 'Metodo non consentito');
    if (!okOrigin) return reply(403, 'Sito non autorizzato: aggiungilo in ALLOWED_ORIGINS');
    if (!env.FD_TOKEN) return reply(500, 'Manca il secret FD_TOKEN nelle impostazioni del Worker');

    const url = new URL(request.url);
    if (!ALLOWED_PATH.test(url.pathname)) return reply(404, 'Percorso non consentito');

    // unico parametro ammesso: matchday (numero)
    const params = new URLSearchParams();
    const md = url.searchParams.get('matchday');
    if (md !== null) {
      if (!/^\d{1,2}$/.test(md)) return reply(400, 'Giornata non valida');
      params.set('matchday', md);
    }
    const target = UPSTREAM + url.pathname + (params.toString() ? '?' + params : '');

    const cache = caches.default;
    const cacheKey = new Request(target, { method: 'GET' });
    let res = await cache.match(cacheKey);

    if (!res) {
      let up;
      try {
        up = await fetch(target, { headers: { 'X-Auth-Token': env.FD_TOKEN } });
      } catch (e) {
        return reply(502, 'football-data.org non raggiungibile');
      }
      res = new Response(up.body, up);
      res.headers.set('Cache-Control', `public, max-age=${CACHE_SECONDS}`);
      if (up.ok) ctx.waitUntil(cache.put(cacheKey, res.clone()));
    }

    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
    return out;
  },
};
