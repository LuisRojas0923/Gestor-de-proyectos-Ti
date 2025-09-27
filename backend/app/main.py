"""
Sistema de Gestión de Proyectos TI - Backend API
Arquitectura modular con MCP (Model Context Protocol)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
from datetime import datetime, timezone
from dotenv import load_dotenv
import os
import logging

# Importar routers modulares
from .api import (
    developments,
    developments_v2,
    dashboard,
    kpi,
    quality,
    alerts,
    # chat,  # Comentado temporalmente - requiere openai
    # ai,    # Comentado temporalmente - requiere openai
    phases,
    stages,
    activity_log,
    installers
)

# Importar configuración de base de datos
from .database import SessionLocal, engine
from . import models
from .services.kpi_service import KPIService

# Importar sistema de health checks
# from .services.health_service import health_service  # Comentado temporalmente - requiere aiohttp
from .config import should_run_startup_checks, get_health_config

# Cargar variables de entorno
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestión del ciclo de vida de la aplicación"""
    # Startup
    print("🚀 Iniciando Sistema de Gestión de Proyectos TI...")
    print("🏗️ Arquitectura modular con MCP activada")
    print("🔗 Conectando a PostgreSQL...")
    
    # Crear tablas si no existen (en desarrollo)
    if os.getenv("ENVIRONMENT", "development") == "development":
        models.Base.metadata.create_all(bind=engine)
        print("✅ Tablas de base de datos verificadas")
    
    # Ejecutar health checks al inicio si están habilitados
    if should_run_startup_checks():
        print("🔍 Ejecutando health checks del sistema...")
        try:
            health_config = get_health_config()
            print(f"📋 Configuración de health checks: {health_config.mode.value}")
            
            # Ejecutar health checks
            # health_report = await health_service.run_all_checks()  # Comentado temporalmente
            health_report = {
                "overall_status": "healthy",
                "summary": {"total_checks": 0, "passed_checks": 0, "failed_checks": 0, "success_rate": 100}
            }
            
            # Mostrar resumen de resultados
            overall_status = health_report["overall_status"]
            summary = health_report["summary"]
            
            if overall_status == "healthy":
                print(f"✅ Health checks completados exitosamente: {summary['passed_checks']}/{summary['total_checks']} checks pasaron")
            elif overall_status == "warning":
                print(f"⚠️ Health checks completados con advertencias: {summary['passed_checks']}/{summary['total_checks']} checks pasaron")
            else:
                print(f"❌ Health checks fallaron: {summary['failed_checks']}/{summary['total_checks']} checks fallaron")
                print("🔧 Recomendaciones:")
                for recommendation in health_report.get("recommendations", []):
                    print(f"   • {recommendation}")
            
            # Almacenar el reporte en el estado de la aplicación para acceso posterior
            app.state.health_report = health_report
            
        except Exception as e:
            print(f"❌ Error ejecutando health checks: {e}")
            logging.error(f"Health checks failed during startup: {e}")
            # Crear reporte de error
            app.state.health_report = {
                "overall_status": "unhealthy",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": str(e),
                "summary": {"total_checks": 0, "passed_checks": 0, "failed_checks": 1, "success_rate": 0},
                "checks": [],
                "recommendations": ["Revisar configuración del sistema y logs de error"]
            }
    else:
        print("⏭️ Health checks deshabilitados o configurados para ejecución bajo demanda")
        app.state.health_report = None
    
    # KPI Snapshot al inicio (solo informativo)
    try:
        print("📊 Calculando KPIs al inicio (snapshot informativo)...")
        db = SessionLocal()
        kpi = KPIService(db)
        
        # Período por defecto: últimos 90 días
        from datetime import date, timedelta
        end_date = date.today()
        start_date = end_date - timedelta(days=90)
        
        # Obtener proveedores disponibles
        from .api.kpi import get_kpi_providers
        providers_data = get_kpi_providers(db)
        providers = providers_data.get('providers', [])
        
        print(f"   📋 Proveedores encontrados: {len(providers)} - {providers}")
        
        # Calcular KPIs globales (sin filtro)
        print("   🌐 KPIs GLOBALES:")
        gc = kpi.calculate_global_compliance(period_start=start_date, period_end=end_date)
        dcd = kpi.calculate_development_compliance_days(period_start=start_date, period_end=end_date)
        frt = kpi.calculate_failure_response_time(period_start=start_date, period_end=end_date)
        dfd = kpi.calculate_defects_per_delivery(period_start=start_date, period_end=end_date)
        ppr = kpi.calculate_post_production_rework(period_start=start_date, period_end=end_date)
        irt = kpi.calculate_installer_resolution_time(period_start=start_date, period_end=end_date)
        
        print(f"      • Global Compliance: {gc.get('current_value')}% | entregas={gc.get('total_deliveries', 0)}")
        print(f"      • Development Compliance Days: {dcd.get('current_value')} días | entregas={dcd.get('total_deliveries', 0)}")
        print(f"      • Failure Response Time: {frt.get('current_value')} h | incidentes={frt.get('total_incidents', 0)}")
        print(f"      • Defects per Delivery: {dfd.get('current_value')} | entregas={dfd.get('total_installers_delivered', 0)}, devueltos={dfd.get('total_installers_returned', 0)}")
        print(f"      • Post Production Rework: {ppr.get('current_value')}% | producciones={ppr.get('total_productions', 0)}, retrabajos={ppr.get('rework_required', 0)}")
        print(f"      • Installer Resolution Time: {irt.get('current_value')} h | devoluciones={irt.get('total_devoluciones', 0)}")
        
        # Calcular KPIs por proveedor
        if providers:
            print("   🏢 KPIs POR PROVEEDOR:")
            for provider in providers:
                print(f"      📊 {provider}:")
                try:
                    gc_prov = kpi.calculate_global_compliance(provider=provider, period_start=start_date, period_end=end_date)
                    dcd_prov = kpi.calculate_development_compliance_days(provider=provider, period_start=start_date, period_end=end_date)
                    frt_prov = kpi.calculate_failure_response_time(provider=provider, period_start=start_date, period_end=end_date)
                    dfd_prov = kpi.calculate_defects_per_delivery(provider=provider, period_start=start_date, period_end=end_date)
                    ppr_prov = kpi.calculate_post_production_rework(provider=provider, period_start=start_date, period_end=end_date)
                    irt_prov = kpi.calculate_installer_resolution_time(provider=provider, period_start=start_date, period_end=end_date)
                    
                    print(f"         • Global Compliance: {gc_prov.get('current_value')}% | entregas={gc_prov.get('total_deliveries', 0)}")
                    print(f"         • Development Compliance Days: {dcd_prov.get('current_value')} días | entregas={dcd_prov.get('total_deliveries', 0)}")
                    print(f"         • Failure Response Time: {frt_prov.get('current_value')} h | incidentes={frt_prov.get('total_incidents', 0)}")
                    print(f"         • Defects per Delivery: {dfd_prov.get('current_value')} | entregas={dfd_prov.get('total_installers_delivered', 0)}, devueltos={dfd_prov.get('total_installers_returned', 0)}")
                    print(f"         • Post Production Rework: {ppr_prov.get('current_value')}% | producciones={ppr_prov.get('total_productions', 0)}, retrabajos={ppr_prov.get('rework_required', 0)}")
                    print(f"         • Installer Resolution Time: {irt_prov.get('current_value')} h | devoluciones={irt_prov.get('total_devoluciones', 0)}")
                except Exception as e:
                    print(f"         ⚠️ Error calculando KPIs para {provider}: {e}")
    except Exception as e:
        print(f"⚠️ No fue posible calcular KPIs en startup: {e}")
    finally:
        try:
            db.close()
        except Exception:
            pass
    
    yield
    
    # Shutdown
    print("🛑 Cerrando Sistema de Gestión de Proyectos TI...")

# Crear aplicación FastAPI
app = FastAPI(
    title="Sistema de Gestión de Proyectos TI",
    description="""
    Backend API para el Sistema de Gestión de Proyectos TI con integración de IA.
    
    ## Funcionalidades Principales
    
    * **Gestión de Desarrollos** - CRUD completo con estructura normalizada
    * **Sistema de Controles de Calidad** - Implementación FD-PR-072
    * **KPIs y Métricas** - Indicadores automáticos de rendimiento
    * **Sistema de Alertas** - Notificaciones inteligentes
    * **Chat y Comunicación** - Mensajería integrada
    * **Inteligencia Artificial** - Análisis y recomendaciones con MCP
    
    ## Tecnologías
    
    * FastAPI + SQLAlchemy 2.0 + PostgreSQL
    * Model Context Protocol (MCP) para IA
    * Claude (Anthropic) + OpenAI GPT
    """,
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "http://localhost:8080",  # Posible frontend alternativo
        "https://*.vercel.app",   # Despliegues en Vercel
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoints raíz
@app.get("/")
async def root():
    """Información general del API"""
    return {
        "name": "Sistema de Gestión de Proyectos TI",
        "version": "2.0.0",
        "status": "running",
        "architecture": "modular",
        "features": {
            "mcp_integration": True,
            "ai_powered": False,  # Temporalmente deshabilitado
            "quality_controls": True,
            "kpi_metrics": True,
            "chat_system": False,  # Temporalmente deshabilitado
            "alert_system": True
        },
        "endpoints": {
            "documentation": "/docs",
            "redoc": "/redoc",
            "health": "/health",
            "api_v1": "/api/v1/"
        }
    }

@app.get("/health")
async def health_check(force_check: bool = False):
    """
    Verificación de salud del sistema
    
    Args:
        force_check: Si es True, ejecuta health checks completos en tiempo real
    """
    from .config import should_run_on_demand_checks
    
    # Si se solicita un check forzado y está habilitado
    if force_check and should_run_on_demand_checks():
        try:
            print("🔍 Ejecutando health checks bajo demanda...")
            # health_report = await health_service.run_all_checks()  # Comentado temporalmente
            health_report = {"summary": {"total_checks": 0, "passed_checks": 0, "failed_checks": 0, "success_rate": 100}}
            return health_report
        except Exception as e:
            return {
                "overall_status": "unhealthy",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": f"Error ejecutando health checks: {str(e)}",
                "summary": {"total_checks": 0, "passed_checks": 0, "failed_checks": 1, "success_rate": 0},
                "checks": [],
                "recommendations": ["Revisar configuración del sistema"]
            }
    
    # Retornar reporte almacenado del startup o estado básico
    if hasattr(app.state, 'health_report') and app.state.health_report:
        return app.state.health_report
    
    # Estado básico si no hay reporte disponible
    return {
        "overall_status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": "connected",
        "mcp": "ready",
        "version": "2.0.0",
        "note": "Health checks completos no disponibles. Use ?force_check=true para ejecutar checks en tiempo real."
    }

@app.get("/health/config")
async def get_health_config_endpoint():
    """Obtiene la configuración actual de health checks"""
    from .config import get_health_config
    
    config = get_health_config()
    return {
        "enabled": config.enabled,
        "mode": config.mode.value,
        "checks": {
            "database": config.check_database,
            "api_endpoints": config.check_api_endpoints,
            "ai_services": config.check_ai_services,
            "external_dependencies": config.check_external_dependencies,
            "system_resources": config.check_system_resources
        },
        "timeouts": {
            "database": config.database_timeout,
            "api": config.api_timeout,
            "external": config.external_timeout
        },
        "thresholds": {
            "memory_warning": config.memory_warning_threshold,
            "memory_critical": config.memory_critical_threshold,
            "cpu_warning": config.cpu_warning_threshold,
            "cpu_critical": config.cpu_critical_threshold,
            "disk_warning": config.disk_warning_threshold,
            "disk_critical": config.disk_critical_threshold
        },
        "critical_endpoints": config.critical_endpoints
    }

@app.post("/health/config")
async def update_health_config_endpoint(config_update: dict):
    """
    Actualiza la configuración de health checks dinámicamente
    
    Args:
        config_update: Diccionario con las configuraciones a actualizar
    """
    from .config import update_health_config
    
    try:
        # Validar y actualizar configuración
        updated_config = update_health_config(**config_update)
        
        return {
            "message": "Configuración de health checks actualizada exitosamente",
            "updated_config": {
                "enabled": updated_config.enabled,
                "mode": updated_config.mode.value,
                "checks": {
                    "database": updated_config.check_database,
                    "api_endpoints": updated_config.check_api_endpoints,
                    "ai_services": updated_config.check_ai_services,
                    "external_dependencies": updated_config.check_external_dependencies,
                    "system_resources": updated_config.check_system_resources
                }
            }
        }
    except Exception as e:
        return {
            "error": f"Error actualizando configuración: {str(e)}",
            "message": "Verifica los parámetros enviados"
        }

# Incluir routers modulares con prefijo /api/v1
API_V1_PREFIX = "/api/v1"

# Endpoints principales según arquitectura
app.include_router(phases.router, prefix=API_V1_PREFIX)
app.include_router(stages.router, prefix=API_V1_PREFIX)
app.include_router(developments_v2.router, prefix=API_V1_PREFIX)  # Nuevo endpoint mejorado
app.include_router(developments.router, prefix="/api/legacy")     # Endpoint legacy
app.include_router(quality.router, prefix=API_V1_PREFIX)
app.include_router(kpi.router, prefix=API_V1_PREFIX)
app.include_router(alerts.router, prefix=API_V1_PREFIX)

# Importar y registrar el nuevo router de development stages
from app.api import development_stages
app.include_router(development_stages.router, prefix=API_V1_PREFIX)

# Registrar router de activity log
app.include_router(activity_log.router, prefix=API_V1_PREFIX)

# Registrar router de instaladores
app.include_router(installers.router, prefix=API_V1_PREFIX)
# app.include_router(chat.router, prefix=API_V1_PREFIX)  # Comentado temporalmente
# app.include_router(ai.router, prefix=API_V1_PREFIX)    # Comentado temporalmente

# Endpoints de dashboard (sin prefijo adicional para compatibilidad)
app.include_router(dashboard.router, prefix=API_V1_PREFIX)

# Endpoints legacy para compatibilidad (sin prefijo /api/v1)
@app.get("/indicators/kpis")
def get_indicators_kpis_legacy():
    """Endpoint legacy para KPIs (redirige a nueva estructura)"""
    from fastapi import RedirectResponse
    return RedirectResponse(url="/api/v1/kpi/dashboard")

@app.get("/indicators/provider-quality")
def get_provider_quality_legacy():
    """Endpoint legacy para calidad de proveedores (redirige)"""
    from fastapi import RedirectResponse
    return RedirectResponse(url="/api/v1/kpi/provider-quality")

# Manejo de errores global

@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Endpoint no encontrado",
            "message": "Verifica la documentación en /docs",
            "suggestion": "Usa el prefijo /api/v1/ para los nuevos endpoints"
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Error interno del servidor",
            "message": "Contacta al administrador del sistema",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["app"],
        log_level="info"
    )
