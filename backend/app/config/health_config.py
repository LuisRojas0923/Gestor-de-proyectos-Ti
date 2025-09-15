"""
Configuración para el sistema de Health Checks
Permite activar/desactivar y configurar los health checks del sistema
"""

import os
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

class HealthCheckMode(Enum):
    """Modos de ejecución de health checks"""
    DISABLED = "disabled"      # No ejecutar health checks
    STARTUP_ONLY = "startup"   # Solo al inicio de la aplicación
    ON_DEMAND = "on_demand"    # Solo cuando se solicite manualmente
    CONTINUOUS = "continuous"  # Ejecutar continuamente (no implementado aún)

@dataclass
class HealthCheckConfig:
    """Configuración para health checks"""
    
    # Configuración general
    enabled: bool = True
    mode: HealthCheckMode = HealthCheckMode.STARTUP_ONLY
    
    # Configuración de checks específicos
    check_database: bool = True
    check_api_endpoints: bool = True
    check_ai_services: bool = True
    check_external_dependencies: bool = False  # Por defecto deshabilitado para evitar llamadas externas
    check_system_resources: bool = True
    
    # Configuración de timeouts
    database_timeout: float = 5.0
    api_timeout: float = 5.0
    external_timeout: float = 3.0
    
    # Configuración de umbrales
    memory_warning_threshold: float = 80.0
    memory_critical_threshold: float = 90.0
    cpu_warning_threshold: float = 80.0
    cpu_critical_threshold: float = 90.0
    disk_warning_threshold: float = 80.0
    disk_critical_threshold: float = 90.0
    
    # Configuración de endpoints a verificar
    critical_endpoints: List[str] = None
    
    # Configuración de logging
    log_level: str = "INFO"
    log_failures_only: bool = False
    
    def __post_init__(self):
        """Inicialización post-creación del dataclass"""
        if self.critical_endpoints is None:
            self.critical_endpoints = [
                "/",
                "/health",
                "/api/v1/developments",
                "/api/v1/kpi/dashboard",
                "/api/v1/quality/controls",
                "/api/v1/alerts/upcoming"
            ]

def load_health_config() -> HealthCheckConfig:
    """Carga la configuración de health checks desde variables de entorno"""
    
    # Configuración general
    enabled = os.getenv("HEALTH_CHECKS_ENABLED", "true").lower() == "true"
    
    mode_str = os.getenv("HEALTH_CHECKS_MODE", "startup").lower()
    try:
        mode = HealthCheckMode(mode_str)
    except ValueError:
        mode = HealthCheckMode.STARTUP_ONLY
    
    # Configuración de checks específicos
    check_database = os.getenv("HEALTH_CHECK_DATABASE", "true").lower() == "true"
    check_api_endpoints = os.getenv("HEALTH_CHECK_API_ENDPOINTS", "true").lower() == "true"
    check_ai_services = os.getenv("HEALTH_CHECK_AI_SERVICES", "true").lower() == "true"
    check_external_dependencies = os.getenv("HEALTH_CHECK_EXTERNAL", "false").lower() == "true"
    check_system_resources = os.getenv("HEALTH_CHECK_SYSTEM_RESOURCES", "true").lower() == "true"
    
    # Configuración de timeouts
    database_timeout = float(os.getenv("HEALTH_CHECK_DB_TIMEOUT", "5.0"))
    api_timeout = float(os.getenv("HEALTH_CHECK_API_TIMEOUT", "5.0"))
    external_timeout = float(os.getenv("HEALTH_CHECK_EXTERNAL_TIMEOUT", "3.0"))
    
    # Configuración de umbrales
    memory_warning_threshold = float(os.getenv("HEALTH_MEMORY_WARNING_THRESHOLD", "80.0"))
    memory_critical_threshold = float(os.getenv("HEALTH_MEMORY_CRITICAL_THRESHOLD", "90.0"))
    cpu_warning_threshold = float(os.getenv("HEALTH_CPU_WARNING_THRESHOLD", "80.0"))
    cpu_critical_threshold = float(os.getenv("HEALTH_CPU_CRITICAL_THRESHOLD", "90.0"))
    disk_warning_threshold = float(os.getenv("HEALTH_DISK_WARNING_THRESHOLD", "80.0"))
    disk_critical_threshold = float(os.getenv("HEALTH_DISK_CRITICAL_THRESHOLD", "90.0"))
    
    # Configuración de endpoints críticos
    endpoints_str = os.getenv("HEALTH_CRITICAL_ENDPOINTS", "")
    if endpoints_str:
        critical_endpoints = [ep.strip() for ep in endpoints_str.split(",") if ep.strip()]
    else:
        critical_endpoints = None
    
    # Configuración de logging
    log_level = os.getenv("HEALTH_LOG_LEVEL", "INFO").upper()
    log_failures_only = os.getenv("HEALTH_LOG_FAILURES_ONLY", "false").lower() == "true"
    
    return HealthCheckConfig(
        enabled=enabled,
        mode=mode,
        check_database=check_database,
        check_api_endpoints=check_api_endpoints,
        check_ai_services=check_ai_services,
        check_external_dependencies=check_external_dependencies,
        check_system_resources=check_system_resources,
        database_timeout=database_timeout,
        api_timeout=api_timeout,
        external_timeout=external_timeout,
        memory_warning_threshold=memory_warning_threshold,
        memory_critical_threshold=memory_critical_threshold,
        cpu_warning_threshold=cpu_warning_threshold,
        cpu_critical_threshold=cpu_critical_threshold,
        disk_warning_threshold=disk_warning_threshold,
        disk_critical_threshold=disk_critical_threshold,
        critical_endpoints=critical_endpoints,
        log_level=log_level,
        log_failures_only=log_failures_only
    )

def get_health_config() -> HealthCheckConfig:
    """Obtiene la configuración de health checks (singleton)"""
    if not hasattr(get_health_config, '_instance'):
        get_health_config._instance = load_health_config()
    return get_health_config._instance

def update_health_config(**kwargs) -> HealthCheckConfig:
    """Actualiza la configuración de health checks dinámicamente"""
    current_config = get_health_config()
    
    # Crear nueva instancia con los valores actualizados
    config_dict = current_config.__dict__.copy()
    config_dict.update(kwargs)
    
    new_config = HealthCheckConfig(**config_dict)
    get_health_config._instance = new_config
    
    return new_config

def is_health_checks_enabled() -> bool:
    """Verifica si los health checks están habilitados"""
    return get_health_config().enabled

def should_run_startup_checks() -> bool:
    """Verifica si se deben ejecutar health checks al inicio"""
    config = get_health_config()
    return config.enabled and config.mode in [HealthCheckMode.STARTUP_ONLY, HealthCheckMode.CONTINUOUS]

def should_run_on_demand_checks() -> bool:
    """Verifica si se pueden ejecutar health checks bajo demanda"""
    config = get_health_config()
    return config.enabled and config.mode in [HealthCheckMode.ON_DEMAND, HealthCheckMode.CONTINUOUS]

# Configuración por defecto
DEFAULT_HEALTH_CONFIG = HealthCheckConfig()
