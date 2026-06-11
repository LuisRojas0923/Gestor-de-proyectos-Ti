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
ARG BUILD_SHA=dev
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV BUILD_SHA=$BUILD_SHA

# Manifest de version para deteccion de deploys en clientes con sesion abierta
RUN echo "{\"buildId\":\"${BUILD_SHA}\",\"builtAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > public/version.json

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
