# Guía de Observabilidad: Torre de Control

Esta guía explica cómo configurar y mantener el sistema de monitoreo basado en el stack **LGPs** (Loki, Grafana, Prometheus).

## 1. Arquitectura de Observabilidad

El sistema utiliza tres componentes principales integrados en el `docker-compose.yml`:
- **Prometheus**: Recolecta métricas numéricas (CPU, RAM, Tickets, Usuarios).
- **Loki**: Recolecta y procesa los logs estructurados (JSON) del backend.
- **Grafana**: El panel visual donde se consultan ambos orígenes de datos.

---

## 2. Métricas de Negocio (Backend)

Hemos implementado métricas personalizadas para el **Gestor de Proyectos TI** que no vienen por defecto en Prometheus:
- Archivo: `backend_v2/app/core/metrics.py`
- Tarea de fondo: Un worker en `app/main.py` actualiza los valores cada 60 segundos.

### Métricas disponibles en `/metrics`:
- `gestor_tickets_pendientes_total`: Cantidad actual de tickets en estado 'Pendiente'.
- `gestor_usuarios_registrados_total`: Total histórico de usuarios en la base de datos.
- `gestor_usuarios_online_total`: Usuarios con actividad en los últimos 10 minutos.

---

## 3. Configuración de la Torre de Control (Grafana)

Para replicar el diseño de la "Torre de Control", sigue estos pasos:

### Paso A: Importar el Dashboard
1. Copia el contenido del siguiente bloque JSON:

<details>
<summary><b>Haz clic aquí para ver el JSON del Dashboard</b></summary>

```json
{
  "annotations": { "list": [ { "builtIn": 1, "datasource": { "type": "grafana", "uid": "-- Grafana --" }, "enable": true, "hide": true, "iconColor": "rgba(0, 211, 255, 1)", "name": "Annotations & Alerts", "type": "dashboard" } ] },
  "editable": true,
  "panels": [
    {
      "title": "Usuarios en Línea",
      "type": "stat",
      "gridPos": { "h": 4, "w": 4, "x": 0, "y": 0 },
      "datasource": { "type": "prometheus" },
      "fieldConfig": {
        "defaults": {
          "color": { "mode": "thresholds" },
          "thresholds": { "mode": "absolute", "steps": [ { "color": "green", "value": null }, { "color": "blue", "value": 1 } ] }
        }
      },
      "targets": [ { "expr": "gestor_usuarios_online_total", "refId": "A" } ]
    },
    {
      "title": "Tickets Pendientes",
      "type": "stat",
      "gridPos": { "h": 4, "w": 4, "x": 4, "y": 0 },
      "datasource": { "type": "prometheus" },
      "fieldConfig": {
        "defaults": {
          "color": { "mode": "thresholds" },
          "thresholds": { "mode": "absolute", "steps": [ { "color": "green", "value": null }, { "color": "orange", "value": 10 }, { "color": "red", "value": 25 } ] }
        }
      },
      "targets": [ { "expr": "gestor_tickets_pendientes_total", "refId": "A" } ]
    },
    {
      "title": "Carga CPU",
      "type": "stat",
      "gridPos": { "h": 4, "w": 4, "x": 8, "y": 0 },
      "datasource": { "type": "prometheus" },
      "fieldConfig": {
        "defaults": { "unit": "percent", "min": 0, "max": 100, "thresholds": { "steps": [ { "color": "green", "value": null }, { "color": "red", "value": 80 } ] } }
      },
      "targets": [ { "expr": "rate(process_cpu_seconds_total[1m]) * 100", "refId": "A" } ]
    },
    {
      "title": "Sesiones Activas (Logs)",
      "type": "table",
      "gridPos": { "h": 8, "w": 24, "x": 0, "y": 4 },
      "datasource": { "type": "loki" },
      "targets": [
        { "expr": "{container=\"gestor-de-proyectos-ti-backend-1\"} | json | line_format \"{{.message}}\"", "refId": "A" }
      ],
      "transformations": [ { "id": "extractFields", "options": { "source": "message" } } ]
    }
  ],
  "schemaVersion": 38,
  "style": "dark",
  "title": "Torre de Control SaaS V2",
  "uid": "torre_control_v2"
}
```
</details>

2. En Grafana, ve a **Dashboards** -> **New** -> **Import**.
3. Pega el JSON y selecciona tus datasources de Prometheus y Loki.

---

## 4. Consideraciones para el Servidor de Producción

Cuando el sistema pase de `localhost` a un servidor real, ten en cuenta lo siguiente:

### A. IP del Servidor (`.env`)
Asegúrate de que la variable `HOST` en el archivo `.env` de la raíz tenga la IP del servidor:
```bash
HOST=192.168.40.200  # Cambiar por la IP real del servidor
```

### B. Acceso a Grafana / Prometheus
Por seguridad, en producción no se deberían exponer todos los puertos.
- **Grafana**: Puerto 3000.
- **Backend API**: Puerto 8000 (O a través del proxy Nginx en el puerto 80).

### C. Configuración de Nginx (Proxy)
Para evitar el error **405 (Not Allowed)** en el Login, el `frontend/nginx.conf` debe incluir el redireccionamiento para la API:
```nginx
location /api/v2/ {
    proxy_pass http://backend:8000/api/v2/;
    # ... cabeceras de proxy ...
}
```

### D. Conexión de Datasources
En Grafana, cuando configures el Datasource de Prometheus, usa la URL interna de Docker: `http://prometheus:9090` (NO uses la IP pública del servidor aquí, para que la comunicación sea interna entre contenedores).

---

## 5. Mantenimiento de Logs

Para evitar que el disco se llene, hemos limitado el tamaño de los logs en el `docker-compose.yml`:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```
Loki también está configurado para rotar logs antiguos automáticamente según la política definida en `monitoring/loki/loki-config.yml`.
