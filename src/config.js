import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente de arquivo .env se existir
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

export const CONFIG = {
  PORT: process.env.PORT || 7000,
  TARGET_LANG: process.env.TARGET_LANG || 'pt',
  GLOSSARY_PATH: process.env.GLOSSARY_PATH || path.join(process.cwd(), 'glossary.json'),
  ENABLE_IMAGE_PROXY: process.env.ENABLE_IMAGE_PROXY === '1',
  IMAGE_MAX_WIDTH: parseInt(process.env.IMAGE_MAX_WIDTH || '320', 10),
  TMDB_API_KEY: process.env.TMDB_API_KEY || '',
  OMDB_API_KEY: process.env.OMDB_API_KEY || '',
  PRETRANSLATE: process.env.PRETRANSLATE === '1',
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '86400', 10),
  REMOTE_ADDONS: (process.env.REMOTE_ADDONS || 'https://v3-cinemeta.strem.io/manifest.json')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  REMOTE_REFRESH_SEC: parseInt(process.env.REMOTE_REFRESH_SEC || '3600', 10)
};
