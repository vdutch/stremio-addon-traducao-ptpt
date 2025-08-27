import { CONFIG } from './config.js';
import { translate } from './translator.js';
import { applyGlossary } from './glossary.js';

// Cache simples em memória
const remoteState = {
  manifests: new Map(), // url -> manifest
  catalogs: new Map(), // key -> { metas, ts }
  meta: new Map() // idKey -> { meta, ts }
};

function cacheGet(map, key, maxAgeMs) {
  const v = map.get(key);
  if (!v) return null;
  if (Date.now() - v.ts > maxAgeMs) { map.delete(key); return null; }
  return v.value;
}
function cacheSet(map, key, value) { map.set(key, { value, ts: Date.now() }); }

async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url} ${r.status}`);
  return r.json();
}

export async function loadRemoteManifests() {
  await Promise.all(CONFIG.REMOTE_ADDONS.map(async (url) => {
    try {
      const manifest = await fetchJSON(url);
      cacheSet(remoteState.manifests, url, manifest);
    } catch (e) {
      // ignore individual failures
    }
  }));
}

export function listRemoteCatalogs() {
  const catalogs = [];
  for (const m of remoteState.manifests.values()) {
    if (m.catalogs) catalogs.push(...m.catalogs.map(c => ({...c, _origin: m.id })));
  }
  return catalogs;
}

function buildCatalogURL(base, c, params={}) {
  // base manifest url -> root (strip everything after last slash)
  const root = base.replace(/manifest\.json.*/, '');
  const qs = new URLSearchParams(params).toString();
  return `${root}catalog/${c.type}/${c.id}.json${qs ? `?${qs}` : ''}`;
}

export async function fetchRemoteCatalogMerged({ type, search, genre }) {
  const maxAge = CONFIG.REMOTE_REFRESH_SEC * 1000;
  const cacheKey = `merged:${type}:${search || ''}:${genre || ''}`;
  const cached = cacheGet(remoteState.catalogs, cacheKey, maxAge);
  if (cached) return cached;

  const metas = [];
  for (const [url, manifest] of remoteState.manifests.entries()) {
    const cands = (manifest.catalogs || []).filter(c => c.type === type);
    for (const c of cands) {
      try {
        const fullUrl = buildCatalogURL(url, c, search ? { search } : {});
        const json = await fetchJSON(fullUrl);
        if (json && Array.isArray(json.metas)) metas.push(...json.metas);
      } catch (e) {
        // ignore
      }
    }
  }
  // Filtro por genero se aplicável
  const filtered = genre ? metas.filter(m => (m.genres||[]).some(g => g.toLowerCase() === genre.toLowerCase())) : metas;
  cacheSet(remoteState.catalogs, cacheKey, filtered);
  return filtered;
}

export async function translateMetas(metas, lang) {
  return Promise.all(metas.map(async m => {
    try {
      const name = applyGlossary(await translate(m.name, lang));
      const description = applyGlossary(await translate(m.description || '', lang));
      return { ...m, name, description };
    } catch (e) {
      return m; // fallback original
    }
  }));
}

export async function fetchRemoteMeta(id, type, lang) {
  const maxAge = CONFIG.REMOTE_REFRESH_SEC * 1000;
  const cacheKey = `${id}:${type}`;
  const cached = cacheGet(remoteState.meta, cacheKey, maxAge);
  if (cached) return cached;
  // brute force: tentar cada manifest meta endpoint
  for (const [url, manifest] of remoteState.manifests.entries()) {
    const root = url.replace(/manifest\.json.*/, '');
    try {
      const metaUrl = `${root}meta/${type}/${encodeURIComponent(id)}.json`;
      const json = await fetchJSON(metaUrl);
      if (json && json.meta) {
        const name = applyGlossary(await translate(json.meta.name, lang));
        const description = applyGlossary(await translate(json.meta.description || '', lang));
        const out = { ...json.meta, name, description };
        cacheSet(remoteState.meta, cacheKey, out);
        return out;
      }
    } catch (e) {
      // continue
    }
  }
  return null;
}

// Inicializa em background
loadRemoteManifests();
setInterval(loadRemoteManifests, CONFIG.REMOTE_REFRESH_SEC * 1000).unref();
