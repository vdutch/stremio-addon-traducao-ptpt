console.log('🚀 Boot start.js - iniciando add-on');
process.on('uncaughtException', e => { console.error('uncaughtException', e); process.exit(1); });
process.on('unhandledRejection', r => { console.error('unhandledRejection', r); process.exit(1); });
require('dotenv/config');
const { serveHTTP } = require('stremio-addon-sdk');
let addonInterface;
try {
	addonInterface = require('./addon.js');
	console.log('Addon interface carregada com sucesso');
} catch (e) {
	console.error('Falha ao carregar addon.js', e);
	process.exit(1);
}
const PORT = Number(process.env.PORT || 7000);
try {
	serveHTTP(addonInterface, { port: PORT });
	console.log(`✅ Add-on disponível em http://0.0.0.0:${PORT}/manifest.json`);
} catch (e) {
	console.error('Erro ao iniciar HTTP server', e);
	process.exit(1);
}
setInterval(()=>console.log('💓 alive', new Date().toISOString()), 60000);