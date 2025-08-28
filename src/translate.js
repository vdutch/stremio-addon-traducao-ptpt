const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getCache } = require('./cache.js');

/**
 * Heurística simples para detectar se texto já está no idioma alvo
 */
function isLikelyInTargetLang(text, targetLang) {
  if (!text) return false;
  const lower = text.toLowerCase();

  // Atalho: presença de caracteres acentuados comuns em pt/es/fr
  const hasAccents = /[áéíóúàâêôãõçñùûüœ]/i.test(lower);

  if (targetLang.startsWith('pt')) {
    // Requer pelo menos 3 tokens portugueses distintos para reduzir falso positivo
    const tokens = [
      /\bque\b/, /\bpara\b/, /\bcomo\b/, /\bessa?\b/, /\buma\b/, /\bum\b/, /\bnão\b/, /\bmais\b/, /\bentre\b/, /\bseus?\b/
    ];
    const matches = tokens.reduce((c, r) => c + (r.test(lower) ? 1 : 0), 0);
    return (matches >= 3) || (hasAccents && matches >= 2);
  }
  if (targetLang.startsWith('es')) {
    const tokens = [/\bque\b/, /\bpara\b/, /\bcomo\b/, /\buna?\b/, /\bno\b/, /\bpero\b/, /\bentre\b/, /\bsus?\b/];
    const matches = tokens.reduce((c, r) => c + (r.test(lower) ? 1 : 0), 0);
    return (matches >= 3) || (hasAccents && matches >= 2);
  }
  if (targetLang.startsWith('fr')) {
    const tokens = [/\ble\b/, /\bla\b/, /\bles\b/, /\bdes\b/, /\bune?\b/, /\bmais\b/, /\bavec\b/, /\bentre\b/];
    const matches = tokens.reduce((c, r) => c + (r.test(lower) ? 1 : 0), 0);
    return (matches >= 3) || (hasAccents && matches >= 2);
  }
  return false;
}

/**
 * Traduz texto usando Google Gemini
 */
async function translateWithGemini({ text, targetLang, tone = 'natural' }) {
  const trimmedText = (text || '').trim();
  if (!trimmedText) return trimmedText;
  
  // Possibilidade de desativar heurística via env
  const disableHeuristic = process.env.DISABLE_LANG_HEURISTIC === '1';
  const looksLikeTarget = !disableHeuristic && isLikelyInTargetLang(trimmedText, targetLang);
  if (process.env.DEBUG_TRANSLATION === '1') {
    console.log('[translate] alvo=%s heuristicDisable=%s looksLikeTarget=%s len=%d sample="%s"',
      targetLang, disableHeuristic, looksLikeTarget, trimmedText.length, trimmedText.slice(0,80).replace(/\n/g,' '));
  }
  if (looksLikeTarget) {
    if (process.env.DEBUG_TRANSLATION === '1') console.log('[translate] pulando tradução (heurística)');
    return trimmedText;
  }
  
  const cache = getCache();
  const cacheKey = `gemini:${targetLang}:${tone}:${Buffer.from(trimmedText).toString('base64').slice(0, 40)}`;
  
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY não configurada, retornando texto original');
    return trimmedText;
  }
  
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  
  try {
  const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const prompt = `Você é um tradutor profissional de sinopses audiovisuais. 
Traduza o texto abaixo para ${targetLang}, mantendo sentido, fluidez, nomes próprios corretos e sem adicionar informações. 
Tom: ${tone || 'natural'}. 
Devolva apenas o texto final, sem markdown e sem tags.

Texto:
"""${trimmedText}"""`;
    
  if (process.env.DEBUG_TRANSLATION === '1') console.log('[translate] enviando prompt (%d chars)', prompt.length);
  const result = await model.generateContent(prompt);
    const response = result.response;
    let translatedText = response.text().trim();
    if (process.env.DEBUG_TRANSLATION === '1') console.log('[translate] resposta recebida (%d chars) sample="%s"', translatedText.length, translatedText.slice(0,100).replace(/\n/g,' '));

    // Validação simples: se deve reforçar idioma e não parece no idioma alvo, re-tentar
    if (process.env.ENFORCE_TARGET_LANG === '1' && !looksLikeTargetLanguage(translatedText, targetLang)) {
      if (process.env.DEBUG_TRANSLATION === '1') console.log('[translate] output não parece %s, re-tentando com prompt reforçado', targetLang);
      try {
        const reinforcePrompt = `Traduza fielmente para ${targetLang} (variante ${targetLang}). Respeite nomes próprios. Responda SOMENTE em ${targetLang}. Texto:\n"""${trimmedText}"""`;
        const retry = await model.generateContent(reinforcePrompt);
        const retryText = retry.response.text().trim();
        if (looksLikeTargetLanguage(retryText, targetLang)) {
          translatedText = retryText;
          if (process.env.DEBUG_TRANSLATION === '1') console.log('[translate] segunda tentativa OK');
        } else if (process.env.DEBUG_TRANSLATION === '1') {
          console.log('[translate] segunda tentativa ainda não detectada como alvo, mantendo primeira');
        }
      } catch (retryErr) {
        if (process.env.DEBUG_TRANSLATION === '1') console.log('[translate] erro na re-tentativa', retryErr.message);
      }
    }

    // Limpa e limita o texto
    const finalText = sanitizeText(translatedText) || trimmedText;
    const limitedText = limitLength(finalText, 1200);

    // Cache o resultado
    cache.set(cacheKey, limitedText);

    return limitedText;
  } catch (error) {
    console.error('Erro na tradução Gemini:', error.message);
    if (process.env.DEBUG_TRANSLATION === '1' && error.stack) console.error(error.stack);
    return trimmedText; // Fallback para texto original
  }
}

/**
 * Remove HTML, normaliza espaços e quebras de linha
 */
function sanitizeText(text) {
  return text
    .replace(/\r/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Limita comprimento sem quebrar frases
 */
function limitLength(text, maxLength) {
  if (text.length <= maxLength) return text;
  
  // Corta próximo a uma frase completa
  const slice = text.slice(0, maxLength - 3);
  const lastDot = slice.lastIndexOf('. ');
  const lastExclamation = slice.lastIndexOf('! ');
  const lastQuestion = slice.lastIndexOf('? ');
  
  const lastSentence = Math.max(lastDot, lastExclamation, lastQuestion);
  
  if (lastSentence > 100) {
    return slice.slice(0, lastSentence + 1) + '...';
  }
  
  return slice + '...';
}

module.exports = { translateWithGemini };

// Função auxiliar simples reutilizando heurística de destino
function looksLikeTargetLanguage(text, targetLang) {
  return isLikelyInTargetLang(text, targetLang);
}
