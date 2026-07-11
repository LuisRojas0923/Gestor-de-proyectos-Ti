MODULOS_AUDITORIA = {
    "auth": "Control de Acceso",
    "service-portal": "Portal de Servicios TI",
    "mis_solicitudes": "Gestión de Solicitudes",
    "reserva_salas": "Reserva de Espacios",
    "reserva-salas": "Reserva de Espacios",
    "requisiciones": "Compras Corporativas",
    "requisiciones.almacen": "Almacén de TI",
    "requisiciones.presupuesto": "Aprobaciones de Presupuesto",
    "viaticos_gestion": "Legalización de Viáticos",
    "viaticos_estado": "Estados de Cuenta",
    "viaticos": "Gestión de Viáticos",
    "sistemas": "Soporte Técnico de Sistemas",
    "mejoramiento": "Mejoramiento Continuo",
    "desarrollo": "Software Factory (Desarrollo)",
    "desarrollos": "Software Factory (Desarrollo)",
    "chat": "Asistente Virtual IA",
    "gestion_humana": "Gestión Humana",
    "auditoria_sistema": "Seguridad y Auditoría",
    "biometria": "Asistencia Facial / Biometría",
    "biometria_db": "Base de Datos Biométrica",
}


def humanizar_modulo(modulo: str) -> str:
    clave = (modulo or "").strip().lower()
    return MODULOS_AUDITORIA.get(clave, modulo or "Sistema General")
