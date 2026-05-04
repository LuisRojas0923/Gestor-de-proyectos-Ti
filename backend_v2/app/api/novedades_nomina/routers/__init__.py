from fastapi import APIRouter
from .cooperativas_grancoop import router as grancoop_router
from .cooperativas_beneficiar import router as beneficiar_router
from .libranzas_bogota import router as bogota_router
from .libranzas_davivienda import router as davivienda_router
from .libranzas_occidente import router as occidente_router
from .otros_hdi import router as hdi_router
from .otros_med_pre import router as med_pre_router
from .otros_gerencia import router as gerencia_router
from .otros_polizas import router as polizas_router
from .funebres import router as funebres_router
from .descuentos_control import router as desc_control_router
from .descuentos_otros import router as desc_otros_router
from .excepciones import router as excepciones_router
from .novedades import router as novedades_router
from .tabla_maestra import router as tabla_maestra_router
from .comisiones import router as comisiones_router

# Router Agregador de Cooperativas
cooperativas_router = APIRouter()
cooperativas_router.include_router(grancoop_router)
cooperativas_router.include_router(beneficiar_router)

# Router Agregador de Otros
otros_router = APIRouter()
otros_router.include_router(hdi_router)
otros_router.include_router(med_pre_router)
otros_router.include_router(gerencia_router, prefix="/otros_gerencia")
otros_router.include_router(polizas_router)

# Router Agregador de Libranzas
libranzas_router = APIRouter()
libranzas_router.include_router(bogota_router)
libranzas_router.include_router(davivienda_router)
libranzas_router.include_router(occidente_router)

# Router Agregador de Descuentos
descuentos_router = APIRouter()
descuentos_router.include_router(desc_control_router)
descuentos_router.include_router(desc_otros_router)

__all__ = [
    "cooperativas_router", 
    "libranzas_router", 
    "funebres_router", 
    "otros_router", 
    "descuentos_router", 
    "excepciones_router", 
    "novedades_router", 
    "tabla_maestra_router", 
    "comisiones_router"
]
