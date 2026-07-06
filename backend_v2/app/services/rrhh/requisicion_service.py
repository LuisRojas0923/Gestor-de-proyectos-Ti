"""
Servicio principal de Requisición de Personal (RP)
Refactorizado en submódulos para cumplir con los estándares de auditoría (<500 líneas).
Este archivo actúa como una fachada (Facade) para mantener compatibilidad con los imports existentes.
"""

from .requisicion_core import (
    generar_numero_rp,
    obtener_aprobador_de_area,
    registrar_historial,
    _crear_vacantes_en_jerarquia,
    _limpiar_vacantes_en_jerarquia
)

from .requisicion_equipos import (
    sincronizar_equipos_oficina,
    sincronizar_equipos_tecnologicos
)

from .requisicion_creacion import (
    crear_o_actualizar_borrador,
    enviar_a_aprobacion
)

from .requisicion_aprobacion import (
    aprobar_requisicion,
    aprobar_gerente,
    rechazar_gerente,
    devolver_gerente,
    rechazar_requisicion,
    devolver_requisicion,
    actualizar_estado_gh,
    cancelar_requisicion_gh,
    devolver_modificacion_salarial,
    marcar_vista_gh
)
