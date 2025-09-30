# Sistema de Health Checks

El sistema de health checks del backend permite verificar automáticamente el estado de todos los servicios y componentes críticos del sistema.

## Características

- ✅ **Configurable**: Se puede activar/desactivar y configurar mediante variables de entorno
- 🔄 **Múltiples modos**: Startup, bajo demanda, o continuo
- 📊 **Comprehensive**: Verifica base de datos, endpoints, servicios de IA, recursos del sistema
- 🚀 **No intrusivo**: Se ejecuta al inicio sin afectar el rendimiento
- 📈 **Detallado**: Proporciona métricas y recomendaciones

## Configuración

### Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```bash
# Configuración general
HEALTH_CHECKS_ENABLED=true
HEALTH_CHECKS_MODE=startup

# Checks específicos
HEALTH_CHECK_DATABASE=true
HEALTH_CHECK_API_ENDPOINTS=true
HEALTH_CHECK_AI_SERVICES=true
HEALTH_CHECK_EXTERNAL=false
HEALTH_CHECK_SYSTEM_RESOURCES=true

# Timeouts
HEALTH_CHECK_DB_TIMEOUT=5.0
HEALTH_CHECK_API_TIMEOUT=5.0
HEALTH_CHECK_EXTERNAL_TIMEOUT=3.0

# Umbrales de recursos
HEALTH_MEMORY_WARNING_THRESHOLD=80.0
HEALTH_MEMORY_CRITICAL_THRESHOLD=90.0
HEALTH_CPU_WARNING_THRESHOLD=80.0
HEALTH_CPU_CRITICAL_THRESHOLD=90.0
HEALTH_DISK_WARNING_THRESHOLD=80.0
HEALTH_DISK_CRITICAL_THRESHOLD=90.0

# Endpoints críticos
HEALTH_CRITICAL_ENDPOINTS=/,/health,/api/v1/developments,/api/v1/kpi/dashboard,/api/v1/quality/controls,/api/v1/alerts/upcoming

# Logging
HEALTH_LOG_LEVEL=INFO
HEALTH_LOG_FAILURES_ONLY=false
```

### Modos de Ejecución

- `disabled`: No ejecutar health checks
- `startup`: Solo al inicio de la aplicación (recomendado)
- `on_demand`: Solo cuando se solicite manualmente
- `continuous`: Ejecutar continuamente (no implementado aún)

## Endpoints

### GET /health

Verificación básica de salud del sistema.

**Parámetros:**
- `force_check` (opcional): Si es `true`, ejecuta health checks completos en tiempo real

**Ejemplos:**
```bash
# Verificación básica
curl http://localhost:8000/health

# Verificación completa en tiempo real
curl http://localhost:8000/health?force_check=true
```

### GET /health/config

Obtiene la configuración actual de health checks.

```bash
curl http://localhost:8000/health/config
```

### POST /health/config

Actualiza la configuración de health checks dinámicamente.

```bash
curl -X POST http://localhost:8000/health/config \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "mode": "startup",
    "check_database": true,
    "check_api_endpoints": true
  }'
```

## Health Checks Implementados

### 1. Database Connection
- Verifica conexión a PostgreSQL
- Ejecuta query de prueba
- Tiempo de respuesta

### 2. Database Tables
- Verifica existencia de tablas críticas
- Lista tablas existentes y faltantes
- Identifica problemas de migración

### 3. API Endpoints
- Verifica respuesta de endpoints críticos
- Tiempo de respuesta de cada endpoint
- Identifica endpoints caídos

### 4. AI Services
- Verifica configuración de servicios de IA
- OpenAI, Claude, Google Gemini
- Estado de disponibilidad

### 5. External Dependencies
- Verifica conectividad a servicios externos
- APIs de terceros
- Servicios opcionales vs requeridos

### 6. System Resources
- Uso de memoria RAM
- Uso de CPU
- Espacio en disco
- Umbrales configurables

## Respuesta del Health Check

```json
{
  "overall_status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "summary": {
    "total_checks": 6,
    "passed_checks": 6,
    "failed_checks": 0,
    "success_rate": 100.0
  },
  "checks": [
    {
      "name": "database_connection",
      "status": "healthy",
      "message": "Conexión a PostgreSQL exitosa",
      "response_time_ms": 45.2,
      "timestamp": "2024-01-15T10:30:00Z",
      "details": {
        "query_result": 1
      }
    }
  ],
  "recommendations": []
}
```

## Estados

- `healthy`: Todo funcionando correctamente
- `warning`: Algunos problemas menores detectados
- `unhealthy`: Problemas críticos que requieren atención
- `unknown`: No se pudo determinar el estado

## Uso en Desarrollo

### Activar/Desactivar

```bash
# Desactivar completamente
export HEALTH_CHECKS_ENABLED=false

# Solo al inicio (recomendado para desarrollo)
export HEALTH_CHECKS_MODE=startup

# Solo bajo demanda
export HEALTH_CHECKS_MODE=on_demand
```

### Verificar Estado

```bash
# Estado básico
curl http://localhost:8000/health

# Estado completo
curl http://localhost:8000/health?force_check=true

# Configuración actual
curl http://localhost:8000/health/config
```

## Uso en Producción

### Configuración Recomendada

```bash
HEALTH_CHECKS_ENABLED=true
HEALTH_CHECKS_MODE=startup
HEALTH_CHECK_EXTERNAL=false  # Evitar llamadas externas
HEALTH_LOG_FAILURES_ONLY=true  # Solo log de errores
```

### Monitoreo

- Los health checks se ejecutan automáticamente al inicio
- El endpoint `/health` está disponible para monitoreo externo
- Los logs muestran el estado de los health checks
- Se pueden integrar con sistemas de monitoreo como Prometheus

## Troubleshooting

### Health Checks Fallan

1. Verificar configuración de base de datos
2. Revisar conectividad de red
3. Verificar recursos del sistema
4. Revisar logs de la aplicación

### Performance

- Los health checks tienen timeouts configurables
- Se ejecutan en paralelo para mejor rendimiento
- No afectan el rendimiento normal de la aplicación

### Logs

```bash
# Ver logs de health checks
grep "health checks" logs/app.log

# Ver solo errores
grep "❌" logs/app.log
```

## Integración con Docker

El sistema funciona perfectamente en contenedores Docker. Las variables de entorno se pueden configurar en el `docker-compose.yml`:

```yaml
environment:
  - HEALTH_CHECKS_ENABLED=true
  - HEALTH_CHECKS_MODE=startup
  - HEALTH_CHECK_DATABASE=true
```

## Extensibilidad

El sistema está diseñado para ser fácilmente extensible:

1. Agregar nuevos health checks en `health_service.py`
2. Configurar nuevos parámetros en `health_config.py`
3. Agregar nuevos endpoints en `main.py`

## Mejores Prácticas

1. **Desarrollo**: Usar modo `startup` para verificar configuración
2. **Testing**: Usar modo `on_demand` para tests automatizados
3. **Producción**: Usar modo `startup` con logging de errores únicamente
4. **Monitoreo**: Integrar con sistemas de alertas externos
5. **Performance**: Ajustar timeouts según el entorno
