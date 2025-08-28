import { addonBuilder } from 'stremio-addon-sdk';
import manifest from './manifest.js';
import { getCache } from './cache.js';
import { findByImdb, getMovie, getTV, getEpisode, getSeason } from './tmdb.js';
import { translateWithGemini } from './translate.js';

const builder = new addonBuilder(manifest);

/**
 * Parse do ID para extrair IMDB ID, season e episode
 */
function parseId(id) {
  const parts = id.split(':');
  if (parts.length === 1) {
    return { imdbId: id };
  }
  if (parts.length >= 3) {
    return { 
      imdbId: parts[0], 
      season: parseInt(parts[1], 10), 
      episode: parseInt(parts[2], 10) 
    };
  }
  return { imdbId: parts[0] }; // fallback
}

/**
 * Handler principal para meta
 */
builder.defineMetaHandler(async (args) => {
  const { id, type, config } = args;
  const { imdbId, season, episode } = parseId(id);
  
  // Configuração do usuário (idioma e tom)
  const lang = (config && config.lang) || 'pt-BR';
  const tone = (config && config.tone) || 'natural';
  
  // Cache baseado no ID completo + idioma
  const cache = getCache();
  const cacheKey = `${id}|${lang}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return { meta: cached };
  }
  
  try {
    // 1. Mapear IMDB ID para TMDB ID
    const mapped = await findByImdb(imdbId);
    if (!mapped) {
      return { meta: null };
    }
    
    let baseMovie = null;
    let baseShow = null;
    let baseEpisode = null;
    let baseSeason = null;
    
    // 2. Buscar dados conforme o tipo
    if (mapped.type === 'movie' && type === 'movie') {
      // Filme: buscar no idioma alvo primeiro
      try {
        baseMovie = await getMovie(mapped.tmdbId, lang);
        if (!baseMovie.overview) {
          // Fallback para inglês se overview vazio
          baseMovie = await getMovie(mapped.tmdbId, 'en-US');
        }
      } catch (error) {
        console.error(`Erro ao buscar filme ${mapped.tmdbId}:`, error.message);
        return { meta: null };
      }
    } else if (mapped.type === 'tv' && type === 'series') {
      // Série: buscar dados da série primeiro
      try {
        baseShow = await getTV(mapped.tmdbId, lang);
        if (!baseShow.overview) {
          baseShow = await getTV(mapped.tmdbId, 'en-US');
        }
        
        // Se tem season e episode, buscar episódio específico
        if (season && episode) {
          try {
            baseEpisode = await getEpisode(mapped.tmdbId, season, episode, lang);
            if (!baseEpisode.overview) {
              baseEpisode = await getEpisode(mapped.tmdbId, season, episode, 'en-US');
            }
          } catch (episodeError) {
            console.warn(`Episódio ${season}x${episode} não encontrado, usando dados da série`);
            // Usar dados da série como fallback
          }
          
          // Se episódio ainda não tem overview, usar da série
          if (baseEpisode && !baseEpisode.overview && baseShow.overview) {
            baseEpisode.overview = baseShow.overview;
          }
        }
        
        // Se é apenas season (sem episode específico), buscar dados da temporada
        if (season && !episode) {
          try {
            baseSeason = await getSeason(mapped.tmdbId, season, lang);
            if (!baseSeason.overview) {
              baseSeason = await getSeason(mapped.tmdbId, season, 'en-US');
            }
          } catch (seasonError) {
            console.warn(`Temporada ${season} não encontrada, usando dados da série`);
          }
        }
      } catch (error) {
        console.error(`Erro ao buscar série ${mapped.tmdbId}:`, error.message);
        return { meta: null };
      }
    }
    
    // 3. Determinar dados finais e texto para tradução
    let finalOverview = '';
    let originalOverview = '';
    let finalTitle = '';
    let posterUrl = null;
    let backgroundUrl = null;
    let releaseInfo = '';
    let seasonNum = undefined;
    let episodeNum = undefined;
    let seriesName = undefined;
    
    if (baseMovie) {
      originalOverview = baseMovie.overview || '';
      finalTitle = baseMovie.title || 'Unknown Movie';
      posterUrl = baseMovie.poster;
      backgroundUrl = baseMovie.backdrop;
      releaseInfo = baseMovie.year;
    } else if (baseEpisode) {
      originalOverview = baseEpisode.overview || '';
      finalTitle = baseEpisode.title || `Episode ${episode}`;
      posterUrl = baseEpisode.still || baseShow?.poster;
      backgroundUrl = baseShow?.backdrop;
      releaseInfo = baseEpisode.airDate?.slice(0, 4) || baseShow?.year;
      seasonNum = season;
      episodeNum = episode;
      seriesName = baseShow?.title;
    } else if (baseSeason) {
      originalOverview = baseSeason.overview || '';
      finalTitle = baseSeason.title || `Season ${season}`;
      posterUrl = baseSeason.poster || baseShow?.poster;
      backgroundUrl = baseShow?.backdrop;
      releaseInfo = baseSeason.airDate?.slice(0, 4) || baseShow?.year;
      seasonNum = season;
      seriesName = baseShow?.title;
    } else if (baseShow) {
      originalOverview = baseShow.overview || '';
      finalTitle = baseShow.title || 'Unknown Series';
      posterUrl = baseShow.poster;
      backgroundUrl = baseShow.backdrop;
      releaseInfo = baseShow.year;
    }
    
    // 4. Traduzir se necessário
    if (!originalOverview) {
      finalOverview = ''; // Sem descrição disponível
    } else if (lang !== 'en-US') {
      // Traduzir se o idioma alvo não for inglês
      const translated = await translateWithGemini({ 
        text: originalOverview, 
        targetLang: lang, 
        tone 
      });
      finalOverview = translated || originalOverview;
    } else {
      // Se idioma alvo é inglês, usar texto original
      finalOverview = originalOverview;
    }
    
    // 5. Montar objeto meta
    const meta = {
      id: args.id,
      type,
      name: finalTitle,
      description: finalOverview,
      poster: posterUrl,
      background: backgroundUrl,
      posterShape: 'poster',
      releaseInfo: releaseInfo || undefined,
      season: seasonNum,
      episode: episodeNum,
      seriesName: seriesName || undefined
    };
    
    // Remover campos undefined
    Object.keys(meta).forEach(key => {
      if (meta[key] === undefined) {
        delete meta[key];
      }
    });
    
    // 6. Cache e retorno
    cache.set(cacheKey, meta);
    return { meta };
    
  } catch (error) {
    console.error(`Erro no handler meta para ${id}:`, error.message);
    return { meta: null };
  }
});

export default builder.getInterface();
