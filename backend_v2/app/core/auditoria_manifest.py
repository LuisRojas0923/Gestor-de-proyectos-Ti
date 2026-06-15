"""
Manifiesto de cobertura de auditoría por módulo RBAC.

Cada entrada en SYSTEM_MODULES_REGISTRY (rbac_manifest.py) debe declararse aquí
como cubierto (middleware | explicito | parcial) o listarse en MODULOS_EXENTOS.

Tipos:
- middleware: mutaciones HTTP en /api/v2 cubiertas por auditoria_http_middleware
- explicito: requiere hints en router y/o registro en auditoria_rutas.py
- parcial: cobertura mixta documentada (revisar al ampliar el módulo)
- exento: sin acciones de usuario auditables (shell UI, catálogos, meta-módulos)
"""
from typing import Literal, TypedDict

CoberturaAuditoriaTipo = Literal["middleware", "explicito", "parcial", "exento"]


class CoberturaAuditoriaModulo(TypedDict, total=False):
    tipo: CoberturaAuditoriaTipo
    notas: str
    archivos: list[str]
    rutas_api: list[str]
    rutas_descarga: list[str]
    hereda_de: str


# Módulos con cobertura declarada (obligatorio para todo id RBAC no exento).
AUDITORIA_COBERTURA: dict[str, CoberturaAuditoriaModulo] = {
    "mis_solicitudes": {
        "tipo": "middleware",
        "notas": "Tickets / soporte",
        "rutas_api": ["/api/v2/soporte"],
    },
    "reserva_salas": {
        "tipo": "middleware",
        "rutas_api": ["/api/v2/reserva-salas"],
    },
    "requisiciones": {
        "tipo": "middleware",
        "rutas_api": ["/api/v2/erp"],
    },
    "requisiciones.almacen": {
        "tipo": "parcial",
        "notas": "Subflujo de requisiciones ERP",
        "rutas_api": ["/api/v2/erp"],
    },
    "requisiciones.presupuesto": {
        "tipo": "parcial",
        "notas": "Subflujo de requisiciones ERP",
        "rutas_api": ["/api/v2/erp"],
    },
    "viaticos_gestion": {
        "tipo": "middleware",
        "rutas_api": ["/api/v2/viaticos"],
    },
    "viaticos_estado": {
        "tipo": "explicito",
        "notas": "GET estado-cuenta/xlsx en auditoria_rutas",
        "rutas_descarga": ["/api/v2/viaticos/estado-cuenta/xlsx"],
        "rutas_api": ["/api/v2/viaticos"],
    },
    "desarrollo": {
        "tipo": "explicito",
        "notas": "Snapshots en desarrollos/actividades routers",
        "archivos": [
            "backend_v2/app/api/desarrollos/router.py",
            "backend_v2/app/api/desarrollos/actividades_router.py",
        ],
        "rutas_api": ["/api/v2/desarrollos", "/api/v2/actividades"],
    },
    "developments": {
        "tipo": "explicito",
        "notas": "Alias panel de desarrollos",
        "hereda_de": "desarrollo",
        "rutas_api": ["/api/v2/desarrollos", "/api/v2/actividades"],
    },
    "gestion_humana": {
        "tipo": "explicito",
        "notas": "Descargas certificado 220 y plantilla en impuestos",
        "archivos": ["backend_v2/app/api/impuestos.py"],
        "rutas_api": ["/api/v2/impuestos"],
    },
    "ticket-management": {
        "tipo": "middleware",
        "rutas_api": ["/api/v2/soporte"],
    },
    "indicators": {
        "tipo": "middleware",
        "rutas_api": ["/api/v2/kpis"],
    },
    "reports": {
        "tipo": "parcial",
        "notas": "Reportes mayormente lectura; mutaciones en otros módulos",
        "rutas_api": ["/api/v2/reportes"],
    },
    "validaciones_asignacion": {
        "tipo": "middleware",
        "rutas_api": ["/api/v2/validaciones-asignacion"],
    },
    "jerarquia_organizacional": {
        "tipo": "middleware",
        "rutas_api": ["/api/v2/jerarquia"],
    },
    "settings": {
        "tipo": "middleware",
        "rutas_api": ["/api/v2/auth", "/api/v2/config"],
    },
    "viaticos_reportes": {
        "tipo": "middleware",
        "rutas_api": ["/api/v2/viaticos"],
    },
    "wbs_templates": {
        "tipo": "middleware",
        "rutas_api": ["/api/v2/desarrollos/plantillas"],
    },
    "lineas_corporativas": {
        "tipo": "middleware",
        "rutas_api": ["/api/v2/lineas-corporativas"],
    },
    "control-tower": {
        "tipo": "parcial",
        "notas": "Heartbeat excluido; resto vía middleware",
        "rutas_api": ["/api/v2/panel-control"],
    },
    "panel_maestro": {
        "tipo": "parcial",
        "notas": "Panel control / KPIs agregados",
        "rutas_api": ["/api/v2/panel-control", "/api/v2/kpis"],
    },
    "admin_usuarios": {
        "tipo": "middleware",
        "rutas_api": ["/api/v2/auth"],
    },
    "user-admin": {
        "tipo": "middleware",
        "rutas_api": ["/api/v2/auth"],
    },
    "admin_roles": {
        "tipo": "middleware",
        "rutas_api": ["/api/v2/auth"],
    },
    "viaticos_director_panel": {
        "tipo": "middleware",
        "rutas_api": ["/api/v2/viaticos"],
    },
    "reserva_salas_admin": {
        "tipo": "middleware",
        "rutas_api": ["/api/v2/reserva-salas"],
    },
    "inventario_anual": {
        "tipo": "middleware",
        "rutas_api": ["/api/v2/inventario"],
    },
    "inventario_2026": {
        "tipo": "explicito",
        "notas": "Plantillas Excel en auditoria_rutas",
        "rutas_descarga": [
            "/api/v2/inventario/plantilla-maestra",
            "/api/v2/inventario/plantilla-transito",
        ],
        "rutas_api": ["/api/v2/inventario"],
    },
    "comisiones": {
        "tipo": "explicito",
        "notas": "Router comisiones + GET datos sensible",
        "archivos": [
            "backend_v2/app/api/novedades_nomina/routers/comisiones.py",
        ],
        "rutas_api": ["/api/v2/novedades-nomina/comisiones"],
    },
    "nomina_novedades": {
        "tipo": "parcial",
        "notas": "Mutaciones middleware; descargas en auditoria_rutas",
        "rutas_api": ["/api/v2/novedades-nomina"],
    },
    "nomina_horas_extras": {
        "tipo": "parcial",
        "notas": "Cálculo pre-liquidación y CRUD catálogo (S1); middleware cubre mutaciones",
        "archivos": [
            "backend_v2/app/api/novedades_nomina/routers/horas_extras.py",
        ],
        "rutas_api": ["/api/v2/novedades-nomina/horas-extras"],
    },
}

# Módulos RBAC sin acciones de backend auditables (solo navegación / consulta meta).
MODULOS_EXENTOS_AUDITORIA: frozenset[str] = frozenset({
    "service-portal",
    "sistemas",
    "mejoramiento",
    "chat",
    "dashboard",
    "design-catalog",
    "auditoria_sistema",
})
