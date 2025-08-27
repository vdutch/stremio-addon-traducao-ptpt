import express from 'express';
import { addonBuilder } from 'stremio-addon-sdk';
import { translate } from './translator.js';
import { sampleCatalog, findMetaById } from './sampleCatalog.js';
import { aggregatedTrending, aggregatedSearch } from './aggregator.js';
import { addToWatchlist, removeFromWatchlist, getWatchlist } from './watchlist.js';
import { CONFIG } from './config.js';
import { applyGlossary } from './glossary.js';

const PORT = CONFIG.PORT;
const TARGET_LANG = CONFIG.TARGET_LANG;
const NAME = 'Catálogo Traduzido PT-BR (Agregado)';

// Manifesto do add-on
const manifest = {
  id: 'org.stremio.catalogo-traduzido-ptbr',
  version: '0.2.0',
  name: NAME,
  description: 'Proxy de catálogo que traduz títulos e sinopses para PT-BR em tempo real (com cache).',
  types: ['movie', 'series'],
  catalogs: [
    { type: 'movie', id: 'trad-movies', name: 'Filmes (Traduzido)' },
    { type: 'series', id: 'trad-series', name: 'Séries (Traduzido)' },
    { type: 'movie', id: 'trad-trending', name: 'Filmes Trending (Agregado)' },
    { type: 'series', id: 'trad-trending-series', name: 'Séries Trending (Agregado)' }
  ],
  resources: ['catalog', 'meta'],
  idPrefixes: ['tt'],
  behaviorHints: {
    configurable: true
  }
};

const builder = new addonBuilder(manifest);

// Handler de catálogo
builder.defineCatalogHandler(async ({ type, id, extra }) => {
  let items = [];
  if (id === 'trad-movies' || id === 'trad-series') {
    items = sampleCatalog.filter(i => i.type === type);
  } else if (id.startsWith('trad-trending')) {
    items = await aggregatedTrending(type);
  }
  // Busca
  if (extra && extra.search) {
    items = await aggregatedSearch(extra.search, type);
  }
  // Filtros simples
  if (extra && extra.genre) {
    items = items.filter(i => (i.genres||[]).map(g=>g.toLowerCase()).includes(extra.genre.toLowerCase()));
  }
  if (extra && extra.year) {
    items = items.filter(i => String(i.year) === String(extra.year));
  }

  const metas = await Promise.all(items.slice(0, 100).map(async item => {
    const name = applyGlossary(await translate(item.name, TARGET_LANG));
    const description = applyGlossary(await translate(item.description || '', TARGET_LANG));
    const badges = [];
    if (item.popularity && item.popularity > 50) badges.push('Em Alta');
    if (item.year && Number(item.year) >= new Date().getFullYear() - 1) badges.push('Novo');
    return {
      id: item.id,
      type: item.type,
      name,
      poster: item.poster,
      posterShape: 'regular',
      description,
      genres: item.genres,
      year: item.year,
      tagline: badges.join(' | '),
      imdbRating: item.rating || null
    };
  }));
  return { metas };
});

// Handler de meta
builder.defineMetaHandler(async ({ type, id }) => {
  // Tenta sample primeiro
  let base = findMetaById(id);
  if (!base) {
    // fallback: buscar em agregação rápida (trending + search pelo id parte do nome)
    const all = [...await aggregatedTrending('movie'), ...await aggregatedTrending('series')];
    base = all.find(i => i.id === id);
  }
  if (!base) return { meta: null };
  const name = applyGlossary(await translate(base.name, TARGET_LANG));
  const description = applyGlossary(await translate(base.description || '', TARGET_LANG));
  const meta = {
    id: base.id,
    type: base.type,
    name,
    description,
    genres: base.genres,
    poster: base.poster,
    background: base.poster,
    logo: base.poster,
    releaseInfo: String(base.year || ''),
    year: base.year,
    imdbRating: base.rating || null
  };
  return { meta };
});

// Express server para entregar o add-on JSON
const app = express();

// CORS headers para compatibilidade Stremio
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Root -> manifesto
app.get('/', (req, res) => { res.json(manifest); });

// Endpoint padrão /manifest.json (Stremio costuma buscar)
app.get('/manifest.json', (req, res) => { res.json(manifest); });

// Endpoint catálogo manual (alternativo) - /catalog/:type/:id.json
app.get('/catalog/:type/:id.json', async (req, res) => {
  try {
    const { type, id } = req.params;
    const extra = { search: req.query.search, genre: req.query.genre, year: req.query.year };
    const result = await builder.get({ resource: 'catalog', type, id, extra });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Endpoint meta - /meta/:type/:id.json
app.get('/meta/:type/:id.json', async (req, res) => {
  try {
    const { type, id } = req.params;
    const result = await builder.get({ resource: 'meta', type, id });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Endpoint oficial de add-on (compat Stremio) - /stremio/v1 - utiliza handler do SDK
app.get('/stremio/v1/:resource/:type/:id.json', async (req, res) => {
  try {
    const { resource, type, id } = req.params;
    const extra = { search: req.query.search, genre: req.query.genre, year: req.query.year };
    const result = await builder.get({ resource, type, id, extra });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Watchlist endpoints (in-memory demo)
app.post('/user/:userId/watchlist/:id', (req, res) => {
  addToWatchlist(req.params.userId, req.params.id);
  res.json({ ok: true, list: getWatchlist(req.params.userId) });
});
app.delete('/user/:userId/watchlist/:id', (req, res) => {
  removeFromWatchlist(req.params.userId, req.params.id);
  res.json({ ok: true, list: getWatchlist(req.params.userId) });
});
app.get('/user/:userId/watchlist', (req, res) => {
  res.json({ list: getWatchlist(req.params.userId) });
});

// Health & metrics simples
app.get('/health', (req, res) => res.json({ status: 'ok', time: Date.now() }));

// Proxy leve de imagem (placeholder; para produção adicionar cache, resize via sharp se instalado)
app.get('/img', async (req, res) => {
  if (!CONFIG.ENABLE_IMAGE_PROXY) return res.status(404).end();
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'url param required' });
  try {
    const r = await fetch(url);
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', r.headers.get('content-type') || 'image/jpeg');
    res.send(buf);
  } catch (e) { res.status(500).json({ error: 'fetch_failed' }); }
});

app.listen(PORT, () => { console.log(`Add-on Tradução PT-BR rodando em http://localhost:${PORT}`); });

export default app;
