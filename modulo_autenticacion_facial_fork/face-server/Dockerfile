FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema requeridas para OpenCV y PostgreSQL
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar requerimientos
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente
COPY . .

# Crear carpetas de almacenamiento de imágenes
RUN mkdir -p /app/storage/perfiles /app/storage/asistencias

# Exponer el puerto
EXPOSE 5005

# Volumen para persistir las fotos fuera del contenedor
VOLUME ["/app/storage"]

# Comando de inicio
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "5005"]
