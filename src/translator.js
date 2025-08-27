import NodeCache from 'node-cache';
import fs from 'fs';
import path from 'path';
import { applyGlossary } from './glossary.js';

// Tenta carregar better-sqlite3 se disponível
let sqlite = null;
try {
  // dynamic import to avoid failure on platforms without build tools
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  sqlite = await import('better-sqlite3');
} catch (e) {
  sqlite = null;
}

const memoryCache = new NodeCache({ stdTTL: 60 * 60 * 24, checkperiod: 120 }); // 24h

// Opcional: cache persistente em SQLite (se lib carregou)
let db = null;
if (sqlite) {
  const dbPath = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });
  db = new sqlite.default(path.join(dbPath, 'translations.db'));
  db.exec('CREATE TABLE IF NOT EXISTS translations (hash TEXT PRIMARY KEY, original TEXT, translated TEXT, lang_from TEXT, lang_to TEXT, created_at INTEGER)');
}

function hash(str) {
  let h = 0; let i = 0; let chr;
  if (str.length === 0) return '0';
  for (i = 0; i < str.length; i += 1) {
    chr = str.charCodeAt(i);
    h = (h << 5) - h + chr;
    h |= 0; // Convert to 32bit integer
  }
  return h.toString();
}

async function translateViaLibreTranslate(text, targetLang) {
  const endpoint = process.env.LIBRE_TRANSLATE_URL || 'https://libretranslate.de/translate';
  const body = {
    q: text,
    source: 'auto',
    target: targetLang,
    format: 'text'
  };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Falha na tradução: ${res.status}`);
  const data = await res.json();
  return data.translatedText || text;
}

// Fallback simples mock (identity) para não quebrar quando offline
async function mockTranslate(text) { return text; }

async function translate(text, targetLang = 'pt') {
  if (!text || typeof text !== 'string') return text;
  const key = `${targetLang}:${hash(text)}`;

  // Memory cache
  const cachedMem = memoryCache.get(key);
  if (cachedMem) return cachedMem;

  // SQLite cache
  if (db) {
    const row = db.prepare('SELECT translated FROM translations WHERE hash = ?').get(key);
    if (row && row.translated) {
      memoryCache.set(key, row.translated);
      return row.translated;
    }
  }

  let translated;
  try {
    translated = await translateViaLibreTranslate(text, targetLang);
  } catch (e) {
    translated = await mockTranslate(text); // fallback
  }

  memoryCache.set(key, translated);
  if (db) {
    try {
      db.prepare('INSERT OR REPLACE INTO translations (hash, original, translated, lang_from, lang_to, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(key, text, translated, 'auto', targetLang, Date.now());
    } catch (e) {
      // ignore
    }
  }
  return applyGlossary(translated);
}

export async function batchTranslate(texts, targetLang='pt') {
  return Promise.all(texts.map(t => translate(t, targetLang)));
}

export { translate };
