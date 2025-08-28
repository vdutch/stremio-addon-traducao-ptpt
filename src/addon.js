const { addonBuilder } = require('stremio-addon-sdk');
const manifest = require('./manifest.js');
const { getCache } = require('./cache.js');
const { findByImdb, getMovie, getTV, getEpisode, getSeason } = require('./tmdb.js');
const { translateWithGemini } = require('./translate.js');

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
    if (process.env.DEBUG_TRANSLATION === '1') console.log('[meta] cache HIT', cacheKey);
    return { meta: cached };
  }
  if (process.env.DEBUG_TRANSLATION === '1') console.log('[meta] cache MISS', cacheKey, 'lang=', lang, 'tone=', tone);
  
  try {
    // 1. Mapear IMDB ID para TMDB ID
  const mapped = await findByImdb(imdbId);
  if (process.env.DEBUG_TRANSLATION === '1') console.log('[meta] mapped imdb', imdbId, '->', mapped);
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
    // Se variável para sempre usar fonte EN estiver ativa, buscar overview em inglês para traduzir
    let sourceForTranslation = originalOverview;
    if (process.env.ALWAYS_SOURCE_EN === '1' && lang !== 'en-US') {
      try {
        if (baseMovie) {
          const enMovie = await getMovie(baseMovie.id, 'en-US');
          if (enMovie.overview) sourceForTranslation = enMovie.overview;
        } else if (baseEpisode) {
          const enEpisode = await getEpisode(baseShow.id, season, episode, 'en-US');
          if (enEpisode.overview) sourceForTranslation = enEpisode.overview;
        } else if (baseSeason) {
          const enSeason = await getSeason(baseShow.id, season, 'en-US');
          if (enSeason.overview) sourceForTranslation = enSeason.overview;
        } else if (baseShow) {
          const enShow = await getTV(baseShow.id, 'en-US');
            if (enShow.overview) sourceForTranslation = enShow.overview;
        }
        if (process.env.DEBUG_TRANSLATION === '1') console.log('[meta] ALWAYS_SOURCE_EN ativo; usando texto EN com len=', sourceForTranslation.length);
      } catch (e) {
        if (process.env.DEBUG_TRANSLATION === '1') console.log('[meta] Falha ao obter EN source', e.message);
      }
    }

    if (!sourceForTranslation) {
      finalOverview = ''; // Sem descrição disponível
    } else if (lang !== 'en-US') {
      // Traduzir se o idioma alvo não for inglês
      const translated = await translateWithGemini({ text: sourceForTranslation, targetLang: lang, tone });
      if (process.env.DEBUG_TRANSLATION === '1') console.log('[meta] tradução concluída tamanhoOrig=', sourceForTranslation.length, 'tamanhoTrad=', (translated||'').length);
      finalOverview = translated || sourceForTranslation;
    } else {
      // Se idioma alvo é inglês, usar texto original
      finalOverview = sourceForTranslation;
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
  if (process.env.DEBUG_TRANSLATION === '1') console.log('[meta] armazenado em cache', cacheKey);
    return { meta };
    
  } catch (error) {
    console.error(`Erro no handler meta para ${id}:`, error.message);
  if (process.env.DEBUG_TRANSLATION === '1' && error.stack) console.error(error.stack);
    return { meta: null };
  }
});

module.exports = builder.getInterface();
