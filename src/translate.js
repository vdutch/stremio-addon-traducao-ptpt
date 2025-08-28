import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCache } from './cache.js';

/**
 * Heurística simples para detectar se texto já está no idioma alvo
 */
function isLikelyInTargetLang(text, targetLang) {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  
  if (targetLang.startsWith('pt')) {
    // Palavras comuns em português
    return /\b(o|a|os|as|de|que|para|uma|um|com|por|não|mas|sua|seu|dos|das|pela|pelo)\b/i.test(lowerText);
  }
  
  if (targetLang.startsWith('es')) {
    // Palavras comuns em espanhol
    return /\b(el|la|los|las|de|que|para|una|un|con|por|no|pero|su|del|por|desde)\b/i.test(lowerText);
  }
  
  if (targetLang.startsWith('fr')) {
    // Palavras comuns em francês
    return /\b(le|la|les|des|une|un|pour|avec|par|ne|mais|son|sa|ses|du|de|depuis)\b/i.test(lowerText);
  }
  
  return false;
}

/**
 * Traduz texto usando Google Gemini
 */
export async function translateWithGemini({ text, targetLang, tone = 'natural' }) {
  const trimmedText = (text || '').trim();
  if (!trimmedText) return trimmedText;
  
  // Se já parece estar no idioma alvo, não traduz
  if (isLikelyInTargetLang(trimmedText, targetLang)) {
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
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const translatedText = response.text().trim();
    
    // Limpa e limita o texto
    const finalText = sanitizeText(translatedText) || trimmedText;
    const limitedText = limitLength(finalText, 1200);
    
    // Cache o resultado
    cache.set(cacheKey, limitedText);
    
    return limitedText;
  } catch (error) {
    console.error('Erro na tradução Gemini:', error.message);
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
