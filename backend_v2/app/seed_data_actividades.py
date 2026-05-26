from decimal import Decimal

# Configuración común para todos los desarrollos basada en ACT-00001
COMMON_DEV_CONFIG = {
    "ambiente": "Portal",
    "responsable": "OSORIO LENIS HARRY",
    "responsable_id": "USR-14836440",
    "analista": "ROJAS VILLOTA LUIS ENRIQUE",
    "autoridad": "TORRES AGUDELO MARIBELL",
    "supervisor": "ROJAS VILLOTA LUIS ENRIQUE",
    "creado_por_id": "USR-1107068093",
    "estado_validacion": "aprobada",
    "area_desarrollo": "TODAS",
    "area_ejecutor": "WELLDONE",
    "porcentaje_progreso": Decimal("0.0")
}

DEVELOPMENTS_DATA = [
    {
        "id": "ACT-00049",
        "nombre": "1. Consulta y Construcción de Proveedores",
        "descripcion": "Construcción de módulo para consulta de catálogo de productos y fuentes",
        "estado_general": "En Progreso",
        "modulo": "Proveedores",
        "tipo": "Proyecto",
        "tareas": [
            {"titulo": "Identificación de la fuente de datos en Excel (Catalogo de Artículos)", "estado": "Completado"},
            {"titulo": "Construcción del script de carga hacia PostgreSQL", "estado": "Completado"},
            {"titulo": "Validación de resultados e inconsistencias", "estado": "En Progreso"},
            {"titulo": "Despliegue y automatización en servidor", "estado": "Pendiente"}
        ]
    },
    {
        "id": "ACT-00050",
        "nombre": "2.1 Inventario Físico",
        "descripcion": "Sistema de gestión de inventario físico implementado",
        "estado_general": "Completado",
        "tipo": "Proyecto",
        "modulo": "Logística",
        "tareas": [
            {"titulo": "Pantalla de captura para conteo físico de activos", "estado": "Completado"},
            {"titulo": "Generación de informes de inconsistencias y auditoría", "estado": "Completado"},
            {"titulo": "Sincronización de datos con el módulo de Inventario Anual", "estado": "Completado"}
        ]
    },
    {
        "id": "ACT-00051",
        "nombre": "2.2 Adaptación para Inventarios Cíclicos",
        "descripcion": "Módulo para gestionar ciclos de inventario",
        "estado_general": "En Progreso",
        "tipo": "Proyecto",
        "modulo": "Logística",
        "tareas": [
            {"titulo": "Recibimiento de solicitud de parametrización", "estado": "Completado"},
            {"titulo": "Levantamiento del proceso y lógica de ciclos", "estado": "En Progreso"}
        ]
    },
    {
        "id": "ACT-00052",
        "nombre": "2.3 Formularios del Sistema de Solicitudes",
        "descripcion": "Desarrollo de formularios para solicitudes de logística",
        "estado_general": "En Progreso",
        "tipo": "Proyecto",
        "modulo": "Logística",
        "tareas": [
            {"titulo": "Diseño de interfaz de formularios de almacén", "estado": "Completado"},
            {"titulo": "Validación de campos obligatorios en el frontend", "estado": "Completado"},
            {"titulo": "Diseño de tarjetas de estado de pedidos", "estado": "Completado"},
            {"titulo": "Integración con el flujo de aprobación RDX", "estado": "En Progreso"},
            {"titulo": "Pruebas funcionales integradas", "estado": "Pendiente"}
        ]
    },
    {
        "id": "ACT-00053",
        "nombre": "3.1 Certificado de Ingresos y Retenciones",
        "descripcion": "Generación de certificados laborales para empleados",
        "estado_general": "Pendiente",
        "tipo": "Proyecto",
        "modulo": "Gestión Humana",
        "tareas": [
            {"titulo": "Diseño del layout del certificado laboral", "estado": "Pendiente"},
            {"titulo": "Validación de datos de nómina", "estado": "Pendiente"},
            {"titulo": "Generación del reporte en formato PDF", "estado": "Pendiente"},
            {"titulo": "Envío automático por correo corporativo", "estado": "Pendiente"}
        ]
    },
    {
        "id": "ACT-00054",
        "nombre": "4.1 Ingreso de Legalizaciones Web",
        "descripcion": "Plataforma para legalizaciones de viáticos en línea",
        "estado_general": "En Progreso",
        "tipo": "Proyecto",
        "modulo": "Gestión Humana",
        "tareas": [
            {"titulo": "Interfaz de carga de documentos y adjuntos (soporte)", "estado": "Completado"},
            {"titulo": "Validación y parseo de recibos y facturas", "estado": "Completado"},
            {"titulo": "Flujo de aprobación multinivel por jefatura", "estado": "Completado"},
            {"titulo": "Integración con el módulo contable", "estado": "En Progreso"}
        ]
    },
    {
        "id": "ACT-00055",
        "nombre": "4.2 Generación de Estado de Cuenta en PDF y Portal",
        "descripcion": "Reporte visual de viáticos por empleado",
        "estado_general": "Completado",
        "tipo": "Proyecto",
        "modulo": "Gestión Humana",
        "tareas": [
            {"titulo": "Template visual para exportación a PDF", "estado": "Completado"},
            {"titulo": "Widget interactivo de saldos en el portal", "estado": "Completado"},
            {"titulo": "Cálculo automático de saldos de viáticos", "estado": "Completado"}
        ]
    },
    {
        "id": "ACT-00056",
        "nombre": "4.3 Generación de Estado de Cuenta en XLS",
        "descripcion": "Exportación de datos de viáticos a formato Excel",
        "estado_general": "En Progreso",
        "tipo": "Proyecto",
        "modulo": "Gestión Humana",
        "tareas": [
            {"titulo": "Diseño de estructura de columnas para reporte de gastos", "estado": "Completado"},
            {"titulo": "Definición de estilos y formato de celdas", "estado": "En Progreso"},
            {"titulo": "Validación de datos exportados contra base de datos", "estado": "Pendiente"}
        ]
    },
    {
        "id": "ACT-00057",
        "nombre": "5.1 Matriz de Celulares",
        "descripcion": "Control y asignación de dispositivos móviles corporativos",
        "estado_general": "En Progreso",
        "tipo": "Proyecto",
        "modulo": "Gestión Humana",
        "tareas": [
            {"titulo": "Registro e inventario de líneas corporativas", "estado": "Completado"},
            {"titulo": "Mapeo de asignaciones de equipos a empleados", "estado": "Completado"},
            {"titulo": "Seguimiento de mantenimientos y reparaciones", "estado": "En Progreso"},
            {"titulo": "Control de costos y auditoría de uso mensual", "estado": "Pendiente"}
        ]
    },
    {
        "id": "ACT-00058",
        "nombre": "6.1 Funcionalidades de Aprobación de Solicitud de Desarrollos",
        "descripcion": "Flujo de aprobación para solicitudes de desarrollo",
        "estado_general": "Pendiente",
        "tipo": "Proyecto",
        "modulo": "Funcionalidades Generales",
        "tareas": [
            {"titulo": "Configuración de matrices de niveles de aprobación", "estado": "Pendiente"},
            {"titulo": "Notificaciones en tiempo real a aprobadores", "estado": "Pendiente"},
            {"titulo": "Módulo de firmas digitales y registro de decisiones", "estado": "Pendiente"}
        ]
    },
    {
        "id": "ACT-00059",
        "nombre": "6.2 Reserva de Salas",
        "descripcion": "Sistema de reservación de espacios y salas de reunión",
        "estado_general": "Completado",
        "tipo": "Proyecto",
        "modulo": "Funcionalidades Generales",
        "tareas": [
            {"titulo": "Calendario de disponibilidad de salas en tiempo real", "estado": "Completado"},
            {"titulo": "Control de conflictos de horarios y duplicaciones", "estado": "Completado"},
            {"titulo": "Módulo de notificaciones de confirmación de reserva", "estado": "Completado"},
            {"titulo": "Flujo de cancelación y reprogramación", "estado": "Completado"}
        ]
    },
    {
        "id": "ACT-00060",
        "nombre": "6.3 Funcionalidades de Respuesta a Solicitud de Tickets",
        "descripcion": "Sistema de gestión de tickets y respuestas",
        "estado_general": "Completado",
        "tipo": "Proyecto",
        "modulo": "Funcionalidades Generales",
        "tareas": [
            {"titulo": "Módulo de respuesta técnica y chat interno en ticket", "estado": "Completado"},
            {"titulo": "Gestión de estados del ticket (Abierto, En Proceso, Resuelto)", "estado": "Completado"},
            {"titulo": "Escalamiento automático por SLA", "estado": "Completado"},
            {"titulo": "Historial y base de conocimiento de soluciones", "estado": "Completado"}
        ]
    },
    {
        "id": "ACT-00061",
        "nombre": "6.4 Módulo de Gestión de Actividades",
        "descripcion": "Control y seguimiento de actividades por proyecto",
        "estado_general": "Completado",
        "tipo": "Proyecto",
        "modulo": "Funcionalidades Generales",
        "tareas": [
            {"titulo": "Creación de actividades WBS desde el portal", "estado": "Completado"},
            {"titulo": "Asignación jerárquica de responsables y analistas", "estado": "Completado"},
            {"titulo": "Seguimiento visual en diagrama de Gantt híbrido", "estado": "Completado"},
            {"titulo": "Cálculo automático y propagación de avances", "estado": "Completado"}
        ]
    }
]
