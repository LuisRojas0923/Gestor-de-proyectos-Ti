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
from .api.notificaciones.router import router as notificaciones_router
from .api.auditoria import router as auditoria_router
from .core.middleware.auditoria_middleware import auditoria_http_middleware

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

# Rate limiting para /config/verify-admin (5 intentos / 5 minutos por usuario+IP)
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limiter import (
    limiter,
    _resolve_effective_ip,
    PATHS_CON_BODY_PARA_RATE_LIMIT,
)
from limits.errors import StorageError

# Registrar el handler de rate limit excedido en la app
app.state.limiter = limiter


async def _rate_limit_handler_con_log(request, exc: RateLimitExceeded):
    """Wrapper del handler por defecto de SlowAPI que loguea 429s
    estructurados (key, ip, path, timestamp) para SOC/observabilidad."""
    try:
        ip = _resolve_effective_ip(request)
    except Exception:
        ip = "unknown"
    view_limit = getattr(request.state, "view_rate_limit", None)
    limit_str = str(view_limit[0]) if view_limit else str(exc)
    logger.warning(
        "RATE_LIMIT_EXCEEDED | key=%s | ip=%s | path=%s | method=%s | limit=%s",
        view_limit[1] if view_limit else "n/a",
        ip,
        request.url.path,
        request.method,
        limit_str,
    )
    return _rate_limit_exceeded_handler(request, exc)


app.add_exception_handler(RateLimitExceeded, _rate_limit_handler_con_log)


@app.middleware("http")
async def middleware_auditoria_acciones(request, call_next):
    return await auditoria_http_middleware(request, call_next)


@app.middleware("http")
async def cache_request_body_for_rate_limit(request, call_next):
    """Pre-corre `await request.body()` para los endpoints con rate limit
    que dependen del body (form/JSON con cedula). Esto puebla
    `request._body` antes de que SlowAPI evalue el key func, que es sync
    y necesita leer el body de forma sincrona.

    Sin este middleware, `request._body` seria None cuando el key func
    corre (Starlette solo cachea el body despues de la primera lectura).
    """
    if request.method in ("POST", "PUT", "PATCH") and request.url.path in PATHS_CON_BODY_PARA_RATE_LIMIT:
        try:
            await request.body()
        except Exception:
            pass
    return await call_next(request)


@app.exception_handler(StorageError)
async def _storage_error_handler(request, exc: StorageError):
    """Fail-closed: si Redis (storage del rate limiter) esta caido,
    rechazamos la request con 503 en vez de permitir acceso sin limite.

    Es la postura correcta para endpoints de auth: un atacante que DoS-ea
    Redis para evadir el rate limit NO debe poder bypasear el control.
    Operadores pueden seguir rotando contrasenas directo en DB si Redis
    queda caido por tiempo prolongado.
    """
    logger.error(
        "Rate limiter storage caido: %s | path=%s | method=%s",
        exc, request.url.path, request.method,
    )
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=503,
        content={
            "detail": "Servicio de limitacion de tasa no disponible. Intente de nuevo en unos minutos.",
        },
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

    # 4. Iniciar verificador de compromisos de actividades en segundo plano (cada 12 horas)
    from app.services.desarrollo.compromiso_notificacion import iniciar_loop_verificador_compromisos
    asyncio.create_task(
        iniciar_loop_verificador_compromisos(intervalo_horas=12)
    )

    # 5. Refrescamiento diario del cache de horario_pactado desde el ERP (a las 02:00)
    from app.services.novedades_nomina.horas_extras_batch import iniciar_loop_refrescamiento_diario
    asyncio.create_task(
        iniciar_loop_refrescamiento_diario(hora_objetivo=2)
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
app.include_router(
    notificaciones_router,
    prefix=f"{api_prefix}/notificaciones",
    tags=["Notificaciones"],
)
app.include_router(
    auditoria_router,
    prefix=f"{api_prefix}/auditoria",
    tags=["Auditoria"],
)

# Consolidated developments-activities endpoint and number-mapped endpoint
app.include_router(desarrollos_actividades_router, prefix=api_prefix)
app.include_router(development_by_number_router, prefix=api_prefix)
