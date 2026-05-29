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
    "area_ejecutor": "D&DT",       # Definido por el usuario
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
        "area_desarrollo": "Compras",
        "fecha_inicio": "2025-09-28",
        "fecha_estimada_fin": "2026-06-10",
        "fecha_real_fin": None,
        "tareas": [
            {
                "titulo": "Identificación de la fuente de datos en Excel (Catalogo de Artículos)",
                "estado": "Completado",
                "fecha_inicio_estimada": "2025-09-28",
                "fecha_fin_estimada": "2025-10-15",
                "fecha_inicio_real": "2025-09-28",
                "fecha_fin_real": "2025-10-15"
            },
            {
                "titulo": "Construcción del script de carga hacia PostgreSQL",
                "estado": "Completado",
                "fecha_inicio_estimada": "2025-10-16",
                "fecha_fin_estimada": "2025-11-10",
                "fecha_inicio_real": "2025-10-16",
                "fecha_fin_real": "2025-11-10"
            },
            {
                "titulo": "Validación de resultados e inconsistencias",
                "estado": "En Progreso",
                "fecha_inicio_estimada": "2025-11-11",
                "fecha_fin_estimada": "2026-05-30",
                "fecha_inicio_real": "2025-11-11",
                "fecha_fin_real": None
            },
            {
                "titulo": "Despliegue y automatización en servidor",
                "estado": "Pendiente",
                "fecha_inicio_estimada": "2026-06-01",
                "fecha_fin_estimada": "2026-06-10",
                "fecha_inicio_real": None,
                "fecha_fin_real": None
            }
        ]
    },
    {
        "id": "ACT-00050",
        "nombre": "2.1 Inventario Físico",
        "descripcion": "Sistema de gestión de inventario físico implementado",
        "estado_general": "Completado",
        "tipo": "Proyecto",
        "modulo": "Logística",
        "area_desarrollo": "Logística",
        "fecha_inicio": "2026-02-27",
        "fecha_estimada_fin": "2026-03-31",
        "fecha_real_fin": "2026-03-31",
        "tareas": [
            {
                "titulo": "Pantalla de captura para conteo físico de activos",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-02-27",
                "fecha_fin_estimada": "2026-03-10",
                "fecha_inicio_real": "2026-02-27",
                "fecha_fin_real": "2026-03-10"
            },
            {
                "titulo": "Generación de informes de inconsistencias y auditoría",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-03-11",
                "fecha_fin_estimada": "2026-03-20",
                "fecha_inicio_real": "2026-03-11",
                "fecha_fin_real": "2026-03-20"
            },
            {
                "titulo": "Sincronización de datos con el módulo de Inventario Anual",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-03-21",
                "fecha_fin_estimada": "2026-03-31",
                "fecha_inicio_real": "2026-03-21",
                "fecha_fin_real": "2026-03-31"
            }
        ]
    },
    {
        "id": "ACT-00051",
        "nombre": "2.2 Adaptación para Inventarios Cíclicos",
        "descripcion": "Módulo para gestionar ciclos de inventario",
        "estado_general": "En Progreso",
        "tipo": "Proyecto",
        "modulo": "Logística",
        "area_desarrollo": "Logística",
        "fecha_inicio": "2026-04-01",
        "fecha_estimada_fin": "2026-06-05",
        "fecha_real_fin": None,
        "tareas": [
            {
                "titulo": "Recibimiento de solicitud de parametrización",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-04-01",
                "fecha_fin_estimada": "2026-04-10",
                "fecha_inicio_real": "2026-04-01",
                "fecha_fin_real": "2026-04-10"
            },
            {
                "titulo": "Levantamiento del proceso y lógica de ciclos",
                "estado": "En Progreso",
                "fecha_inicio_estimada": "2026-04-11",
                "fecha_fin_estimada": "2026-06-05",
                "fecha_inicio_real": "2026-04-11",
                "fecha_fin_real": None
            }
        ]
    },
    {
        "id": "ACT-00052",
        "nombre": "2.3 Formularios del Sistema de Solicitudes",
        "descripcion": "Desarrollo de formularios para solicitudes de logística",
        "estado_general": "En Progreso",
        "tipo": "Proyecto",
        "modulo": "Logística",
        "area_desarrollo": "Logística",
        "fecha_inicio": "2026-02-12",
        "fecha_estimada_fin": "2026-06-15",
        "fecha_real_fin": None,
        "tareas": [
            {
                "titulo": "Diseño de interfaz de formularios de almacén",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-02-12",
                "fecha_fin_estimada": "2026-02-25",
                "fecha_inicio_real": "2026-02-12",
                "fecha_fin_real": "2026-02-25"
            },
            {
                "titulo": "Validación de campos obligatorios en el frontend",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-02-26",
                "fecha_fin_estimada": "2026-03-10",
                "fecha_inicio_real": "2026-02-26",
                "fecha_fin_real": "2026-03-10"
            },
            {
                "titulo": "Diseño de tarjetas de estado de pedidos",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-03-11",
                "fecha_fin_estimada": "2026-03-25",
                "fecha_inicio_real": "2026-03-11",
                "fecha_fin_real": "2026-03-25"
            },
            {
                "titulo": "Integración con el flujo de aprobación RDX",
                "estado": "En Progreso",
                "fecha_inicio_estimada": "2026-03-26",
                "fecha_fin_estimada": "2026-06-05",
                "fecha_inicio_real": "2026-03-26",
                "fecha_fin_real": None
            },
            {
                "titulo": "Pruebas funcionales integradas",
                "estado": "Pendiente",
                "fecha_inicio_estimada": "2026-06-06",
                "fecha_fin_estimada": "2026-06-15",
                "fecha_inicio_real": None,
                "fecha_fin_real": None
            }
        ]
    },
    {
        "id": "ACT-00053",
        "nombre": "3.1 Certificado de Ingresos y Retenciones",
        "descripcion": "Generación de certificados laborales para empleados",
        "estado_general": "Pendiente",
        "tipo": "Proyecto",
        "modulo": "Gestión Humana",
        "area_desarrollo": "Gestión Humana",
        "fecha_inicio": None,
        "fecha_estimada_fin": "2026-07-10",
        "fecha_real_fin": None,
        "tareas": [
            {
                "titulo": "Diseño del layout del certificado laboral",
                "estado": "Pendiente",
                "fecha_inicio_estimada": "2026-06-10",
                "fecha_fin_estimada": "2026-06-18",
                "fecha_inicio_real": None,
                "fecha_fin_real": None
            },
            {
                "titulo": "Validación de datos de nómina",
                "estado": "Pendiente",
                "fecha_inicio_estimada": "2026-06-19",
                "fecha_fin_estimada": "2026-06-25",
                "fecha_inicio_real": None,
                "fecha_fin_real": None
            },
            {
                "titulo": "Generación del reporte en formato PDF",
                "estado": "Pendiente",
                "fecha_inicio_estimada": "2026-06-26",
                "fecha_fin_estimada": "2026-07-02",
                "fecha_inicio_real": None,
                "fecha_fin_real": None
            },
            {
                "titulo": "Envío automático por correo corporativo",
                "estado": "Pendiente",
                "fecha_inicio_estimada": "2026-07-03",
                "fecha_fin_estimada": "2026-07-10",
                "fecha_inicio_real": None,
                "fecha_fin_real": None
            }
        ]
    },
    {
        "id": "ACT-00054",
        "nombre": "4.1 Ingreso de Legalizaciones Web",
        "descripcion": "Plataforma para legalizaciones de viáticos en línea",
        "estado_general": "En Progreso",
        "tipo": "Proyecto",
        "modulo": "Gestión Humana",
        "area_desarrollo": "Contabilidad",
        "fecha_inicio": "2026-02-02",
        "fecha_estimada_fin": "2026-06-08",
        "fecha_real_fin": None,
        "tareas": [
            {
                "titulo": "Interfaz de carga de documentos y adjuntos (soporte)",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-02-02",
                "fecha_fin_estimada": "2026-02-20",
                "fecha_inicio_real": "2026-02-02",
                "fecha_fin_real": "2026-02-20"
            },
            {
                "titulo": "Validación y parseo de recibos y facturas",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-02-21",
                "fecha_fin_estimada": "2026-03-15",
                "fecha_inicio_real": "2026-02-21",
                "fecha_fin_real": "2026-03-15"
            },
            {
                "titulo": "Flujo de aprobación multinivel por jefatura",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-03-16",
                "fecha_fin_estimada": "2026-04-10",
                "fecha_inicio_real": "2026-03-16",
                "fecha_fin_real": "2026-04-10"
            },
            {
                "titulo": "Integración con el módulo contable",
                "estado": "En Progreso",
                "fecha_inicio_estimada": "2026-04-11",
                "fecha_fin_estimada": "2026-06-08",
                "fecha_inicio_real": "2026-04-11",
                "fecha_fin_real": None
            }
        ]
    },
    {
        "id": "ACT-00055",
        "nombre": "4.2 Generación de Estado de Cuenta en PDF y Portal",
        "descripcion": "Reporte visual de viáticos por empleado",
        "estado_general": "Completado",
        "tipo": "Proyecto",
        "modulo": "Gestión Humana",
        "area_desarrollo": "Contabilidad",
        "fecha_inicio": "2026-02-02",
        "fecha_estimada_fin": "2026-04-15",
        "fecha_real_fin": "2026-04-15",
        "tareas": [
            {
                "titulo": "Template visual para exportación a PDF",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-02-02",
                "fecha_fin_estimada": "2026-02-25",
                "fecha_inicio_real": "2026-02-02",
                "fecha_fin_real": "2026-02-25"
            },
            {
                "titulo": "Widget interactivo de saldos en el portal",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-02-26",
                "fecha_fin_estimada": "2026-03-20",
                "fecha_inicio_real": "2026-02-26",
                "fecha_fin_real": "2026-03-20"
            },
            {
                "titulo": "Cálculo automático de saldos de viáticos",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-03-21",
                "fecha_fin_estimada": "2026-04-15",
                "fecha_inicio_real": "2026-03-21",
                "fecha_fin_real": "2026-04-15"
            }
        ]
    },
    {
        "id": "ACT-00056",
        "nombre": "4.3 Generación de Estado de Cuenta en XLS",
        "descripcion": "Exportación de datos de viáticos a formato Excel",
        "estado_general": "En Progreso",
        "tipo": "Proyecto",
        "modulo": "Gestión Humana",
        "area_desarrollo": "Contabilidad",
        "fecha_inicio": "2026-04-16",
        "fecha_estimada_fin": "2026-06-12",
        "fecha_real_fin": None,
        "tareas": [
            {
                "titulo": "Diseño de estructura de columnas para reporte de gastos",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-04-16",
                "fecha_fin_estimada": "2026-04-30",
                "fecha_inicio_real": "2026-04-16",
                "fecha_fin_real": "2026-04-30"
            },
            {
                "titulo": "Definición de estilos y formato de celdas",
                "estado": "En Progreso",
                "fecha_inicio_estimada": "2026-05-01",
                "fecha_fin_estimada": "2026-06-02",
                "fecha_inicio_real": "2026-05-01",
                "fecha_fin_real": None
            },
            {
                "titulo": "Validación de datos exportados contra base de datos",
                "estado": "Pendiente",
                "fecha_inicio_estimada": "2026-06-03",
                "fecha_fin_estimada": "2026-06-12",
                "fecha_inicio_real": None,
                "fecha_fin_real": None
            }
        ]
    },
    {
        "id": "ACT-00057",
        "nombre": "5.1 Matriz de Celulares",
        "descripcion": "Control y asignación de dispositivos móviles corporativos",
        "estado_general": "En Progreso",
        "tipo": "Proyecto",
        "modulo": "Gestión Humana",
        "area_desarrollo": "Administrativa",
        "fecha_inicio": "2026-03-25",
        "fecha_estimada_fin": "2026-06-10",
        "fecha_real_fin": None,
        "tareas": [
            {
                "titulo": "Registro e inventario de líneas corporativas",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-03-25",
                "fecha_fin_estimada": "2026-04-10",
                "fecha_inicio_real": "2026-03-25",
                "fecha_fin_real": "2026-04-10"
            },
            {
                "titulo": "Mapeo de asignaciones de equipos a empleados",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-04-11",
                "fecha_fin_estimada": "2026-04-30",
                "fecha_inicio_real": "2026-04-11",
                "fecha_fin_real": "2026-04-30"
            },
            {
                "titulo": "Seguimiento de mantenimientos y reparaciones",
                "estado": "En Progreso",
                "fecha_inicio_estimada": "2026-05-01",
                "fecha_fin_estimada": "2026-06-01",
                "fecha_inicio_real": "2026-05-01",
                "fecha_fin_real": None
            },
            {
                "titulo": "Control de costos y auditoría de uso mensual",
                "estado": "Pendiente",
                "fecha_inicio_estimada": "2026-06-02",
                "fecha_fin_estimada": "2026-06-10",
                "fecha_inicio_real": None,
                "fecha_fin_real": None
            }
        ]
    },
    {
        "id": "ACT-00058",
        "nombre": "6.1 Funcionalidades de Aprobación de Solicitud de Desarrollos",
        "descripcion": "Flujo de aprobación para solicitudes de desarrollo",
        "estado_general": "Pendiente",
        "tipo": "Proyecto",
        "modulo": "Funcionalidades Generales",
        "area_desarrollo": "Sistemas",
        "fecha_inicio": None,
        "fecha_estimada_fin": "2026-07-05",
        "fecha_real_fin": None,
        "tareas": [
            {
                "titulo": "Configuración de matrices de niveles de aprobación",
                "estado": "Pendiente",
                "fecha_inicio_estimada": "2026-06-15",
                "fecha_fin_estimada": "2026-06-22",
                "fecha_inicio_real": None,
                "fecha_fin_real": None
            },
            {
                "titulo": "Notificaciones en tiempo real a aprobadores",
                "estado": "Pendiente",
                "fecha_inicio_estimada": "2026-06-23",
                "fecha_fin_estimada": "2026-06-28",
                "fecha_inicio_real": None,
                "fecha_fin_real": None
            },
            {
                "titulo": "Módulo de firmas digitales y registro de decisiones",
                "estado": "Pendiente",
                "fecha_inicio_estimada": "2026-06-29",
                "fecha_fin_estimada": "2026-07-05",
                "fecha_inicio_real": None,
                "fecha_fin_real": None
            }
        ]
    },
    {
        "id": "ACT-00059",
        "nombre": "6.2 Reserva de Salas",
        "descripcion": "Sistema de reservación de espacios y salas de reunión",
        "estado_general": "Completado",
        "tipo": "Proyecto",
        "modulo": "Funcionalidades Generales",
        "area_desarrollo": "Administrativa",
        "fecha_inicio": "2026-02-06",
        "fecha_estimada_fin": "2026-02-11",
        "fecha_real_fin": "2026-02-11",
        "tareas": [
            {
                "titulo": "Calendario de disponibilidad de salas en tiempo real",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-02-06",
                "fecha_fin_estimada": "2026-02-07",
                "fecha_inicio_real": "2026-02-06",
                "fecha_fin_real": "2026-02-07"
            },
            {
                "titulo": "Control de conflictos de horarios y duplicaciones",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-02-08",
                "fecha_fin_estimada": "2026-02-09",
                "fecha_inicio_real": "2026-02-08",
                "fecha_fin_real": "2026-02-09"
            },
            {
                "titulo": "Módulo de notificaciones de confirmación de reserva",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-02-09",
                "fecha_fin_estimada": "2026-02-10",
                "fecha_inicio_real": "2026-02-09",
                "fecha_fin_real": "2026-02-10"
            },
            {
                "titulo": "Flujo de cancelación y reprogramación",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-02-10",
                "fecha_fin_estimada": "2026-02-11",
                "fecha_inicio_real": "2026-02-10",
                "fecha_fin_real": "2026-02-11"
            }
        ]
    },
    {
        "id": "ACT-00060",
        "nombre": "6.3 Funcionalidades de Respuesta a Solicitud de Tickets",
        "descripcion": "Sistema de gestión de tickets y respuestas",
        "estado_general": "Completado",
        "tipo": "Proyecto",
        "modulo": "Funcionalidades Generales",
        "area_desarrollo": "Sistemas",
        "fecha_inicio": "2026-01-18",
        "fecha_estimada_fin": "2026-05-26",
        "fecha_real_fin": "2026-05-26",
        "tareas": [
            {
                "titulo": "Módulo de respuesta técnica y chat interno en ticket",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-01-18",
                "fecha_fin_estimada": "2026-02-15",
                "fecha_inicio_real": "2026-01-18",
                "fecha_fin_real": "2026-02-15"
            },
            {
                "titulo": "Gestión de estados del ticket (Abierto, En Proceso, Resuelto)",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-02-16",
                "fecha_fin_estimada": "2026-03-15",
                "fecha_inicio_real": "2026-02-16",
                "fecha_fin_real": "2026-03-15"
            },
            {
                "titulo": "Escalamiento automático por SLA",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-03-16",
                "fecha_fin_estimada": "2026-04-20",
                "fecha_inicio_real": "2026-03-16",
                "fecha_fin_real": "2026-04-20"
            },
            {
                "titulo": "Historial y base de conocimiento de soluciones",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-04-21",
                "fecha_fin_estimada": "2026-05-26",
                "fecha_inicio_real": "2026-04-21",
                "fecha_fin_real": "2026-05-26"
            }
        ]
    },
    {
        "id": "ACT-00061",
        "nombre": "6.4 Módulo de Gestión de Actividades",
        "descripcion": "Control y seguimiento de actividades por proyecto",
        "estado_general": "Completado",
        "tipo": "Proyecto",
        "modulo": "Funcionalidades Generales",
        "area_desarrollo": "Sistemas",
        "fecha_inicio": "2025-09-22",
        "fecha_estimada_fin": "2026-05-26",
        "fecha_real_fin": "2026-05-26",
        "tareas": [
            {
                "titulo": "Creación de actividades WBS desde el portal",
                "estado": "Completado",
                "fecha_inicio_estimada": "2025-09-22",
                "fecha_fin_estimada": "2025-11-30",
                "fecha_inicio_real": "2025-09-22",
                "fecha_fin_real": "2025-11-30"
            },
            {
                "titulo": "Asignación jerárquica de responsables y analistas",
                "estado": "Completado",
                "fecha_inicio_estimada": "2025-12-01",
                "fecha_fin_estimada": "2026-02-15",
                "fecha_inicio_real": "2025-12-01",
                "fecha_fin_real": "2026-02-15"
            },
            {
                "titulo": "Seguimiento visual en diagrama de Gantt híbrido",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-02-16",
                "fecha_fin_estimada": "2026-04-15",
                "fecha_inicio_real": "2026-02-16",
                "fecha_fin_real": "2026-04-15"
            },
            {
                "titulo": "Cálculo automático y propagación de avances",
                "estado": "Completado",
                "fecha_inicio_estimada": "2026-04-16",
                "fecha_fin_estimada": "2026-05-26",
                "fecha_inicio_real": "2026-04-16",
                "fecha_fin_real": "2026-05-26"
            }
        ]
    }
]
