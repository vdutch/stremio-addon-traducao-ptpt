FROM node:20-alpine

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm install --omit=dev

# Copiar código fonte
COPY src ./src

# Copiar arquivo de ambiente (se existir)
COPY .env* ./

# Expor porta
EXPOSE 7000

# Comando de inicialização
CMD ["node", "src/server.js"]
