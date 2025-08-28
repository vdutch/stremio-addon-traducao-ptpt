const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

function buildHeaders() {
  const v4Bearer = process.env.TMDB_BEARER;
  return v4Bearer ? { Authorization: `Bearer ${v4Bearer}` } : {};
}

async function doFetch(path, params = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  
  if (!process.env.TMDB_API_KEY && !process.env.TMDB_BEARER) {
    throw new Error('TMDB_API_KEY ou TMDB_BEARER é obrigatório');
  }
  
  // Se não usar Bearer v4, usa api_key v3
  if (!process.env.TMDB_BEARER) {
    url.searchParams.set('api_key', process.env.TMDB_API_KEY);
  }
  
  // Adicionar parâmetros
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, v);
    }
  });
  
  let res = await fetch(url.toString(), { headers: buildHeaders() });
  
  // Retry simples para 429 (rate limit)
  if (res.status === 429) {
    await new Promise(resolve => setTimeout(resolve, 500));
    res = await fetch(url.toString(), { headers: buildHeaders() });
  }
  
  if (!res.ok) {
    throw new Error(`TMDB ${path} retornou ${res.status}`);
  }
  
  return res.json();
}

/**
 * Encontra TMDB ID usando IMDB ID
 */
async function findByImdb(imdbId) {
  const data = await doFetch(`/find/${imdbId}`, { external_source: 'imdb_id' });
  
  if (data.movie_results && data.movie_results.length > 0) {
    return { type: 'movie', tmdbId: data.movie_results[0].id };
  }
  
  if (data.tv_results && data.tv_results.length > 0) {
    return { type: 'tv', tmdbId: data.tv_results[0].id };
  }
  
  return null;
}

/**
 * Busca dados de filme
 */
async function getMovie(tmdbId, language = 'en-US') {
  const data = await doFetch(`/movie/${tmdbId}`, { language });
  return normalizeMovie(data);
}

/**
 * Busca dados de série/TV
 */
async function getTV(tmdbId, language = 'en-US') {
  const data = await doFetch(`/tv/${tmdbId}`, { language });
  return normalizeTV(data);
}

/**
 * Busca dados de episódio específico
 */
async function getEpisode(tmdbId, season, episode, language = 'en-US') {
  const data = await doFetch(`/tv/${tmdbId}/season/${season}/episode/${episode}`, { language });
  return normalizeEpisode(data);
}

/**
 * Busca dados de temporada (opcional)
 */
async function getSeason(tmdbId, season, language = 'en-US') {
  const data = await doFetch(`/tv/${tmdbId}/season/${season}`, { language });
  return normalizeSeason(data);
}

function normalizeMovie(data) {
  return {
    kind: 'movie',
    id: data.id,
    title: data.title || data.original_title,
    overview: data.overview || '',
    poster: data.poster_path ? `${IMG_BASE}/w500${data.poster_path}` : null,
    backdrop: data.backdrop_path ? `${IMG_BASE}/w780${data.backdrop_path}` : null,
    year: (data.release_date || '').slice(0, 4),
    releaseDate: data.release_date || ''
  };
}

function normalizeTV(data) {
  return {
    kind: 'tv',
    id: data.id,
    title: data.name || data.original_name,
    overview: data.overview || '',
    poster: data.poster_path ? `${IMG_BASE}/w500${data.poster_path}` : null,
    backdrop: data.backdrop_path ? `${IMG_BASE}/w780${data.backdrop_path}` : null,
    year: (data.first_air_date || '').slice(0, 4),
    firstAirDate: data.first_air_date || ''
  };
}

function normalizeEpisode(data) {
  return {
    kind: 'episode',
    id: data.id,
    title: data.name,
    overview: data.overview || '',
    still: data.still_path ? `${IMG_BASE}/w300${data.still_path}` : null,
    airDate: data.air_date || '',
    season: data.season_number,
    episode: data.episode_number
  };
}

function normalizeSeason(data) {
  return {
    kind: 'season',
    id: data.id,
    title: data.name,
    overview: data.overview || '',
    poster: data.poster_path ? `${IMG_BASE}/w500${data.poster_path}` : null,
    airDate: data.air_date || '',
    season: data.season_number
  };
}

module.exports = { findByImdb, getMovie, getTV, getEpisode, getSeason };
