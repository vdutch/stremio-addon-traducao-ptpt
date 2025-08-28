# Usar Node 18 LTS específico para evitar problemas ESM/CommonJS
FROM node:18-alpine

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm ci --only=production --no-audit --no-fund

# Copiar código fonte
COPY src ./src

# Opcional: remover server.js legacy vazio se existir
RUN if [ -f src/server.js ] && [ ! -s src/server.js ]; then rm src/server.js; fi || true

# Expor porta
EXPOSE 7000

# Definir NODE_ENV para produção
ENV NODE_ENV=production

# Comando de inicialização com logs
CMD ["node", "src/start.js"]
