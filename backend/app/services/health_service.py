"""
Servicio de Health Checks para el Sistema de Gestión de Proyectos TI
Valida el estado de todos los servicios y endpoints críticos
"""

import asyncio
import aiohttp
import time
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging
from enum import Enum

from ..database import SessionLocal, engine
from ..models import Base

logger = logging.getLogger(__name__)

class HealthStatus(Enum):
    """Estados posibles de los health checks"""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    WARNING = "warning"
    UNKNOWN = "unknown"

class HealthCheckResult:
    """Resultado de un health check individual"""
    def __init__(self, name: str, status: HealthStatus, message: str = "", response_time: float = 0.0, details: Dict = None):
        self.name = name
        self.status = status
        self.message = message
        self.response_time = response_time
        self.details = details or {}
        self.timestamp = datetime.now(timezone.utc)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "status": self.status.value,
            "message": self.message,
            "response_time_ms": round(self.response_time * 1000, 2),
            "timestamp": self.timestamp.isoformat(),
            "details": self.details
        }

class HealthService:
    """Servicio principal para realizar health checks del sistema"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results: List[HealthCheckResult] = []
        self.overall_status = HealthStatus.UNKNOWN
        self.total_checks = 0
        self.passed_checks = 0
        self.failed_checks = 0
        
    async def run_all_checks(self) -> Dict[str, Any]:
        """Ejecuta todos los health checks y retorna el resultado completo"""
        logger.info("🔍 Iniciando health checks del sistema...")
        
        self.results = []
        self.total_checks = 0
        self.passed_checks = 0
        self.failed_checks = 0
        
        # Lista de health checks a ejecutar
        checks = [
            self._check_database_connection,
            self._check_database_tables,
            self._check_api_endpoints,
            self._check_ai_services,
            self._check_external_dependencies,
            self._check_system_resources
        ]
        
        # Ejecutar checks en paralelo para mejor rendimiento
        tasks = [check() for check in checks]
        await asyncio.gather(*tasks, return_exceptions=True)
        
        # Calcular estado general
        self._calculate_overall_status()
        
        return self._generate_report()
    
    async def _check_database_connection(self):
        """Verifica la conexión a la base de datos"""
        start_time = time.time()
        try:
            db = SessionLocal()
            # Ejecutar query simple para verificar conexión
            result = db.execute(text("SELECT 1 as test"))
            db.close()
            
            response_time = time.time() - start_time
            self.results.append(HealthCheckResult(
                name="database_connection",
                status=HealthStatus.HEALTHY,
                message="Conexión a PostgreSQL exitosa",
                response_time=response_time,
                details={"query_result": result.fetchone()[0]}
            ))
            self.passed_checks += 1
            
        except Exception as e:
            response_time = time.time() - start_time
            self.results.append(HealthCheckResult(
                name="database_connection",
                status=HealthStatus.UNHEALTHY,
                message=f"Error de conexión a la base de datos: {str(e)}",
                response_time=response_time
            ))
            self.failed_checks += 1
            logger.error(f"❌ Database connection check failed: {e}")
        
        self.total_checks += 1
    
    async def _check_database_tables(self):
        """Verifica que las tablas principales existan"""
        start_time = time.time()
        try:
            db = SessionLocal()
            
            # Verificar tablas críticas
            critical_tables = [
                'developments', 'phases', 'stages', 'quality_controls',
                'kpi_metrics', 'alerts', 'chat_sessions', 'chat_messages'
            ]
            
            existing_tables = []
            missing_tables = []
            
            for table in critical_tables:
                try:
                    result = db.execute(text(f"SELECT COUNT(*) FROM {table} LIMIT 1"))
                    existing_tables.append(table)
                except Exception:
                    missing_tables.append(table)
            
            db.close()
            
            response_time = time.time() - start_time
            
            if missing_tables:
                status = HealthStatus.WARNING if len(missing_tables) < len(critical_tables) else HealthStatus.UNHEALTHY
                message = f"Tablas faltantes: {', '.join(missing_tables)}"
            else:
                status = HealthStatus.HEALTHY
                message = "Todas las tablas críticas están disponibles"
            
            self.results.append(HealthCheckResult(
                name="database_tables",
                status=status,
                message=message,
                response_time=response_time,
                details={
                    "existing_tables": existing_tables,
                    "missing_tables": missing_tables,
                    "total_tables_checked": len(critical_tables)
                }
            ))
            
            if status == HealthStatus.HEALTHY:
                self.passed_checks += 1
            else:
                self.failed_checks += 1
                
        except Exception as e:
            response_time = time.time() - start_time
            self.results.append(HealthCheckResult(
                name="database_tables",
                status=HealthStatus.UNHEALTHY,
                message=f"Error verificando tablas: {str(e)}",
                response_time=response_time
            ))
            self.failed_checks += 1
            logger.error(f"❌ Database tables check failed: {e}")
        
        self.total_checks += 1
    
    async def _check_api_endpoints(self):
        """Verifica que los endpoints principales respondan correctamente"""
        start_time = time.time()
        
        # Endpoints críticos a verificar
        critical_endpoints = [
            "/",
            "/health",
            "/api/v1/developments",
            "/api/v1/kpi/dashboard",
            "/api/v1/quality/controls",
            "/api/v1/alerts/upcoming"
        ]
        
        healthy_endpoints = []
        unhealthy_endpoints = []
        
        async with aiohttp.ClientSession() as session:
            for endpoint in critical_endpoints:
                try:
                    url = f"{self.base_url}{endpoint}"
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                        if response.status == 200:
                            healthy_endpoints.append(endpoint)
                        else:
                            unhealthy_endpoints.append(f"{endpoint} (status: {response.status})")
                except Exception as e:
                    unhealthy_endpoints.append(f"{endpoint} (error: {str(e)})")
        
        response_time = time.time() - start_time
        
        if unhealthy_endpoints:
            status = HealthStatus.WARNING if len(unhealthy_endpoints) < len(critical_endpoints) else HealthStatus.UNHEALTHY
            message = f"Endpoints con problemas: {len(unhealthy_endpoints)}"
        else:
            status = HealthStatus.HEALTHY
            message = "Todos los endpoints críticos responden correctamente"
        
        self.results.append(HealthCheckResult(
            name="api_endpoints",
            status=status,
            message=message,
            response_time=response_time,
            details={
                "healthy_endpoints": healthy_endpoints,
                "unhealthy_endpoints": unhealthy_endpoints,
                "total_endpoints_checked": len(critical_endpoints)
            }
        ))
        
        if status == HealthStatus.HEALTHY:
            self.passed_checks += 1
        else:
            self.failed_checks += 1
        
        self.total_checks += 1
    
    async def _check_ai_services(self):
        """Verifica el estado de los servicios de IA"""
        start_time = time.time()
        
        try:
            # Verificar si los servicios de IA están configurados
            import os
            openai_key = os.getenv("OPENAI_API_KEY")
            claude_key = os.getenv("ANTHROPIC_API_KEY")
            
            ai_services_status = {
                "openai_configured": bool(openai_key),
                "claude_configured": bool(claude_key),
                "ai_service_available": True  # Asumiendo que el servicio está disponible
            }
            
            configured_services = sum(1 for v in ai_services_status.values() if v)
            total_services = len(ai_services_status)
            
            if configured_services == total_services:
                status = HealthStatus.HEALTHY
                message = "Todos los servicios de IA están configurados"
            elif configured_services > 0:
                status = HealthStatus.WARNING
                message = f"Solo {configured_services}/{total_services} servicios de IA configurados"
            else:
                status = HealthStatus.UNHEALTHY
                message = "Ningún servicio de IA está configurado"
            
            response_time = time.time() - start_time
            
            self.results.append(HealthCheckResult(
                name="ai_services",
                status=status,
                message=message,
                response_time=response_time,
                details=ai_services_status
            ))
            
            if status == HealthStatus.HEALTHY:
                self.passed_checks += 1
            else:
                self.failed_checks += 1
                
        except Exception as e:
            response_time = time.time() - start_time
            self.results.append(HealthCheckResult(
                name="ai_services",
                status=HealthStatus.UNHEALTHY,
                message=f"Error verificando servicios de IA: {str(e)}",
                response_time=response_time
            ))
            self.failed_checks += 1
            logger.error(f"❌ AI services check failed: {e}")
        
        self.total_checks += 1
    
    async def _check_external_dependencies(self):
        """Verifica dependencias externas críticas"""
        start_time = time.time()
        
        # Verificar conectividad a servicios externos
        external_services = [
            {"name": "OpenAI API", "url": "https://api.openai.com/v1/models", "required": False},
            {"name": "Anthropic API", "url": "https://api.anthropic.com/v1/messages", "required": False},
        ]
        
        healthy_services = []
        unhealthy_services = []
        
        async with aiohttp.ClientSession() as session:
            for service in external_services:
                try:
                    async with session.get(service["url"], timeout=aiohttp.ClientTimeout(total=3)) as response:
                        if response.status in [200, 401, 403]:  # 401/403 indican que el servicio está disponible pero requiere auth
                            healthy_services.append(service["name"])
                        else:
                            unhealthy_services.append(f"{service['name']} (status: {response.status})")
                except Exception as e:
                    if service["required"]:
                        unhealthy_services.append(f"{service['name']} (error: {str(e)})")
                    else:
                        # Para servicios no requeridos, solo registramos como warning
                        pass
        
        response_time = time.time() - start_time
        
        if unhealthy_services:
            status = HealthStatus.WARNING
            message = f"Algunos servicios externos no están disponibles: {len(unhealthy_services)}"
        else:
            status = HealthStatus.HEALTHY
            message = "Servicios externos verificados"
        
        self.results.append(HealthCheckResult(
            name="external_dependencies",
            status=status,
            message=message,
            response_time=response_time,
            details={
                "healthy_services": healthy_services,
                "unhealthy_services": unhealthy_services
            }
        ))
        
        if status == HealthStatus.HEALTHY:
            self.passed_checks += 1
        else:
            self.failed_checks += 1
        
        self.total_checks += 1
    
    async def _check_system_resources(self):
        """Verifica recursos del sistema"""
        start_time = time.time()
        
        try:
            import psutil
            
            # Verificar uso de memoria
            memory = psutil.virtual_memory()
            memory_usage_percent = memory.percent
            
            # Verificar uso de CPU
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Verificar espacio en disco
            disk = psutil.disk_usage('/')
            disk_usage_percent = (disk.used / disk.total) * 100
            
            resource_status = {
                "memory_usage_percent": memory_usage_percent,
                "cpu_usage_percent": cpu_percent,
                "disk_usage_percent": disk_usage_percent,
                "memory_available_gb": round(memory.available / (1024**3), 2),
                "disk_free_gb": round(disk.free / (1024**3), 2)
            }
            
            # Determinar estado basado en umbrales
            if memory_usage_percent > 90 or cpu_percent > 90 or disk_usage_percent > 90:
                status = HealthStatus.UNHEALTHY
                message = "Recursos del sistema críticos"
            elif memory_usage_percent > 80 or cpu_percent > 80 or disk_usage_percent > 80:
                status = HealthStatus.WARNING
                message = "Recursos del sistema altos"
            else:
                status = HealthStatus.HEALTHY
                message = "Recursos del sistema normales"
            
            response_time = time.time() - start_time
            
            self.results.append(HealthCheckResult(
                name="system_resources",
                status=status,
                message=message,
                response_time=response_time,
                details=resource_status
            ))
            
            if status == HealthStatus.HEALTHY:
                self.passed_checks += 1
            else:
                self.failed_checks += 1
                
        except ImportError:
            # psutil no está disponible, saltar este check
            response_time = time.time() - start_time
            self.results.append(HealthCheckResult(
                name="system_resources",
                status=HealthStatus.WARNING,
                message="psutil no disponible - no se pueden verificar recursos del sistema",
                response_time=response_time
            ))
            self.passed_checks += 1  # No es un fallo crítico
        except Exception as e:
            response_time = time.time() - start_time
            self.results.append(HealthCheckResult(
                name="system_resources",
                status=HealthStatus.WARNING,
                message=f"Error verificando recursos: {str(e)}",
                response_time=response_time
            ))
            self.passed_checks += 1  # No es un fallo crítico
        
        self.total_checks += 1
    
    def _calculate_overall_status(self):
        """Calcula el estado general del sistema basado en los resultados individuales"""
        if self.total_checks == 0:
            self.overall_status = HealthStatus.UNKNOWN
            return
        
        failure_rate = self.failed_checks / self.total_checks
        
        if failure_rate == 0:
            self.overall_status = HealthStatus.HEALTHY
        elif failure_rate < 0.3:  # Menos del 30% de fallos
            self.overall_status = HealthStatus.WARNING
        else:
            self.overall_status = HealthStatus.UNHEALTHY
    
    def _generate_report(self) -> Dict[str, Any]:
        """Genera el reporte completo de health checks"""
        return {
            "overall_status": self.overall_status.value,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "summary": {
                "total_checks": self.total_checks,
                "passed_checks": self.passed_checks,
                "failed_checks": self.failed_checks,
                "success_rate": round((self.passed_checks / self.total_checks) * 100, 2) if self.total_checks > 0 else 0
            },
            "checks": [result.to_dict() for result in self.results],
            "recommendations": self._generate_recommendations()
        }
    
    def _generate_recommendations(self) -> List[str]:
        """Genera recomendaciones basadas en los resultados de los health checks"""
        recommendations = []
        
        for result in self.results:
            if result.status == HealthStatus.UNHEALTHY:
                if result.name == "database_connection":
                    recommendations.append("Verificar configuración de PostgreSQL y credenciales")
                elif result.name == "database_tables":
                    recommendations.append("Ejecutar migraciones de base de datos")
                elif result.name == "api_endpoints":
                    recommendations.append("Revisar configuración de endpoints y servicios")
                elif result.name == "ai_services":
                    recommendations.append("Configurar claves de API para servicios de IA")
            elif result.status == HealthStatus.WARNING:
                if result.name == "system_resources":
                    recommendations.append("Monitorear uso de recursos del sistema")
                elif result.name == "external_dependencies":
                    recommendations.append("Verificar conectividad a servicios externos")
        
        return recommendations

# Instancia global del servicio de health checks
health_service = HealthService()
