# Stage 1: Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copiar solo archivos de dependencias para aprovechar cache
COPY package*.json ./

# Usar montura de cache para acelerar la instalacion
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Copiar el resto del codigo (excepto lo ignorado por .dockerignore)
COPY . .

# Argumentos de construccion
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Usar montura de cache para Vite/Rollup (opcional pero util)
RUN --mount=type=cache,target=/app/node_modules/.cache \
    npm run build

# Stage 2: Production stage (Runtime)
FROM nginx:alpine

# Copiar el resultado de la construccion al directorio de nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuracion personalizada de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
