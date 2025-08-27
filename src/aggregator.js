import { sampleCatalog } from './sampleCatalog.js';
import { fetchTrending, searchTmdb } from './aggregators/tmdb.js';
import { searchOmdb } from './aggregators/omdb.js';

// Normalização e deduplicação com base em imdbId prioritariamente
export function dedupe(items) {
  const map = new Map();
  for (const it of items) {
    const key = it.imdbId || it.name.toLowerCase();
    if (!map.has(key)) map.set(key, it);
    else {
      // Enriquecer se existente
      const current = map.get(key);
      map.set(key, { ...current, ...it, externalIds: { ...(current.externalIds||{}), ...(it.externalIds||{}) } });
    }
  }
  return Array.from(map.values());
}

export async function aggregatedTrending(type='movie') {
  const base = sampleCatalog.filter(i => i.type === type).map(i => ({
    source: 'local',
    id: i.id,
    imdbId: i.id.startsWith('tt') ? i.id : null,
    type: i.type,
    name: i.name,
    description: i.description,
    poster: i.poster,
    year: i.year,
    genres: i.genres || [],
    originalLanguage: 'en'
  }));
  const tmdb = await fetchTrending(type).catch(()=>[]);
  const merged = dedupe([...base, ...tmdb]);
  return merged;
}

export async function aggregatedSearch(query, type='movie') {
  const lc = query.toLowerCase();
  const local = sampleCatalog.filter(i => i.type===type && (i.name.toLowerCase().includes(lc) || i.description.toLowerCase().includes(lc))).map(i => ({
    source: 'local', id: i.id, imdbId: i.id.startsWith('tt')?i.id:null, type: i.type, name: i.name, description: i.description, poster: i.poster, year: i.year, genres: i.genres, originalLanguage: 'en'
  }));
  const tmdb = await searchTmdb(query, type).catch(()=>[]);
  const omdb = await searchOmdb(query, type).catch(()=>[]);
  const merged = dedupe([...local, ...tmdb, ...omdb]);
  return merged;
}
