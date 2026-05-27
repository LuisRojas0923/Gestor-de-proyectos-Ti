"""
Servicio de correos electrónicos para el módulo Requisición de Personal (RP).
Reutiliza EmailService.enviar_correo() del sistema existente.
"""
import os
import logging
from typing import Optional

from app.services.notifications.email_service import EmailService
from app.config import config

logger = logging.getLogger(__name__)

# Buzón fijo de Gestión Humana (variable de entorno)
GH_EMAIL = os.getenv("GH_EMAIL", "gestion.humana@refridcol.com")
FRONTEND_URL = config.frontend_url.rstrip("/")


def _url_requisicion(requisicion_id: int) -> str:
    return f"{FRONTEND_URL}/service-portal/requisicion-personal/detalle/{requisicion_id}"


def _card_campo(label: str, valor: str) -> str:
    return f"""
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;">
        <span style="color:#718096;font-size:11px;text-transform:uppercase;letter-spacing:1px;">{label}</span><br>
        <span style="color:#2c3e50;font-size:14px;font-weight:600;">{valor or '—'}</span>
      </td>
    </tr>"""


def _tabla_detalle(req) -> str:
    salario = f"${req.salario_asignado:,.0f}" if req.salario_asignado else "—"
    return f"""
    <table width="100%" border="0" cellspacing="0" cellpadding="0"
           style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:24px;">
      <tbody>
        {_card_campo("Número RP", req.rp or "Pendiente")}
        {_card_campo("Área", req.area_nombre or "—")}
        {_card_campo("Cargo solicitado", req.cargo_nombre or "—")}
        {_card_campo("N° personas requeridas", str(req.numero_personas_requeridas))}
        {_card_campo("Ciudad", req.ciudad_nombre or "—")}
        {_card_campo("OT", req.ot or "—")}
        {_card_campo("Obra / Proyecto", req.nombre_obra_proyecto or "—")}
        {_card_campo("Fecha probable de ingreso", str(req.fecha_probable_ingreso) if req.fecha_probable_ingreso else "—")}
        {_card_campo("Causal", req.causal_requisicion or "—")}
        {_card_campo("Salario asignado", salario)}
        {_card_campo("Modalidad", req.modalidad_contratacion or "—")}
        {_card_campo("Tipo de contrato", req.tipo_contratacion or "—")}
      </tbody>
    </table>"""


def _boton(url: str, texto: str) -> str:
    return f"""
    <div style="text-align:center;margin:24px 0;">
      <a href="{url}"
         style="background-color:#002060;color:#fff;padding:14px 28px;text-decoration:none;
                border-radius:6px;font-weight:600;font-size:15px;display:inline-block;">
        {texto}
      </a>
    </div>"""


# ──────────────────────────────────────────────
# 1. Notificación al solicitante al radicar
# ──────────────────────────────────────────────
async def notificar_radicacion(req, nombre_solicitante: str):
    asunto = f"Requisición de Personal registrada [{req.rp}]"
    cuerpo = f"""
    <p style="color:#4a5568;font-size:16px;line-height:1.6;">
      Hola <strong>{nombre_solicitante}</strong>,<br><br>
      Su requisición de personal fue registrada correctamente con el número
      <strong style="color:#002060;font-size:18px;">{req.rp}</strong>
      y se encuentra <strong>pendiente de aprobación</strong>.
    </p>
    {_tabla_detalle(req)}
    {_boton(_url_requisicion(req.id), "Ver estado en el portal")}
    """
    html = EmailService._get_base_layout("Requisición Registrada", cuerpo)
    await EmailService.enviar_correo(asunto, [req.correo_solicitante], html,
                                     attachments=EmailService._get_attachments())


# ──────────────────────────────────────────────
# 2. Notificación al aprobador
# ──────────────────────────────────────────────
async def notificar_aprobador(req, perfil_requerido: Optional[str] = None):
    if not req.aprobador_email:
        logger.warning(f"[RP Email] {req.rp}: Sin aprobador configurado, correo omitido.")
        return
    asunto = f"Solicitud de aprobación de Requisición de Personal [{req.rp}]"
    cuerpo = f"""
    <p style="color:#4a5568;font-size:16px;line-height:1.6;">
      Estimado/a <strong>{req.aprobador_nombre}</strong>,<br><br>
      Tiene una nueva requisición de personal pendiente de su aprobación.
    </p>
    {_tabla_detalle(req)}
    {"" if not perfil_requerido else f'<p style="color:#4a5568;"><strong>Perfil requerido:</strong><br>{perfil_requerido}</p>'}
    {_boton(_url_requisicion(req.id), "Revisar y aprobar en el portal")}
    """
    html = EmailService._get_base_layout("Nueva Requisición para Aprobar", cuerpo)
    await EmailService.enviar_correo(asunto, [req.aprobador_email], html,
                                     attachments=EmailService._get_attachments())


# ──────────────────────────────────────────────
# 3. Notificación al solicitante: aprobada
# ──────────────────────────────────────────────
async def notificar_aprobada(req):
    asunto = f"Requisición de Personal aprobada [{req.rp}]"
    cuerpo = f"""
    <p style="color:#4a5568;font-size:16px;line-height:1.6;">
      Su requisición <strong style="color:#002060;">{req.rp}</strong> ha sido
      <strong style="color:#166534;">APROBADA</strong> y será gestionada por Gestión Humana.
    </p>
    {_boton(_url_requisicion(req.id), "Ver detalle en el portal")}
    """
    html = EmailService._get_base_layout("Requisición Aprobada ✅", cuerpo)
    await EmailService.enviar_correo(asunto, [req.correo_solicitante], html,
                                     attachments=EmailService._get_attachments())


# ──────────────────────────────────────────────
# 4. Notificación al solicitante: rechazada
# ──────────────────────────────────────────────
async def notificar_rechazada(req, observacion: str):
    asunto = f"Requisición de Personal rechazada [{req.rp}]"
    cuerpo = f"""
    <p style="color:#4a5568;font-size:16px;line-height:1.6;">
      Su requisición <strong style="color:#002060;">{req.rp}</strong> ha sido
      <strong style="color:#991b1b;">RECHAZADA</strong>.
    </p>
    <div style="background:#fee2e2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
      <strong>Motivo:</strong><br>{observacion}
    </div>
    {_boton(_url_requisicion(req.id), "Ver detalle en el portal")}
    """
    html = EmailService._get_base_layout("Requisición Rechazada ❌", cuerpo)
    await EmailService.enviar_correo(asunto, [req.correo_solicitante], html,
                                     attachments=EmailService._get_attachments())


# ──────────────────────────────────────────────
# 5. Notificación al solicitante: devuelta para ajuste
# ──────────────────────────────────────────────
async def notificar_devuelta(req, observacion: str):
    asunto = f"Requisición de Personal devuelta para ajuste [{req.rp}]"
    cuerpo = f"""
    <p style="color:#4a5568;font-size:16px;line-height:1.6;">
      Su requisición <strong style="color:#002060;">{req.rp}</strong> requiere
      ajustes antes de continuar.
    </p>
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0;">
      <strong>Observación del aprobador:</strong><br>{observacion}
    </div>
    {_boton(_url_requisicion(req.id), "Corregir y reenviar en el portal")}
    """
    html = EmailService._get_base_layout("Requisición Devuelta para Ajuste ⚠️", cuerpo)
    await EmailService.enviar_correo(asunto, [req.correo_solicitante], html,
                                     attachments=EmailService._get_attachments())


# ──────────────────────────────────────────────
# 6. Notificación a Gestión Humana: nueva aprobada
# ──────────────────────────────────────────────
async def notificar_gestion_humana(req):
    asunto = f"Nueva Requisición de Personal aprobada [{req.rp}]"
    cuerpo = f"""
    <p style="color:#4a5568;font-size:16px;line-height:1.6;">
      Se ha aprobado una nueva requisición de personal.<br>
      Por favor, iniciar la gestión correspondiente.
    </p>
    {_tabla_detalle(req)}
    {_boton(_url_requisicion(req.id), "Gestionar en el portal")}
    """
    html = EmailService._get_base_layout("Nueva Requisición Aprobada 🟢", cuerpo)
    await EmailService.enviar_correo(asunto, [GH_EMAIL], html,
                                     attachments=EmailService._get_attachments())


# ──────────────────────────────────────────────
# 7. Notificación a Gerencia Administrativa y Financiera
# ──────────────────────────────────────────────
async def notificar_gerencia(req, email_gerente: str, nombre_gerente: str):
    if not email_gerente:
        logger.warning(f"[RP Email] {req.rp}: Sin correo de Gerencia configurado, correo omitido.")
        return
    asunto = f"Solicitud de firma de Requisición de Personal [{req.rp}]"
    cuerpo = f"""
    <p style="color:#4a5568;font-size:16px;line-height:1.6;">
      Estimada <strong>{nombre_gerente}</strong>,<br><br>
      La requisición de personal <strong>{req.rp}</strong> ha sido aprobada por el Director de Área ({req.aprobador_nombre or '—'})
      y se encuentra pendiente de su firma y autorización gerencial.
    </p>
    {_tabla_detalle(req)}
    {_boton(_url_requisicion(req.id), "Revisar y firmar en el portal")}
    """
    html = EmailService._get_base_layout("Firma de Requisición Pendiente", cuerpo)
    await EmailService.enviar_correo(asunto, [email_gerente], html,
                                     attachments=EmailService._get_attachments())
