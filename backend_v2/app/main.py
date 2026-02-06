"""
Backend V2 - Gestor de Proyectos TI
Aplicacion FastAPI principal
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import config

# Crear aplicacion FastAPI
app = FastAPI(
    title="Gestor de Proyectos TI - API",
    description="Sistema de gestion de desarrollos y proyectos de TI",
    version="2.0.0",
    docs_url="/docs"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .database import init_db

@app.on_event("startup")
async def startup_event():
    """Acciones al iniciar el servidor"""
    await init_db()


@app.get("/")
async def raiz():
    """Endpoint raiz"""
    return {
        "mensaje": "Gestor de Proyectos TI - API v2.0",
        "estado": "activo",
        "documentacion": "/docs"
    }


@app.get("/health")
async def verificar_salud():
    """Verificacion de salud del servicio"""
    return {"estado": "saludable", "version": "2.0.0"}


# Importar y registrar routers
from .api.auth import router as auth_router
from .api.desarrollos import router as desarrollos_router
from .api.kpis import router as kpis_router
from .api.alertas import router as alertas_router
from .api.tickets import router as tickets_router
from .api.ia import router as ia_router
from .api.erp import router as erp_router
from .api.panel_control import router as panel_control_router
from .api.etapas_router import router as etapas_router
from .api.solid.router import router as solid_router
from .api.viaticos.router import router as viaticos_router
from .api.reserva_salas import router as reserva_salas_router

api_prefix = "/api/v2"

app.include_router(auth_router, prefix=f"{api_prefix}/auth", tags=["Autenticacion"])
app.include_router(desarrollos_router, prefix=f"{api_prefix}/desarrollos", tags=["Desarrollos"])
app.include_router(kpis_router, prefix=f"{api_prefix}/kpis", tags=["KPIs"])
app.include_router(alertas_router, prefix=f"{api_prefix}/alertas", tags=["Alertas"])
app.include_router(tickets_router, prefix=f"{api_prefix}/soporte", tags=["Tickets"])
app.include_router(ia_router, prefix=f"{api_prefix}/ia", tags=["IA"])
app.include_router(erp_router, prefix=f"{api_prefix}/erp", tags=["ERP"])
app.include_router(panel_control_router, prefix=f"{api_prefix}/panel-control", tags=["Panel Control"])
app.include_router(etapas_router, prefix=f"{api_prefix}/etapas", tags=["Etapas"])
app.include_router(solid_router, prefix=f"{api_prefix}/solid", tags=["SOLID"])
app.include_router(viaticos_router, prefix=api_prefix, tags=["Viaticos"])
app.include_router(reserva_salas_router, prefix=f"{api_prefix}/reserva-salas", tags=["Reserva Salas"])

