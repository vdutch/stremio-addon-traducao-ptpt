# Add-on Stremio: Catálogo Traduzido PT-BR (Agregado)

Add-on proxy avançado que agrega múltiplas fontes (local + TMDb + OMDb), traduz e enriquece metadados (título, sinopse, rating, badges) e oferece busca com filtros.

## Funcionalidades
- Agregação: catálogo local + TMDb (trending / busca) + OMDb (busca) (conforme API keys).
- Tradução em tempo real (com glossário custom) + pré-tradução opcional.
- Cache memória + (opcional) SQLite.
- Busca unificada (`search=`) e filtros (`genre=`, `year=`) via query string.
- Normalização e deduplicação (prioriza IMDb ID quando disponível).
- Enriquecimento: rating, badges ("Em Alta", "Novo").
- Watchlist em memória (demo) via endpoints REST.
- Manifesto em `/` e `/manifest.json` + rotas Stremio padrão.
- Proxy de imagem opcional (`/img?url=`) para modo leve em Smart TV.
- Health check `/health`.

## Requisitos
- Node.js 18+ (fetch nativo).

## Instalação
```bash
npm install
# (Opcional) cache persistente
npm install better-sqlite3 --save-optional
# (Opcional) otimização imagem
npm install sharp --save-optional
```

## Execução
```bash
npm start
```
Servidor: `http://localhost:7000`

## Variáveis de Ambiente
- `PORT` porta (default 7000)
- `TARGET_LANG` idioma destino (default `pt`)
- `LIBRE_TRANSLATE_URL` endpoint tradução (LibreTranslate)
- `TMDB_API_KEY` chave TMDb
- `OMDB_API_KEY` chave OMDb
- `ENABLE_IMAGE_PROXY=1` ativa proxy /img
- `IMAGE_MAX_WIDTH=320` largura máx (se usar sharp)
- `PRETRANSLATE=1` usar script pré-tradução manualmente
- `GLOSSARY_PATH` caminho de glossary.json (default ./glossary.json)
- `CACHE_TTL` TTL cache (segundos)
- `REMOTE_ADDONS` lista de manifests remotos separados por vírgula (default Cinemeta)
- `REMOTE_REFRESH_SEC` intervalo para recarregar manifests remotos

## Adicionando no Stremio
Manifesto: `http://<SEU_IP_LOCAL>:7000/manifest.json`
Smart TV: mesma rede; abrir firewall porta 7000.

## Endpoints Extra
- `GET /catalog/:type/:id.json?search=matrix&genre=Action&year=1999`
- `GET /meta/:type/:id.json`
- `POST /user/:userId/watchlist/:id` (add)
- `DELETE /user/:userId/watchlist/:id` (remove)
- `GET /user/:userId/watchlist` (listar)
- `GET /img?url=<encoded>`
- `GET /health`

## Super Agregador (Tudo Traduzido)
Catálogos `Filmes (Tudo Traduzido)` e `Séries (Tudo Traduzido)` agregam catálogos de add-ons remotos (por padrão Cinemeta), traduzem e retornam uma lista unificada.

Personalização:
```
REMOTE_ADDONS=https://v3-cinemeta.strem.io/manifest.json,https://outro-addon/manifest.json
REMOTE_REFRESH_SEC=1800
```
Limitações:
- Paginacão simplificada (recorta primeiros ~120 itens).
- Pode haver delay adicional na primeira chamada (tradução + fetch remoto).

## Glossário
Arquivo `glossary.json` exemplo:
```json
{
  "Matrix": "Matrix",
  "Season": "Temporada",
  "Episode": "Episódio"
}
```

## Pré-tradução
Popular cache (trending) antes de iniciar carga de usuários:
```bash
npm run pretranslate
```

## Limitações Atuais
- Watchlist só em memória (reinício limpa).
- Sem autenticação / quotas.
- Filtros básicos (sem paginação avançada / ordenação flexível).
- Trailers / elenco detalhado ainda não puxados.

## Deploy Render (exemplo)
1. Git push do projeto.
2. Render: New Web Service -> repo.
3. Build: `npm install`
4. Start: `npm start`
5. Definir env vars (TMDB_API_KEY, OMDB_API_KEY, TARGET_LANG, etc.).
6. Usar URL: `https://SEU-SERVICE.onrender.com/manifest.json` no Stremio.

### Usando Dockerfile (Render ou outro host)
O repositório já contém `Dockerfile`. Em qualquer serviço que aceite build Docker basta apontar para a raiz.

Build local manual:
```bash
docker build -t stremio-tradutor .
docker run -p 7000:7000 --env-file .env stremio-tradutor
```

### render.yaml
Arquivo `render.yaml` incluído para Infra as Code; no Render (Blueprint Deploy) ele cria o serviço automaticamente.

## Próximos Passos (Sugestões Evolução)
- Persistir watchlist em DB + autenticação token.
- Paginação / ordenação (popularidade, rating, ano).
- Recomendação baseada em gêneros e histórico.
- Trailers (YouTube) e elenco completo (TMDb credits).
- Fila de pré-tradução incremental.
- Métricas Prometheus + dashboard.
- Rate limiting + API keys e planos.

## Licença
MIT (defina conforme necessidade).
