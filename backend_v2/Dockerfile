# --- Stage 1: Builder ---
FROM python:3.11-slim AS builder

WORKDIR /app

# Evitar que Python genere archivos .pyc
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Instalar dependencias del sistema para compilar (psycopg2, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# --- Stage 2: Runtime ---
FROM python:3.11-slim

WORKDIR /app

# Copiar solo las librerias instaladas desde el builder
COPY --from=builder /install /usr/local

# Instalar solo la libreria runtime de postgres
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copiar el codigo de la aplicacion
COPY . .

# Exponer puerto
EXPOSE 8000

# Comando de inicio
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
