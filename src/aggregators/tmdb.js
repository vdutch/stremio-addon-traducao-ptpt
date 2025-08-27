import axios from 'axios';
import { CONFIG } from '../config.js';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/w342';

function mapItem(i, type) {
  return {
    source: 'tmdb',
    id: `tmdb_${type}_${i.id}`,
    externalIds: { tmdb: i.id },
    imdbId: i.imdb_id || i.imdbID || null,
    type,
    name: i.title || i.name,
    description: i.overview || '',
    poster: i.poster_path ? `${IMG_BASE}${i.poster_path}` : null,
    year: (i.release_date || i.first_air_date || '').split('-')[0] || null,
    originalLanguage: i.original_language,
    popularity: i.popularity,
    rating: i.vote_average ? Number(i.vote_average) : null,
    genres: [],
    runtime: i.runtime || null,
    trailers: [],
    cast: []
  };
}

export async function fetchTrending(type = 'movie', page = 1) {
  if (!CONFIG.TMDB_API_KEY) return [];
  const url = `${TMDB_BASE}/trending/${type}/week`;
  const { data } = await axios.get(url, { params: { api_key: CONFIG.TMDB_API_KEY, page } });
  return (data.results || []).map(r => mapItem(r, type));
}

export async function searchTmdb(query, type = 'movie', page = 1) {
  if (!CONFIG.TMDB_API_KEY) return [];
  const url = `${TMDB_BASE}/search/${type}`;
  const { data } = await axios.get(url, { params: { api_key: CONFIG.TMDB_API_KEY, query, page, include_adult: false, language: 'en-US' } });
  return (data.results || []).map(r => mapItem(r, type));
}
