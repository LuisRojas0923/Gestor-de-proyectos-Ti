"""Carga determinista de modelos SQLModel sin importar la aplicacion web."""
import importlib


MODEL_MODULES = (
    "app.models.alerta.actividad",
    "app.models.alerta.notificacion",
    "app.models.auditoria.accion_usuario",
    "app.models.auth.relacion_gestor_empleado",
    "app.models.auth.usuario",
    "app.models.biometria.biometria_models",
    "app.models.bitacoras_operacionales.modelos",
    "app.models.desarrollo.actividad",
    "app.models.desarrollo.desarrollo",
    "app.models.desarrollo.plantilla_actividad",
    "app.models.desarrollo.requerimiento",
    "app.models.erp.requisiciones",
    "app.models.ia.modelos_ia",
    "app.models.impuestos.formato_2276",
    "app.models.inventario.conteo",
    "app.models.kpi.metrica",
    "app.models.linea_corporativa.factura_detalle_model",
    "app.models.linea_corporativa.factura_model",
    "app.models.linea_corporativa.model",
    "app.models.novedades_nomina.bolsa_horas_override",
    "app.models.novedades_nomina.horas_extras",
    "app.models.novedades_nomina.horas_extras_diario",
    "app.models.novedades_nomina.horas_extras_horario_dia",
    "app.models.novedades_nomina.horas_extras_novedad_evento",
    "app.models.novedades_nomina.nomina",
    "app.models.novedades_nomina.planificador_dia_ot",
    "app.models.novedades_nomina.plantillas_horario",
    "app.models.panel_control.metrica",
    "app.models.reserva_salas.models",
    "app.models.solid.solid",
    "app.models.ticket.ticket",
    "app.models.viaticos.transito",
)


def cargar_modelos() -> None:
    for module in MODEL_MODULES:
        importlib.import_module(module)
