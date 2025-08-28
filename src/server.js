import 'dotenv/config';
import { serveHTTP } from 'stremio-addon-sdk';
import addonInterface from './addon.js';

const PORT = Number(process.env.PORT || 7000);

// Inicializar servidor
serveHTTP(addonInterface, { port: PORT });

console.log(`🚀 Synopsis Translator (Gemini) rodando em: http://127.0.0.1:${PORT}/manifest.json`);
console.log(`📖 Para usar no Stremio, adicione a URL acima como add-on`);
