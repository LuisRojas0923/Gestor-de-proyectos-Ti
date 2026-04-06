import uuid
from contextvars import ContextVar
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from loguru import logger

# Context Variable para almacenar el Correlation ID de forma segura entre corrutinas
correlation_id_ctx_var: ContextVar[str] = ContextVar("correlation_id", default=None)

class CorrelationIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Extraer de los headers o generar uno nuevo
        correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        
        # 2. Guardar en el ContextVar para que sea accesible en logs y base de datos
        token = correlation_id_ctx_var.set(correlation_id)
        
        # 3. Vincular el ID al logger para que aparezca en los logs estructurados automáticamente
        with logger.contextualize(correlation_id=correlation_id):
            logger.info(f"Petición entrante: {request.method} {request.url.path}")
            
            try:
                response: Response = await call_next(request)
            except Exception as e:
                logger.exception(f"Fallo en la ejecución de la petición: {str(e)}")
                raise
            finally:
                # Limpiar el contexto al terminar la petición
                correlation_id_ctx_var.reset(token)

            # 4. Incluir el ID en la respuesta para facilitar el debugging del lado del cliente
            response.headers["X-Correlation-ID"] = correlation_id
            return response

def get_correlation_id() -> str:
    """Función de utilidad para obtener el ID actual"""
    return correlation_id_ctx_var.get()
