"""
Backend V2 - Gestor de Proyectos TI
Aplicacion FastAPI principal
"""

import asyncio
import logging
import os
import subprocess
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importaciones locales (Base de Datos y Servicios)
from .database import init_db, AsyncSessionLocal
from .services.panel_control.metrica_service import MetricaService
from .services.auth.rbac_discovery import sincronizar_manifiesto_rbac

# Importar routers
from .api.desarrollos import router as desarrollos_router
from .api.desarrollos.actividades_router import router as actividades_router
from .api.desarrollos.plantillas_router import router as plantillas_router
from .api.development_by_number import router as development_by_number_router
from .api.desarrollos.reporte_router import router as reporte_router
from .api.kpis import router as kpis_router
from .api.alertas import router as alertas_router
from .api.tickets import router as tickets_router
from .api.ia import router as ia_router
from .api.erp import router as erp_router
from .api.panel_control import router as panel_control_router
from .api.etapas_router import router as etapas_router
from .api.solid.router import router as solid_router
from .api.viaticos.router import router as viaticos_router
from .api.auth import router as auth_router
from .api.desarrollos_actividades import router as desarrollos_actividades_router
from .api.auth.config_router import router as config_router
from .api.validaciones_asignacion import router as validaciones_asignacion_router
from .api.reserva_salas import router as reserva_salas_router
from .api.novedades_nomina.nomina_router import router as nomina_router
from .api.inventario.router import router as inventario_router
from .api.impuestos import router as impuestos_router
from .api.lineas_corporativas.router import router as lineas_corporativas_router
from .api.jerarquia import router as jerarquia_router

# Configurar logging centralizado
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


# Obtener version del sistema dinamicamente
def obtener_version_sistema():
    # 1. Intentar variable de entorno (Prioridad Maxima)
    env_version = os.getenv("APP_VERSION")
    if env_version:
        return env_version

    # 2. Intentar leer desde archivos generados en despliegue
    for file_name in [".version", ".git_hash"]:
        try:
            path = os.path.join(os.getcwd(), file_name)
            if os.path.exists(path):
                with open(path, "r") as f:
                    content = f.read().strip()
                    if content:
                        return content
        except Exception:
            pass

    # 3. Intentar Git Tags (SemVer)
    try:
        return (
            subprocess.check_output(
                ["git", "describe", "--tags", "--always"], stderr=subprocess.STDOUT
            )
            .decode("ascii")
            .strip()
        )
    except Exception:
        pass

    # 4. Fallback: Git Hash directo
    try:
        hash_largo = (
            subprocess.check_output(
                ["git", "rev-parse", "--short", "HEAD"], stderr=subprocess.STDOUT
            )
            .decode("ascii")
            .strip()
        )
        return f"v2.1.0-{hash_largo}"
    except Exception as e:
        logger.warning(f"No se pudo determinar version: {str(e)}")
        return "v2.1.0-desconocido"


VERSION_SISTEMA = obtener_version_sistema()

# Crear aplicacion FastAPI
app = FastAPI(
    title="Portal de Servicios Solid - API",
    description="Sistema de gestion de desarrollos y proyectos de TI",
    version=VERSION_SISTEMA,
    docs_url="/docs",
)

# Configurar CORS dinámico (Soporta Localhost e IPs de Red Privada)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Acciones al iniciar el servidor"""
    await init_db()
    # 2. Sincronizar Módulos RBAC auto-descubiertos
    async with AsyncSessionLocal() as db:
        await sincronizar_manifiesto_rbac(db)

    # 3. Iniciar recolector de metricas en segundo plano (cada 15 min)
    asyncio.create_task(
        MetricaService.iniciar_recolector_automatico(intervalo_minutos=15)
    )


@app.get("/")
async def raiz():
    """Endpoint raiz"""
    return {
        "mensaje": "Gestor de Proyectos TI - API v2.0",
        "estado": "activo",
        "documentacion": "/docs",
    }


@app.get("/api/v2/health")
@app.get("/health")
async def verificar_salud():
    """Verificacion de salud del servicio (Disponible en raiz y bajo prefijo api/v2)"""
    return {"estado": "saludable", "version": VERSION_SISTEMA}



api_prefix = "/api/v2"

app.include_router(auth_router, prefix=f"{api_prefix}/auth", tags=["Autenticacion"])
app.include_router(
    desarrollos_router, prefix=f"{api_prefix}/desarrollos", tags=["Desarrollos"]
)
app.include_router(
    actividades_router, prefix=f"{api_prefix}/actividades", tags=["Actividades"]
)
app.include_router(
    plantillas_router,
    prefix=f"{api_prefix}/desarrollos/plantillas",
    tags=["Plantillas WBS"],
)
app.include_router(
    reporte_router, prefix=f"{api_prefix}/reportes", tags=["Reportes Consolidados"]
)
app.include_router(kpis_router, prefix=f"{api_prefix}/kpis", tags=["KPIs"])
app.include_router(alertas_router, prefix=f"{api_prefix}/alertas", tags=["Alertas"])
app.include_router(tickets_router, prefix=f"{api_prefix}/soporte", tags=["Tickets"])
app.include_router(ia_router, prefix=f"{api_prefix}/ia", tags=["IA"])
app.include_router(erp_router, prefix=f"{api_prefix}/erp", tags=["ERP"])
app.include_router(
    panel_control_router, prefix=f"{api_prefix}/panel-control", tags=["Panel Control"]
)
app.include_router(etapas_router, prefix=f"{api_prefix}/etapas", tags=["Etapas"])
app.include_router(solid_router, prefix=f"{api_prefix}/solid", tags=["SOLID"])
app.include_router(viaticos_router, prefix=api_prefix, tags=["Viaticos"])
app.include_router(
    reserva_salas_router, prefix=f"{api_prefix}/reserva-salas", tags=["Reserva Salas"]
)
app.include_router(nomina_router, prefix=f"{api_prefix}/novedades-nomina", tags=["Novedades Nomina"])
app.include_router(
    inventario_router, prefix=f"{api_prefix}/inventario", tags=["Inventario 2026"]
)
app.include_router(impuestos_router, prefix=api_prefix)
app.include_router(config_router, prefix=api_prefix, tags=["Configuracion Global"])
app.include_router(
    lineas_corporativas_router,
    prefix=f"{api_prefix}/lineas-corporativas",
    tags=["Lineas Corporativas"],
)
app.include_router(jerarquia_router, prefix=f"{api_prefix}/jerarquia", tags=["Jerarquia"])
app.include_router(
    validaciones_asignacion_router,
    prefix=f"{api_prefix}/validaciones-asignacion",
    tags=["Validaciones Asignacion"],
)

# Consolidated developments-activities endpoint and number-mapped endpoint
app.include_router(desarrollos_actividades_router, prefix=api_prefix)
app.include_router(development_by_number_router, prefix=api_prefix)
