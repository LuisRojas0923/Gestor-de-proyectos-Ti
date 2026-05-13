from typing import List, Dict, Any

# ==========================================
# MANIFIESTO CENTRAL DE MÓDULOS DEL SISTEMA
# ==========================================
# Single Source of Truth (SSOT) para el sistema RBAC.
# El backend auto-sincronizará esta lista con la base de datos
# en cada arranque (Upsert) conservando nombres editados por UI.
# ==========================================

SYSTEM_MODULES_REGISTRY: List[Dict[str, Any]] = [
    # --- CATEGORÍA: PORTAL (Módulos de Cara al Usuario) ---
    {
        "id": "service-portal",
        "nombre": "Portal de Servicios (Shell)",
        "categoria": "portal",
        "es_critico": True,
        "descripcion": "Contenedor principal del portal de servicios.",
    },
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
    {
        "id": "viaticos_gestion",
        "nombre": "Gestión de Viáticos",
        "categoria": "portal",
        "es_critico": True,
        "descripcion": "Portal general para el manejo de viáticos.",
    },
    {
        "id": "viaticos_estado",
        "nombre": "Estado de Cuenta",
        "categoria": "portal",
        "es_critico": True,
        "descripcion": "Saldos pendientes del empleado con Tesorería.",
    },
    {
        "id": "sistemas",
        "nombre": "Soporte Sistemas",
        "categoria": "portal",
        "es_critico": False,
        "descripcion": "Acceso al portal de soporte técnico de sistemas.",
    },
    {
        "id": "mejoramiento",
        "nombre": "Mejoramiento TI",
        "categoria": "portal",
        "es_critico": False,
        "descripcion": "Acceso al portal de requerimientos de mejoramiento.",
    },
    {
        "id": "desarrollo",
        "nombre": "Software Factory",
        "categoria": "portal",
        "es_critico": False,
        "descripcion": "Módulo de desarrollo de software a medida.",
    },
    {
        "id": "chat",
        "nombre": "Asistente IA",
        "categoria": "portal",
        "es_critico": False,
        "descripcion": "Herramienta de asistencia basada en Inteligencia Artificial.",
    },
    {
        "id": "gestion_humana",
        "nombre": "Gestión Humana",
        "categoria": "portal",
        "es_critico": False,
        "descripcion": "Gestión de certificados laborales, desprendibles de pago e información tributaria.",
    },

    # --- CATEGORÍA: ANALISTAS (Herramientas de Operación TI) ---
    {
        "id": "dashboard",
        "nombre": "Tablero Principal",
        "categoria": "analistas",
        "es_critico": True,
        "descripcion": "Vista consolidada de indicadores y estado del sistema.",
    },
    {
        "id": "ticket-management",
        "nombre": "Gestión de Tickets",
        "categoria": "analistas",
        "es_critico": False,
        "descripcion": "Administración y resolución de tickets de soporte.",
    },
    {
        "id": "developments",
        "nombre": "Gestión de Actividades",
        "categoria": "analistas",
        "es_critico": False,
        "descripcion": "Control de cronogramas y actividades de desarrollo.",
    },
    {
        "id": "indicators",
        "nombre": "Indicadores Globales (BI)",
        "categoria": "analistas",
        "es_critico": False,
        "descripcion": "Visualización de métricas de rendimiento del departamento.",
    },
    {
        "id": "reports",
        "nombre": "Reportería Avanzada",
        "categoria": "analistas",
        "es_critico": False,
        "descripcion": "Generación de informes detallados y exportaciones.",
    },
    {
        "id": "settings",
        "nombre": "Parámetros del Sistema",
        "categoria": "analistas",
        "es_critico": False,
        "descripcion": "Configuraciones generales de operación.",
    },
    {
        "id": "viaticos_reportes",
        "nombre": "Reportes de Tránsito",
        "categoria": "analistas",
        "es_critico": False,
        "descripcion": "Generación y envío de legalizaciones.",
    },
    {
        "id": "wbs_templates",
        "nombre": "Plantillas de Proyectos (WBS)",
        "categoria": "analistas",
        "es_critico": False,
        "descripcion": "Gestión de estructuras de desglose de trabajo.",
    },
    {
        "id": "lineas_corporativas",
        "nombre": "Gestión de Líneas Corporativas",
        "categoria": "analistas",
        "es_critico": False,
        "descripcion": "Gestión e inventario de líneas telefónicas corporativas y facturación.",
    },

    # --- CATEGORÍA: PANEL (Administración de Control) ---
    {
        "id": "control-tower",
        "nombre": "Torre de Control",
        "categoria": "panel",
        "es_critico": True,
        "descripcion": "Monitoreo en tiempo real de servicios y salud del sistema.",
    },
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
        "id": "user-admin",
        "nombre": "Administración de Usuarios",
        "categoria": "panel",
        "es_critico": True,
        "descripcion": "Módulo extendido para gestión granular de perfiles.",
    },
    {
        "id": "admin_roles",
        "nombre": "Gestor de Roles y Permisos",
        "categoria": "panel",
        "es_critico": True,
        "descripcion": "Matriz maestra de control de acceso (RBAC).",
    },
    {
        "id": "viaticos_director_panel",
        "nombre": "Panel de Aprobación (Directores)",
        "categoria": "panel",
        "es_critico": True,
        "descripcion": "Vista para aprobar legalizaciones de subalternos.",
    },
    {
        "id": "reserva_salas_admin",
        "nombre": "Administración de Salas",
        "categoria": "panel",
        "es_critico": False,
        "descripcion": "Configuración de recursos y disponibilidad de salas.",
    },
    {
        "id": "design-catalog",
        "nombre": "Catálogo de Diseño UI/UX",
        "categoria": "panel",
        "es_critico": False,
        "descripcion": "Guía de estilos y componentes del sistema de diseño.",
    },
    {
        "id": "inventario_anual",
        "nombre": "Inventario Anual",
        "categoria": "panel",
        "es_critico": True,
        "descripcion": "Configuración y administración de tomas físicas de inventario.",
    },
    {
        "id": "inventario_2026",
        "nombre": "Inventario 2026 (Digitalización)",
        "categoria": "portal",
        "es_critico": True,
        "descripcion": "Vista de digitalización para operarios en el portal.",
    },
    {
        "id": "comisiones",
        "nombre": "Gestión de Comisiones",
        "categoria": "portal",
        "es_critico": True,
        "descripcion": "Cálculo y procesamiento de comisiones para el personal.",
    },
    {
        "id": "nomina_novedades",
        "nombre": "Novedades de Nómina",
        "categoria": "portal",
        "es_critico": True,
        "descripcion": "Carga y procesamiento de novedades para SOLID.",
    },
]
