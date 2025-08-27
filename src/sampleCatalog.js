// Catálogo de exemplo simples (normalmente viria de outro add-on ou API)
// Apenas alguns itens demonstrativos
export const sampleCatalog = [
  {
    id: 'tt0133093',
    type: 'movie',
    name: 'The Matrix',
    description: 'A computer hacker learns about the true nature of his reality and his role in the war against its controllers.',
    genres: ['Action', 'Sci-Fi'],
    poster: 'https://image.tmdb.org/t/p/w342/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    year: 1999
  },
  {
    id: 'tt0234215',
    type: 'movie',
    name: 'The Matrix Reloaded',
    description: 'Neo and the rebel leaders estimate they have 72 hours until 250,000 probes discover Zion and destroy it.',
    genres: ['Action', 'Sci-Fi'],
    poster: 'https://image.tmdb.org/t/p/w342/9DGjiTAkCvnPlkkXn4tPkjaaviC.jpg',
    year: 2003
  },
  {
    id: 'tt0903747',
    type: 'series',
    name: 'Breaking Bad',
    description: 'A high school chemistry teacher turned methamphetamine producer navigates the dangers of the criminal underworld.',
    genres: ['Crime', 'Drama', 'Thriller'],
    poster: 'https://image.tmdb.org/t/p/w342/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
    year: 2008
  }
];

export function findMetaById(id) {
  return sampleCatalog.find(i => i.id === id);
}
