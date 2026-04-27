from .cooperativas import router as cooperativas_router
from .libranzas import router as libranzas_router
from .funebres import router as funebres_router
from .otros import router as otros_router
from .descuentos import router as descuentos_router
from .excepciones import router as excepciones_router
from .novedades import router as novedades_router
from .tabla_maestra import router as tabla_maestra_router
from .comisiones import router as comisiones_router

__all__ = ["cooperativas_router", "libranzas_router", "funebres_router", "otros_router", "descuentos_router", "excepciones_router", "novedades_router", "tabla_maestra_router", "comisiones_router"]
