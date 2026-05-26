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
            "Indentificacion de la fuente de datos en excel",
            "Contruccion del scrip de carga de datos hacia posgresql ( RDX)",
            "Validación de resultados",
            "Despliegue en servidor"
        ]
    },
    {
        "id": "ACT-00050",
        "nombre": "2.1 Inventario Físico",
        "descripcion": "Sistema de gestión de inventario físico implementado",
        "estado_general": "Completado",
        "tipo": "Proyecto",
        "modulo": "Logística",
        "tareas": []
    },
    {
        "id": "ACT-00051",
        "nombre": "2.2 Adaptación para Inventarios Cíclicos",
        "descripcion": "Módulo para gestionar ciclos de inventario",
        "estado_general": "En Progreso",
        "tipo": "Proyecto",
        "modulo": "Logística",
        "tareas": [
            "Recibinento de la solicitud",
            "Levantamiento del proceso"
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
            "Diseño de tarjetas",
            "Diseño de interfaz de formularios",
            "Validaciones de campos",
            "Integración con flujo de aprobación RDX (Enterprice)",
            "Pruebas funcionales"
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
            "Diseño de estructura de certificado",
            "Validación de datos laborales",
            "Generación en PDF",
            "Envío automatizado"
        ]
    },
    {
        "id": "ACT-00054",
        "nombre": "4.1 Ingreso de Legalizaciones Web",
        "descripcion": "Plataforma para legalizaciones de viáticos en línea",
        "estado_general": "Pendiente",
        "tipo": "Proyecto",
        "modulo": "Gestión Humana",
        "tareas": [
            "Interfaz de carga de documentos",
            "Validación de recibos",
            "Flujo de aprobación",
            "Integración con contabilidad"
        ]
    },
    {
        "id": "ACT-00055",
        "nombre": "4.2 Generación de Estado de Cuenta en PDF y Portal",
        "descripcion": "Reporte visual de viáticos por empleado",
        "estado_general": "Pendiente",
        "tipo": "Proyecto",
        "modulo": "Gestión Humana",
        "tareas": [
            "Template de PDF",
            "Widget en portal",
            "Cálculo de saldos",
            "Descargabilidad"
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
            "Estructura de columnas",
            "Estilos y formato",
            "Validación de datos"
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
            "Registro de equipos",
            "Asignación a empleados",
            "Seguimiento de mantenimiento",
            "Control de costos",
            "Auditoría de uso"
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
            "Configuración de niveles de aprobación",
            "Notificaciones a aprobadores",
            "Registro de decisiones",
            "Auditoría completa"
        ]
    },
    {
        "id": "ACT-00059",
        "nombre": "6.2 Reserva de Salas",
        "descripcion": "Sistema de reservación de espacios y salas de reunión",
        "estado_general": "Pendiente",
        "tipo": "Proyecto",
        "modulo": "Funcionalidades Generales",
        "tareas": [
            "Calendario de disponibilidad",
            "Validación de conflictos",
            "Notificaciones de reserva",
            "Cancelación y reprogramación"
        ]
    },
    {
        "id": "ACT-00060",
        "nombre": "6.3 Funcionalidades de Respuesta a Solicitud de Tickets",
        "descripcion": "Sistema de gestión de tickets y respuestas",
        "estado_general": "En Progreso",
        "tipo": "Proyecto",
        "modulo": "Funcionalidades Generales",
        "tareas": [
            "Módulo de respuesta técnica",
            "Seguimiento de estado",
            "Escalamiento de tickets",
            "Base de conocimiento de soluciones"
        ]
    },
    {
        "id": "ACT-00061",
        "nombre": "6.4 Módulo de Gestión de Actividades",
        "descripcion": "Control y seguimiento de actividades por proyecto",
        "estado_general": "En Progreso",
        "tipo": "Proyecto",
        "modulo": "Funcionalidades Generales",
        "tareas": [
            "Creación de actividades",
            "Asignación de responsables",
            "Seguimiento de hitos",
            "Reportes de avance"
        ]
    }
]
