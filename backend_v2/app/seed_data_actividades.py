from decimal import Decimal

DESARROLLO = {
    "id": "ACT-00049",
    "nombre": "Portal de Servicios",
    "descripcion": "Matriz de Actividades y Tareas para el Portal de Servicios",
    "modulo": "Portal de Servicios",
    "tipo": "Proyecto",
    "estado_general": "En Progreso",
    "estado_validacion": "aprobada",
    "porcentaje_progreso": Decimal("0.0")
}

ACTIVIDADES = [
    # --- 1. Consulta y Construcción de Proveedores ---
    {
        "titulo": "1. Consulta y Construcción de Proveedores",
        "descripcion": "Construcción de módulo para consulta de catálogo de productos y fuentes",
        "estado": "En Progreso",
        "parent_ref": None
    },
    {
        "titulo": "Indentificacion de la fuente de datos en excel",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 0
    },
    {
        "titulo": "Contruccion del scrip de carga de datos hacia posgresql ( RDX)",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 0
    },
    {
        "titulo": "Validación de resultados",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 0
    },
    {
        "titulo": "Despliegue en servidor",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 0
    },

    # --- 2. Logística ---
    {
        "titulo": "2. Logística",
        "descripcion": "Gestión de inventarios y formularios de solicitudes",
        "estado": "En Progreso",
        "parent_ref": None
    },
    {
        "titulo": "2.1 Inventario Físico",
        "descripcion": "Sistema de gestión de inventario físico implementado",
        "estado": "Completado",
        "parent_ref": 5
    },
    {
        "titulo": "2.2 Adaptación para Inventarios Cíclicos",
        "descripcion": "Módulo para gestionar ciclos de inventario",
        "estado": "En Progreso",
        "parent_ref": 5
    },
    {
        "titulo": "Recibinento de la solicitud",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 7
    },
    {
        "titulo": "Levantamiento del proceso",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 7
    },
    {
        "titulo": "2.3 Formularios del Sistema de Solicitudes",
        "descripcion": "Desarrollo de formularios para solicitudes de logística",
        "estado": "En Progreso",
        "parent_ref": 5
    },
    {
        "titulo": "Diseño de tarjetas",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 10
    },
    {
        "titulo": "Diseño de interfaz de formularios",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 10
    },
    {
        "titulo": "Validaciones de campos",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 10
    },
    {
        "titulo": "Integración con flujo de aprobación RDX (Enterprice)",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 10
    },
    {
        "titulo": "Pruebas funcionales",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 10
    },

    # --- 3. Gestión Humana ---
    {
        "titulo": "3. Gestión Humana",
        "descripcion": "Procesos y módulos de Gestión Humana y Viáticos",
        "estado": "En Progreso",
        "parent_ref": None
    },
    {
        "titulo": "3.1 Certificado de Ingresos y Retenciones",
        "descripcion": "Generación de certificados laborales para empleados",
        "estado": "Pendiente",
        "parent_ref": 16
    },
    {
        "titulo": "Diseño de estructura de certificado",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 17
    },
    {
        "titulo": "Validación de datos laborales",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 17
    },
    {
        "titulo": "Generación en PDF",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 17
    },
    {
        "titulo": "Envío automatizado",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 17
    },
    {
        "titulo": "4.1 Ingreso de Legalizaciones Web",
        "descripcion": "Plataforma para legalizaciones de viáticos en línea",
        "estado": "Pendiente",
        "parent_ref": 16
    },
    {
        "titulo": "Interfaz de carga de documentos",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 22
    },
    {
        "titulo": "Validación de recibos",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 22
    },
    {
        "titulo": "Flujo de aprobación",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 22
    },
    {
        "titulo": "Integración con contabilidad",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 22
    },
    {
        "titulo": "4.2 Generación de Estado de Cuenta en PDF y Portal",
        "descripcion": "Reporte visual de viáticos por empleado",
        "estado": "Pendiente",
        "parent_ref": 16
    },
    {
        "titulo": "Template de PDF",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 27
    },
    {
        "titulo": "Widget en portal",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 27
    },
    {
        "titulo": "Cálculo de saldos",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 27
    },
    {
        "titulo": "Descargabilidad",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 27
    },
    {
        "titulo": "4.3 Generación de Estado de Cuenta en XLS",
        "descripcion": "Exportación de datos de viáticos a formato Excel",
        "estado": "En Progreso",
        "parent_ref": 16
    },
    {
        "titulo": "Estructura de columnas",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 32
    },
    {
        "titulo": "Estilos y formato",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 32
    },
    {
        "titulo": "Validación de datos",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 32
    },
    {
        "titulo": "5.1 Matriz de Celulares",
        "descripcion": "Control y asignación de dispositivos móviles corporativos",
        "estado": "En Progreso",
        "parent_ref": 16
    },
    {
        "titulo": "Registro de equipos",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 36
    },
    {
        "titulo": "Asignación a empleados",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 36
    },
    {
        "titulo": "Seguimiento de mantenimiento",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 36
    },
    {
        "titulo": "Control de costos",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 36
    },
    {
        "titulo": "Auditoría de uso",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 36
    },

    # --- 6. Funcionalidades Generales ---
    {
        "titulo": "6. Funcionalidades Generales",
        "descripcion": "Módulos y funciones transversales del portal",
        "estado": "En Progreso",
        "parent_ref": None
    },
    {
        "titulo": "6.1 Funcionalidades de Aprobación de Solicitud de Desarrollos",
        "descripcion": "Flujo de aprobación para solicitudes de desarrollo",
        "estado": "Pendiente",
        "parent_ref": 42
    },
    {
        "titulo": "Configuración de niveles de aprobación",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 43
    },
    {
        "titulo": "Notificaciones a aprobadores",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 43
    },
    {
        "titulo": "Registro de decisiones",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 43
    },
    {
        "titulo": "Auditoría completa",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 43
    },
    {
        "titulo": "6.2 Reserva de Salas",
        "descripcion": "Sistema de reservación de espacios y salas de reunión",
        "estado": "Pendiente",
        "parent_ref": 42
    },
    {
        "titulo": "Calendario de disponibilidad",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 48
    },
    {
        "titulo": "Validación de conflictos",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 48
    },
    {
        "titulo": "Notificaciones de reserva",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 48
    },
    {
        "titulo": "Cancelación y reprogramación",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 48
    },
    {
        "titulo": "6.3 Funcionalidades de Respuesta a Solicitud de Tickets",
        "descripcion": "Sistema de gestión de tickets y respuestas",
        "estado": "En Progreso",
        "parent_ref": 42
    },
    {
        "titulo": "Módulo de respuesta técnica",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 53
    },
    {
        "titulo": "Seguimiento de estado",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 53
    },
    {
        "titulo": "Escalamiento de tickets",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 53
    },
    {
        "titulo": "Base de conocimiento de soluciones",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 53
    },
    {
        "titulo": "6.4 Módulo de Gestión de Actividades",
        "descripcion": "Control y seguimiento de actividades por proyecto",
        "estado": "En Progreso",
        "parent_ref": 42
    },
    {
        "titulo": "Creación de actividades",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 58
    },
    {
        "titulo": "Asignación de responsables",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 58
    },
    {
        "titulo": "Seguimiento de hitos",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 58
    },
    {
        "titulo": "Reportes de avance",
        "descripcion": None,
        "estado": "Pendiente",
        "parent_ref": 58
    }
]
