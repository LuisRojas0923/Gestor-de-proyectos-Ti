"""Pruebas de autorización indirecta, cache y minimización de PII."""
from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import Response

from app.api.auth import alcance_empleados_router
from app.api.biometria.biometria_router import (
    capacidades_admin, obtener_asistencias, obtener_estado_biometrico,
)
from app.models.auth.usuario import Usuario
from app.models.auth.relacion_gestor_empleado import RelacionGestorEmpleado
from app.models.novedades_nomina.horas_extras import NominaCalculoSemanal
from app.models.biometria.biometria_models import RegistroAsistencia
from app.services.biometria.biometria_service import BiometriaService
from app.services.novedades_nomina.horas_extras_confirmacion import listar_calculos
from app.services.auditoria.servicio import _enmascarar_datos
from app.services.auth.alcance_empleados_service import (
    autorizar_calculo_id, cedulas_permitidas,
)
from testing.backend.test_horarios_plantillas_service import _sesion_reversible


@pytest.mark.asyncio
async def test_idor_calculo_deniega_gestor_y_permite_admin_canonico(db_session):
    async with _sesion_reversible(db_session) as session:
        sufijo = uuid4().hex[:10]
        gestor = Usuario(
            id=f"GEST-{sufijo}", cedula=str(uuid4().int)[:25],
            hash_contrasena="hash", nombre="Gestor", rol="gestor",
        )
        session.add(gestor)
        calculo = NominaCalculoSemanal(
            cedula=str(uuid4().int)[:25], anio=2026, semana_iso=28,
            fecha_inicio=date(2026, 7, 6), fecha_fin=date(2026, 7, 12),
            nivel_riesgo_arl="III", factor_prestacional=0.5,
            salario_base_mensual=3_000_000, valor_hora_ordinaria=12_500,
        )
        session.add(calculo)
        await session.commit()

        with pytest.raises(LookupError, match="no encontrado"):
            await autorizar_calculo_id(session, gestor, calculo.id)

        session.add(RelacionGestorEmpleado(
            gestor_usuario_id=gestor.id,
            empleado_cedula=calculo.cedula,
            creado_por_id=gestor.id,
            actualizado_por_id=gestor.id,
        ))
        await session.commit()
        permitidas = await cedulas_permitidas(session, gestor)
        visibles = await listar_calculos(
            session, limit=20, offset=0, cedulas_permitidas=permitidas
        )
        assert [item.id for item in visibles] == [calculo.id]

        admin = SimpleNamespace(id=gestor.id, rol="admin")
        assert await autorizar_calculo_id(session, admin, calculo.id) == calculo.cedula


@pytest.mark.asyncio
async def test_geoface_filtra_alcance_en_sql_antes_de_contar_y_paginar(db_session):
    async with _sesion_reversible(db_session) as session:
        sufijo = uuid4().hex[:8]
        permitido = Usuario(
            id=f"BIO-P-{sufijo}", cedula="7" + str(uuid4().int)[:20],
            hash_contrasena="hash", nombre="Permitido", rol="usuario",
        )
        ajeno = Usuario(
            id=f"BIO-A-{sufijo}", cedula="8" + str(uuid4().int)[:20],
            hash_contrasena="hash", nombre="Ajeno", rol="usuario",
        )
        session.add_all([permitido, ajeno])
        await session.flush()
        session.add_all([
            RegistroAsistencia(
                usuario_id=permitido.id, match_exitoso=True,
                latitud_marcada=1.0, longitud_marcada=1.0,
            ),
            RegistroAsistencia(
                usuario_id=ajeno.id, match_exitoso=True,
                latitud_marcada=1.0, longitud_marcada=1.0,
            ),
        ])
        await session.commit()

        datos = await BiometriaService().obtener_asistencias_admin(
            session, SimpleNamespace(), {permitido.cedula}, 20, 0
        )

        assert datos["total"] == 1
        assert [item["usuario_id"] for item in datos["items"]] == [permitido.id]


def test_auditoria_redacta_cedulas_individuales_y_bulk():
    sanitizado = _enmascarar_datos({
        "cedula": "100",
        "cedulas": ["100", "200"],
        "cedulas_agregar": ["300"],
        "empleado": {"empleado_cedula": "400", "nombre": "Visible"},
    })
    assert sanitizado == {
        "cedula": "[REDACTED]",
        "cedulas": "[REDACTED]",
        "cedulas_agregar": "[REDACTED]",
        "empleado": {"empleado_cedula": "[REDACTED]", "nombre": "Visible"},
    }


@pytest.mark.asyncio
async def test_listado_gestores_envia_no_store(monkeypatch):
    monkeypatch.setattr(
        alcance_empleados_router,
        "listar_gestores_alcance",
        AsyncMock(return_value=([], 0)),
    )
    response = Response()
    await alcance_empleados_router.listar_gestores(
        response=response, q=None, limit=20, offset=0,
        db=SimpleNamespace(), _=SimpleNamespace(),
    )
    assert response.headers["Cache-Control"] == "no-store, private"


class _BiometriaFake:
    async def obtener_estado_biometrico(self, _db, _usuario):
        return {"enrolado": False}

    async def obtener_asistencias(self, _db, usuario, usuario_id):
        assert usuario.id == "USR-1"
        assert usuario_id == "TERCERO"
        return []


@pytest.mark.asyncio
async def test_biometria_propia_y_capacidades_envian_no_store(monkeypatch):
    usuario = SimpleNamespace(id="USR-1", rol="usuario")
    for llamada in ("estado", "asistencias"):
        response = Response()
        if llamada == "estado":
            await obtener_estado_biometrico(
                response, usuario, SimpleNamespace(), _BiometriaFake()
            )
        else:
            await obtener_asistencias(
                response, "TERCERO", usuario, SimpleNamespace(), _BiometriaFake()
            )
        assert response.headers["Cache-Control"] == "no-store, private"

    monkeypatch.setattr(
        "app.api.biometria.biometria_router.tiene_relaciones_activas",
        AsyncMock(return_value=False),
    )
    response = Response()
    await capacidades_admin(response, usuario, SimpleNamespace())
    assert response.headers["Cache-Control"] == "no-store, private"
