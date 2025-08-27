# Imagem leve para produção
FROM node:20-alpine

# Dependências de build opcionais (sharp / better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

# Instala apenas prod (se quiser incluir opcionais, mantenha as linhas)
RUN npm install --omit=dev \
    && npm cache clean --force

COPY src ./src
# Copia glossary se existir
COPY glossary.json ./

ENV NODE_ENV=production \
    PORT=7000 \
    TARGET_LANG=pt

EXPOSE 7000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://localhost:7000/health || exit 1

CMD ["node", "src/server.js"]
