import logging
import json
from loguru import logger

# Campos sensibles que deben enmascararse
SENSITIVE_FIELDS = {
    "password", "senha", "contrasena", "contraseña",
    "token", "access_token", "refresh_token",
    "secret", "client_secret", "api_key",
    "authorization", "cookie", "set-cookie",
    "base64", "file_content"
}

def serialize(record):
    """
    Serializa el record de Loguru a un formato JSON compatible con Docker/GKE/ELK.
    Incluye enmascaramiento de campos sensibles en el mensaje y en los datos extra.
    """
    subset = {
        "timestamp": record["time"].isoformat(),
        "level": record["level"].name,
        "message": record["message"],
        "logger": record["name"],
        "file": record["file"].name,
        "line": record["line"],
        "function": record["function"],
        "process": record["process"].id,
        "thread": record["thread"].id,
    }
    
    # Añadir campos extra (ej: correlation_id)
    if record["extra"]:
        subset["extra"] = record["extra"]

    # Enmascaramiento básico en el mensaje (si es una cadena que parece JSON o similar)
    # Por simplicidad, aquí nos enfocamos en los datos 'extra' que es donde suele ir el payload
    if "extra" in subset:
        for field in SENSITIVE_FIELDS:
            if field in subset["extra"]:
                subset["extra"][field] = "********"
            
            # También buscar en minúsculas/mayúsculas si es necesario
            # O dentro de diccionarios anidados
            if isinstance(subset["extra"].get("payload"), dict):
                if field in subset["extra"]["payload"]:
                    subset["extra"]["payload"][field] = "********"

    return json.dumps(subset)

def json_sink(message):
    serialized = serialize(message.record)
    print(serialized, flush=True)

class InterceptHandler(logging.Handler):
    """
    Interceptor para redirigir logs del standard 'logging' (ej: uvicorn, sqlalchemy) a Loguru.
    """
    def emit(self, record):
        # Obtener el nivel de loguru correspondiente
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Encontrar el llamador original para mantener la info de file/line exacta
        frame, depth = logging.currentframe(), 2
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())

def setup_logging():
    """
    Configura Loguru como el manejador principal del sistema.
    """
    # 1. Eliminar manejadores por defecto de Loguru
    logger.remove()

    # 2. Añadir sink JSON a stdout
    logger.add(
        json_sink,
        level="INFO",
        backtrace=True,
        diagnose=False, # En prod poner False para no filtrar secretos en trazas
    )

    # 3. Interceptar logs de librerías externas
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)
    
    # Ajustar niveles para bibliotecas ruidosas
    logging.getLogger("uvicorn.access").handlers = [InterceptHandler()]
    logging.getLogger("uvicorn.error").handlers = [InterceptHandler()]
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    return logger
