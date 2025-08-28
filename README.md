# Stremio Synopsis Translator (Gemini)

Add-on para Stremio que traduz automaticamente sinopses de filmes, séries, temporadas e episódios usando **TMDB** + **Google Gemini**.

## ✨ Funcionalidades

- 🔍 **Recurso Meta**: Intercepta requisições de metadados do Stremio
- 🌐 **Tradução Inteligente**: Usa Google Gemini para traduzir sinopses
- 🎯 **Suporte Completo**: Filmes, séries, temporadas e episódios
- 🚀 **Cache LRU**: Reduz latência e custos de API
- ⚙️ **Configurável**: Idioma e tom ajustáveis no Stremio
- 🔄 **Fallbacks**: Sistema robusto de fallbacks para máxima compatibilidade

## 📋 Pré-requisitos

- Node.js 18+ (para fetch nativo)
- Chave API do TMDB (gratuita)
- Chave API do Google Gemini (gratuita com limitações)

## 🛠️ Instalação

### 1. Clone e instale dependências
```bash
cd stremio-synopsis-translator-gemini
npm install
```

### 2. Configure variáveis de ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env`:
```env
PORT=7000
TMDB_API_KEY=sua_chave_tmdb_aqui
GEMINI_API_KEY=sua_chave_gemini_aqui
GEMINI_MODEL=gemini-1.5-flash
CACHE_TTL_MS=86400000
JWT_SECRET=sua_chave_secreta_para_criptografia
```

### 3. Execute localmente
```bash
npm start
```

O add-on estará disponível em: `http://127.0.0.1:7000/manifest.json`

## 🔑 Obtendo Chaves de API

### TMDB API Key
1. Acesse: https://www.themoviedb.org/settings/api
2. Registre-se gratuitamente
3. Solicite uma chave API (aprovação automática)

### Google Gemini API Key
1. Acesse: https://makersuite.google.com/app/apikey
2. Faça login com conta Google
3. Crie uma nova chave API
4. Configure cotas e limites conforme necessário

## 📱 Adicionando ao Stremio

### Desktop/Mobile
1. Abra o Stremio
2. Vá em **Settings** → **Add-ons**
3. Cole a URL: `http://SEU_IP:7000/manifest.json` (ou URL do deploy)
4. Clique em **Install**

### Smart TV/Android TV
- Use o IP da sua rede local: `http://192.168.1.100:7000/manifest.json`
- Certifique-se que a porta 7000 está liberada no firewall

## 🧪 Testando

### Testes manuais via curl
```bash
# Manifest
curl http://127.0.0.1:7000/manifest.json

# Filme (Inception)
curl http://127.0.0.1:7000/meta/movie/tt1375666.json

# Episódio (Game of Thrones S01E01)
curl http://127.0.0.1:7000/meta/series/tt0944947:1:1.json

# Série completa
curl http://127.0.0.1:7000/meta/series/tt0944947.json
```

## 🚀 Deploy em Produção

### Render (Recomendado - Gratuito)

1. **Fork/Clone** este repositório no GitHub
2. Acesse https://render.com e conecte com GitHub
3. **New → Web Service**
4. Conecte seu repositório
5. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**: Cole as variáveis do `.env`
6. Deploy!

### Vercel
```bash
npm i -g vercel
vercel --env TMDB_API_KEY=xxx --env GEMINI_API_KEY=xxx
```

### Docker
```bash
docker build -t synopsis-translator .
docker run -p 7000:7000 --env-file .env synopsis-translator
```

## ⚙️ Configuração

O add-on oferece configuração via interface do Stremio:

- **Idioma da sinopse**: pt-BR, pt-PT, es-ES, en-US, fr-FR
- **Tom do texto**: natural, formal, neutro

Essas configurações são aplicadas automaticamente às traduções.

## 🔄 Como Funciona

1. **Entrada**: Stremio solicita meta para ID como `tt1375666` ou `tt0944947:1:1`
2. **Mapeamento**: Converte IMDB ID para TMDB ID via `/find`
3. **Busca**: Obtém dados no idioma alvo; se vazio, busca em inglês
4. **Tradução**: Se necessário, traduz com Gemini usando prompt otimizado
5. **Cache**: Salva resultado em LRU cache (24h padrão)
6. **Retorno**: Monta objeto meta completo com sinopse traduzida

## 📝 Estrutura do Projeto

```
src/
├── server.js      # Inicializador do servidor
├── manifest.js    # Definição do manifest do add-on
├── addon.js       # Lógica principal e handler meta
├── tmdb.js        # Utilitários para API do TMDB
├── translate.js   # Integração com Google Gemini
└── cache.js       # Cache LRU em memória
```

## 🔧 Variáveis de Ambiente

| Variável | Obrigatória | Padrão | Descrição |
|----------|-------------|--------|-----------|
| `PORT` | ❌ | 7000 | Porta do servidor |
| `TMDB_API_KEY` | ✅ | - | Chave da API do TMDB |
| `GEMINI_API_KEY` | ✅ | - | Chave da API do Gemini |
| `GEMINI_MODEL` | ❌ | gemini-1.5-flash | Modelo do Gemini |
| `CACHE_TTL_MS` | ❌ | 86400000 | TTL do cache (24h) |
| `JWT_SECRET` | ⚠️ | - | Segredo para criptografia (recomendado) |

## 🚨 Limitações

- **Cache em memória**: Perdido ao reiniciar (considere Redis para produção)
- **Sem cache persistente**: Primeiras traduções podem ser mais lentas
- **Dependente de APIs**: Requer TMDB e Gemini funcionando
- **Custo de tradução**: Gemini tem limites gratuitos
- **Detecção de idioma**: Heurística simples (pode melhorar)

## 🔄 Fallbacks e Robustez

- Se sinopse existe no idioma alvo → Usa diretamente
- Se não existe → Busca em inglês e traduz
- Se episódio sem sinopse → Usa sinopse da série
- Se tradução falha → Retorna texto original
- Rate limit TMDB → Retry automático (500ms)

## 🐛 Troubleshooting

### "TMDB_API_KEY é obrigatório"
- Verifique se definiu `TMDB_API_KEY` no `.env` ou variáveis de ambiente

### "Erro na tradução Gemini"
- Verifique `GEMINI_API_KEY`
- Confirme se não excedeu quota gratuita
- Teste com `GEMINI_MODEL=gemini-pro` se necessário

### Add-on não aparece no Stremio
- Confirme que URL do manifest está acessível
- Verifique logs do servidor por erros
- Teste manifest via browser: `/manifest.json`

### Traduções não acontecem
- Verifique se idioma alvo é diferente de inglês
- Confirme que texto original não parece já estar no idioma alvo
- Verifique logs para erros de API

## 📈 Próximos Passos

- [ ] Cache persistente (Redis/SQLite)
- [ ] Suporte a mais idiomas
- [ ] Detecção de idioma mais robusta
- [ ] Metrics e monitoramento
- [ ] Suporte a seasons explícito
- [ ] Fallback para outros tradutores
- [ ] Interface de administração

## 📄 Licença

MIT License - Sinta-se livre para usar e modificar.

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Abra um Pull Request

---

**Feito com ❤️ para a comunidade Stremio**
