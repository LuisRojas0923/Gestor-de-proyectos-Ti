"""
Configuración del sistema de gestión de proyectos TI
"""

from .health_config import (
    HealthCheckConfig,
    HealthCheckMode,
    load_health_config,
    get_health_config,
    update_health_config,
    is_health_checks_enabled,
    should_run_startup_checks,
    should_run_on_demand_checks,
    DEFAULT_HEALTH_CONFIG
)

__all__ = [
    "HealthCheckConfig",
    "HealthCheckMode", 
    "load_health_config",
    "get_health_config",
    "update_health_config",
    "is_health_checks_enabled",
    "should_run_startup_checks",
    "should_run_on_demand_checks",
    "DEFAULT_HEALTH_CONFIG"
]
