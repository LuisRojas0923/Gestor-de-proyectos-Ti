from typing import List, Dict, Any

# ==========================================
# MANIFIESTO CENTRAL DE MÓDULOS DEL SISTEMA
# ==========================================
# Single Source of Truth (SSOT) para el sistema RBAC.
# El backend auto-sincronizará esta lista con la base de datos
# en cada arranque (Upsert) conservando nombres editados por UI.
# ==========================================

SYSTEM_MODULES_REGISTRY: List[Dict[str, Any]] = [
    # Módulos del Portal de Usuarios
    {
        "id": "mis_solicitudes",
        "nombre": "Gestión de Solicitudes TI",
        "categoria": "portal",
        "es_critico": True,
        "descripcion": "Crea nuevos requerimientos o consulta el estado de tus tickets actuales.",
    },
    {
        "id": "reserva_salas",
        "nombre": "Reserva de salas",
        "categoria": "portal",
        "es_critico": False,
        "descripcion": "Reserva salas de reuniones y espacios para tu equipo.",
    },
    {
        "id": "requisiciones",
        "nombre": "Sistema de Solicitudes",
        "categoria": "portal",
        "es_critico": True,
        "descripcion": "Gestión Master de Requisiciones.",
    },
    # Sub-Módulos de Requisiciones
    {
        "id": "requisiciones.almacen",
        "nombre": "Requisiciones - Almacén",
        "categoria": "portal",
        "es_critico": True,
        "descripcion": "Solicitud de consumibles, dotación y equipos.",
    },
    {
        "id": "requisiciones.presupuesto",
        "nombre": "Requisiciones - Presupuesto",
        "categoria": "portal",
        "es_critico": False,
        "descripcion": "Control presupuestal y aprobación de gastos mayores.",
    },
    # Módulos de Viáticos
    {
        "id": "viaticos_gestion",
        "nombre": "Gestión de Viáticos",
        "categoria": "portal",
        "es_critico": True,
        "descripcion": "Portal general para el manejo de viáticos.",
    },
    {
        "id": "viaticos_reportes",
        "nombre": "Reportes de Tránsito",
        "categoria": "analistas",
        "es_critico": False,
        "descripcion": "Generación y envío de legalizaciones.",
    },
    {
        "id": "viaticos_estado",
        "nombre": "Estado de Cuenta",
        "categoria": "portal",
        "es_critico": True,
        "descripcion": "Saldos pendientes del empleado con Tesorería.",
    },
    {
        "id": "viaticos_director_panel",
        "nombre": "Panel de Aprobación (Directores)",
        "categoria": "panel",
        "es_critico": True,
        "descripcion": "Vista para aprobar legalizaciones de subalternos.",
    },
    # Módulos Administrativos
    {
        "id": "panel_maestro",
        "nombre": "Panel Maestro",
        "categoria": "panel",
        "es_critico": True,
        "descripcion": "Configuración troncal del sistema.",
    },
    {
        "id": "admin_usuarios",
        "nombre": "Gestor de Usuarios",
        "categoria": "panel",
        "es_critico": True,
        "descripcion": "Asignación de roles y estados.",
    },
    {
        "id": "admin_roles",
        "nombre": "Gestor de Roles y Permisos",
        "categoria": "panel",
        "es_critico": True,
        "descripcion": "Matriz maestra de control de acceso (RBAC).",
    },
]
