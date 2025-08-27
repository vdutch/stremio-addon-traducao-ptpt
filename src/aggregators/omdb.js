import axios from 'axios';
import { CONFIG } from '../config.js';

const OMDB_BASE = 'https://www.omdbapi.com/';

function mapItem(i) {
  return {
    source: 'omdb',
    id: `omdb_${i.imdbID}`,
    externalIds: { imdb: i.imdbID },
    imdbId: i.imdbID,
    type: i.Type === 'series' ? 'series' : 'movie',
    name: i.Title,
    description: i.Plot || '',
    poster: i.Poster && i.Poster !== 'N/A' ? i.Poster : null,
    year: i.Year ? i.Year.slice(0,4) : null,
    originalLanguage: 'en',
    popularity: null,
    rating: i.imdbRating && i.imdbRating !== 'N/A' ? Number(i.imdbRating) : null,
    genres: i.Genre ? i.Genre.split(',').map(g=>g.trim()) : [],
    runtime: i.Runtime && i.Runtime !== 'N/A' ? i.Runtime : null,
    trailers: [],
    cast: i.Actors ? i.Actors.split(',').map(c=>c.trim()) : []
  };
}

export async function searchOmdb(query, type = 'movie', page = 1) {
  if (!CONFIG.OMDB_API_KEY) return [];
  const { data } = await axios.get(OMDB_BASE, { params: { apikey: CONFIG.OMDB_API_KEY, s: query, type: type === 'series' ? 'series' : 'movie', page } });
  if (!data.Search) return [];
  const detailed = await Promise.all(data.Search.slice(0,5).map(async b => {
    const { data: full } = await axios.get(OMDB_BASE, { params: { apikey: CONFIG.OMDB_API_KEY, i: b.imdbID, plot: 'short' } });
    return mapItem(full);
  }));
  return detailed;
}
